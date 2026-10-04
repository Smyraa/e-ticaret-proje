import "server-only";

import { IYZICO_LIVE_URL, IYZICO_SANDBOX_URL } from "./payment-iyzico-core";
import { isLocalAddress, type PaymentSetup } from "./payment-model";

// Ödeme ayarı ortam değişkenlerinden okunur (anahtarlar veritabanına ya da yönetim paneline yazılmaz):
//   PAYMENT_PROVIDER   boş = kartla ödeme yok | fake = yerel deneme ödeme sayfası | iyzico
//   IYZICO_API_KEY, IYZICO_SECRET_KEY   iyzico anahtarları (sandbox anahtarları "sandbox-" ile başlar)
//   IYZICO_BASE_URL    isteğe bağlı: boşsa anahtara göre sandbox ya da canlı adres seçilir
// "fake" yalnız yerel adreste açılır (geliştirme sunucusu ya da SITE_URL localhost / 127.0.0.1): gerçek bir sitede
// yanlışlıkla açık kalırsa herkes sahte ödemeyle siparişi "ödendi" yapabilirdi, bu yüzden ayar hatalı sayılıp kapatılır.

// Site yalnız bu bilgisayara mı çıkıyor? (geliştirme sunucusu ya da SITE_URL yerel bir adres)
function localSite(): boolean {
  const site = (process.env.SITE_URL ?? "").trim();
  return process.env.NODE_ENV === "development" || (site !== "" && isLocalAddress(site));
}

export type IyzicoEnv = { apiKey: string; secretKey: string; baseUrl: string; sandbox: boolean };

// iyzico ayarlarını okur ve tutarlılığını denetler. Sandbox anahtarı canlı adresle (ya da tersi) kullanılamaz; kuruluş adresi
// yalnız iyzico'nun iki adresinden biri olabilir (yerel sitede, testler için yerel bir sahte sunucu da olabilir); canlıda
// SITE_URL https olmalı (iyzico geri dönüş adresinde geçerli SSL sertifikası ister).
export function readIyzicoEnv(): { ok: true; env: IyzicoEnv } | { ok: false; problem: string } {
  const apiKey = (process.env.IYZICO_API_KEY ?? "").trim();
  const secretKey = (process.env.IYZICO_SECRET_KEY ?? "").trim();
  if (!apiKey || !secretKey) return { ok: false, problem: "IYZICO_API_KEY ve IYZICO_SECRET_KEY tanımlı olmalı." };

  const given = (process.env.IYZICO_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const official = given === IYZICO_SANDBOX_URL || given === IYZICO_LIVE_URL;
  if (given && !official && !(localSite() && isLocalAddress(given))) {
    return { ok: false, problem: "IYZICO_BASE_URL yalnız iyzico'nun sandbox ya da canlı adresi olabilir." };
  }

  const baseUrl = given || (apiKey.startsWith("sandbox-") ? IYZICO_SANDBOX_URL : IYZICO_LIVE_URL);
  if (baseUrl === IYZICO_LIVE_URL && apiKey.startsWith("sandbox-")) {
    return { ok: false, problem: "Sandbox anahtarı canlı iyzico adresiyle kullanılamaz." };
  }
  if (baseUrl === IYZICO_SANDBOX_URL && !apiKey.startsWith("sandbox-")) {
    return { ok: false, problem: "Canlı anahtar iyzico sandbox adresiyle kullanılamaz." };
  }
  if (baseUrl === IYZICO_LIVE_URL && !/^https:\/\//i.test((process.env.SITE_URL ?? "").trim())) {
    return { ok: false, problem: "Canlı ödeme için SITE_URL https ile başlamalı." };
  }
  return { ok: true, env: { apiKey, secretKey, baseUrl, sandbox: baseUrl !== IYZICO_LIVE_URL } };
}

export function paymentSetup(): PaymentSetup {
  const name = (process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();
  if (!name) return { mode: "off" };

  if (name === "fake") {
    return localSite()
      ? { mode: "fake" }
      : {
          mode: "invalid",
          name,
          problem: "Deneme ödeme sayfası yalnız yerel adreste açılabilir (SITE_URL localhost ya da 127.0.0.1 olmalı).",
        };
  }

  if (name === "iyzico") {
    const result = readIyzicoEnv();
    return result.ok ? { mode: "iyzico", sandbox: result.env.sandbox } : { mode: "invalid", name, problem: result.problem };
  }
  return { mode: "invalid", name, problem: "Bilinmeyen ödeme sağlayıcısı." };
}
