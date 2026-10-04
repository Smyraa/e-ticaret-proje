import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { Order } from "./order-model";
import { PaymentError } from "./payment-error";
import { isLocalAddress, PAYMENT_TOKEN_PATTERN } from "./payment-model";
import type { VerifyResult } from "./payment-provider";

// iyzico "Ödeme Formu" (Checkout Form) bağdaştırıcısının SAF kısmı: istek imzası, istek gövdesi, yanıtların yorumlanması. Ağa ve
// ortama dokunmaz, bu yüzden birim testi edilir (payment-iyzico.ts bunları fetch ile birleştirir). Biçimler iyzico'nun resmî
// belgelerinden (docs.iyzico.com) okundu; gerçek sandbox anahtarıyla henüz DOĞRULANMADI.

export const IYZICO_SANDBOX_URL = "https://sandbox-api.iyzipay.com";
export const IYZICO_LIVE_URL = "https://api.iyzipay.com";

export const INITIALIZE_PATH = "/payment/iyzipos/checkoutform/initialize/auth/ecom";
export const DETAIL_PATH = "/payment/iyzipos/checkoutform/auth/ecom/detail";
export const CANCEL_PATH = "/payment/cancel";
export const REFUND_PATH = "/payment/refund";

// iyzico alıcı kimlik numarasını (TCKN) ZORUNLU alan olarak ister. Sitemiz bu bilgiyi toplamaz (gereksiz kişisel veri). Sabit bir
// değer gönderilir; canlıya geçerken iyzico'ya bunun kabul edilip edilmediği sorulacak (kabul edilmezse ödeme formuna isteğe
// bağlı bir kimlik alanı eklenir).
export const PLACEHOLDER_IDENTITY_NUMBER = "11111111111";

const COUNTRY = "Turkey";

export const hmacHex = (secretKey: string, text: string) => createHmac("sha256", secretKey).update(text).digest("hex");

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

const newRandomKey = () => `${Date.now()}${randomInt(100_000_000, 1_000_000_000)}`;

// IYZWSv2 kimlik doğrulaması: imza = HMAC-SHA256(gizli anahtar, randomKey + yol + gövde metni), onaltılık yazı. Yol başında "/"
// vardır, sorgu dizesi içermez; gövde, gönderilen metnin AYNISI olmalıdır.
export function authorizationHeaders(
  apiKey: string,
  secretKey: string,
  path: string,
  body: string,
  randomKey: string = newRandomKey(),
): Record<string, string> {
  const signature = hmacHex(secretKey, randomKey + path + body);
  const authorization = Buffer.from(`apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`).toString("base64");
  return { Authorization: `IYZWSv2 ${authorization}`, "x-iyzi-rnd": randomKey, "Content-Type": "application/json" };
}

