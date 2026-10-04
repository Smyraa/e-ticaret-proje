import "server-only";

import { isLocalAddress, type PaymentSetup } from "./payment-model";

// Ödeme ayarı ortam değişkenlerinden okunur (anahtarlar veritabanına ya da yönetim paneline yazılmaz):
//   PAYMENT_PROVIDER  boş = kartla ödeme yok | fake = yerel deneme ödeme sayfası | iyzico
// "fake" yalnız yerel adreste açılır (geliştirme sunucusu ya da SITE_URL localhost / 127.0.0.1): gerçek bir sitede
// yanlışlıkla açık kalırsa herkes sahte ödemeyle siparişi "ödendi" yapabilirdi, bu yüzden ayar hatalı sayılıp kapatılır.
export function paymentSetup(): PaymentSetup {
  const name = (process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase();
  if (!name) return { mode: "off" };

  if (name === "fake") {
    const site = (process.env.SITE_URL ?? "").trim();
    const local = process.env.NODE_ENV === "development" || (site !== "" && isLocalAddress(site));
    return local
      ? { mode: "fake" }
      : {
          mode: "invalid",
          name,
          problem: "Deneme ödeme sayfası yalnız yerel adreste açılabilir (SITE_URL localhost ya da 127.0.0.1 olmalı).",
        };
  }

  if (name === "iyzico") return { mode: "invalid", name, problem: "iyzico bağlantısı henüz kurulmadı." };
  return { mode: "invalid", name, problem: "Bilinmeyen ödeme sağlayıcısı." };
}