// Tutar yazısı: tam lira "3100.0", kuruşlu "1535.5" (iyzico örnekleriyle aynı biçim).
export function amountText(amount: number): string {
  if (!Number.isFinite(amount)) throw new PaymentError("Geçersiz ödeme tutarı");
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}.0` : String(rounded);
}

// İmzaya giren fiyatlarda sondaki sıfırlar atılır (10.50 → 10.5, 10.00 → 10).
const signed = (value: unknown) => {
  const number = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? String(number) : String(value ?? "");
};

const text = (value: unknown): string => (typeof value === "string" ? value : typeof value === "number" ? String(value) : "");

// Başlatma yanıtının imzası: HMAC-SHA256(gizli anahtar, conversationId + ":" + token).
export const initializeSignature = (secretKey: string, conversationId: string, token: string) =>
  hmacHex(secretKey, `${conversationId}:${token}`);

export type DetailFields = {
  paymentStatus: unknown;
  paymentId: unknown;
  currency: unknown;
  basketId: unknown;
  conversationId: unknown;
  paidPrice: unknown;
  price: unknown;
  token: unknown;
};

// Sonuç sorgusu yanıtının imzası: bu sekiz alanın ":" ile birleşiminin HMAC-SHA256'sı.
export const detailSignature = (secretKey: string, d: DetailFields) =>
  hmacHex(
    secretKey,
    [text(d.paymentStatus), text(d.paymentId), text(d.currency), text(d.basketId), text(d.conversationId), signed(d.paidPrice), signed(d.price), text(d.token)].join(":"),
  );

// Kuruluşun hata iletisi günlüğe/ekrana girmeden önce temizlenir: denetim karakterleri atılır, uzunluk sınırlanır.
export const sanitizeReason = (value: unknown, max = 120) =>
  text(value).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

// "Ayşe Nur Yılmaz" → ad "Ayşe Nur", soyad "Yılmaz". Tek sözcükse soyad da aynı sözcük olur (iyzico ikisini de ister).
export function splitName(full: string): { name: string; surname: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { name: "-", surname: "-" };
  if (parts.length === 1) return { name: parts[0], surname: parts[0] };
  return { name: parts.slice(0, -1).join(" "), surname: parts[parts.length - 1] };
}

// Müşterinin bağlantı adresi geçerli bir IP değilse ("yerel" gibi) hiç gönderilmez.
export function cleanIp(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const value = raw.trim().replace(/^::ffff:/i, "");
  return isIP(value) ? value : undefined;
}

// Müşteri kuruluşun yanıtında verilen ödeme sayfası adresine yönlendirilir; adres kuruluşa ait olmalı (https ve iyzico alan adı).
// Yerel deneme sunucusu (testler) yalnız yerel temel adresle ve onunla aynı kökten kabul edilir.
export function isTrustedPageUrl(url: string, baseUrl: string): boolean {
  let page: URL;
  try {
    page = new URL(url);
  } catch {
    return false;
  }
  if (page.username || page.password) return false;
  const host = page.hostname.toLowerCase();
  const official =
    page.protocol === "https:" &&
    (host === "iyzipay.com" || host.endsWith(".iyzipay.com") || host === "iyzico.com" || host.endsWith(".iyzico.com"));
  if (official) return true;
  try {
    return isLocalAddress(baseUrl) && page.origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

type OrderForPayment = Pick<Order, "number" | "total" | "customer" | "address">;

// Ödeme oturumu açma isteğinin gövdesi. Sepet TEK kalem olarak gider ("Sipariş <no>"): iade tek çağrıyla yapılır ve kuruluşun
// panelinde ürün ayrıntısı (kişisel olmasa da gereksiz) görünmez. Taksit yok (tek çekim): çekilen tutar sipariş toplamıdır.
export function buildInitializeBody(
  order: OrderForPayment,
  input: { conversationId: string; callbackUrl: string; ip?: string },
) {
  const { name, surname } = splitName(order.customer.name);
  const price = amountText(order.total);
  const address = {
    contactName: order.customer.name,
    city: order.address.city,
    country: COUNTRY,
    address: order.address.line,
    zipCode: order.address.postalCode,
  };
  return {
    locale: "tr",
    conversationId: input.conversationId,
    price,
    paidPrice: price,
    currency: "TRY",
    basketId: order.number,
    paymentGroup: "PRODUCT",
    callbackUrl: input.callbackUrl,
    enabledInstallments: [1],
    buyer: {
      // Üyelik yok: alıcı kimliği e-postadan türetilen sabit bir özet (e-posta kuruluşa zaten ayrıca gider).
      id: `M-${createHash("sha256").update(order.customer.email).digest("hex").slice(0, 12)}`,
      name,
      surname,
      identityNumber: PLACEHOLDER_IDENTITY_NUMBER,
      email: order.customer.email,
      gsmNumber: `+${order.customer.phone}`,
      registrationAddress: order.address.line,
      city: order.address.city,
      country: COUNTRY,
      zipCode: order.address.postalCode,
      ...(input.ip ? { ip: input.ip } : {}),
    },
    shippingAddress: address,
    billingAddress: address,
    basketItems: [
      { id: order.number, name: `Sipariş ${order.number}`, category1: "Tesbih", itemType: "PHYSICAL", price },
    ],
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Ödeme oturumu açma yanıtı: oturum anahtarı ve müşterinin gönderileceği ödeme sayfası. Yanıt doğrulanamazsa PaymentError.
export function interpretInitialize(
  json: unknown,
  secretKey: string,
  baseUrl: string,
  conversationId: string,
): { token: string; pageUrl: string } {
  if (!isRecord(json)) throw new PaymentError("iyzico başlatma yanıtı okunamadı");
  if (json.status !== "success") {
    throw new PaymentError(`iyzico ödeme oturumu açmadı (${sanitizeReason(json.errorCode, 20)}: ${sanitizeReason(json.errorMessage)})`);
  }
  const token = text(json.token);
  if (!PAYMENT_TOKEN_PATTERN.test(token)) throw new PaymentError("iyzico geçersiz bir oturum anahtarı verdi");
  if (text(json.conversationId) !== conversationId) throw new PaymentError("iyzico başlatma yanıtı başka bir isteğe ait");
  if (!safeEqual(text(json.signature), initializeSignature(secretKey, conversationId, token))) {
    throw new PaymentError("iyzico başlatma yanıtının imzası doğrulanamadı");
  }
  const pageUrl = text(json.paymentPageUrl);
  if (!isTrustedPageUrl(pageUrl, baseUrl)) throw new PaymentError("iyzico ödeme sayfası adresi güvenilir değil");
  return { token, pageUrl };
}

// Sonuç sorgusu yanıtı → ödeme sonucu. Para yalnız şu koşulda "alındı" sayılır: yanıt başarılı, paymentStatus SUCCESS, imza
// doğru, yanıt bizim token ve conversationId'mize ait ve dolandırıcılık incelemesi (fraudStatus) beklemede ya da reddedilmiş değil.
export function interpretDetail(
  json: unknown,
  secretKey: string,
  expect: { token: string; conversationId: string },
): VerifyResult {
  if (!isRecord(json)) throw new PaymentError("iyzico sonuç yanıtı okunamadı");
  if (json.status !== "success") return { outcome: "pending" }; // ödeme henüz tamamlanmamış ya da sorgu reddedildi: para alındı sayılmaz

  const paymentStatus = text(json.paymentStatus).toUpperCase();
  if (paymentStatus === "FAILURE") {
    return { outcome: "failed", reason: sanitizeReason(json.errorMessage) || "Ödeme tamamlanamadı." };
  }
  if (paymentStatus !== "SUCCESS") return { outcome: "pending" }; // INIT_THREEDS, CALLBACK_THREEDS ve benzerleri

  if (text(json.token) !== expect.token || text(json.conversationId) !== expect.conversationId) {
    throw new PaymentError("iyzico sonuç yanıtı başka bir ödemeye ait");
  }
  if (!safeEqual(text(json.signature), detailSignature(secretKey, json as DetailFields))) {
    throw new PaymentError("iyzico sonuç yanıtının imzası doğrulanamadı");
  }

  const fraud = json.fraudStatus === undefined || json.fraudStatus === null ? 1 : Number(json.fraudStatus);
  if (fraud === 0) return { outcome: "pending" }; // güvenlik incelemesinde: onaylanana kadar para kesinleşmemiştir
  if (fraud === -1) return { outcome: "failed", reason: "Ödeme güvenlik incelemesinde reddedildi." };

  const paymentId = text(json.paymentId);
  const paidAmount = Number(json.paidPrice);
  if (!paymentId || !Number.isFinite(paidAmount)) throw new PaymentError("iyzico sonuç yanıtında ödeme bilgisi eksik");
  const items = (Array.isArray(json.itemTransactions) ? json.itemTransactions : [])
    .filter(isRecord)
    .map((item) => ({ id: text(item.paymentTransactionId), price: Number(item.paidPrice) }))
    .filter((item) => item.id !== "" && Number.isFinite(item.price));
  return {
    outcome: "paid",
    providerPaymentId: paymentId,
    paidAmount,
    orderNumber: text(json.basketId) || undefined,
    refundRef: JSON.stringify({ paymentId, items }),
  };
}

export type RefundReference = { paymentId: string; items: { id: string; price: number }[] };

// Ödeme kaydındaki iade bilgisini okur (bozuksa null).
export function parseRefundReference(raw: string | undefined): RefundReference | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.paymentId !== "string" || !Array.isArray(parsed.items)) return null;
    const items = parsed.items
      .filter(isRecord)
      .filter((item) => typeof item.id === "string" && typeof item.price === "number" && Number.isFinite(item.price))
      .map((item) => ({ id: item.id as string, price: item.price as number }));
    return { paymentId: parsed.paymentId, items };
  } catch {
    return null;
  }
}

// İptal / iade yanıtı: başarılıysa null, değilse yönetime gösterilecek kısa neden.
export function refundFailure(json: unknown): string | null {
  if (!isRecord(json)) return "iyzico yanıtı okunamadı";
  if (json.status === "success") return null;
  return `iyzico işlemi yapmadı (${sanitizeReason(json.errorCode, 20)}: ${sanitizeReason(json.errorMessage)})`;
}
