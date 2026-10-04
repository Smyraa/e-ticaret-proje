import "server-only";

import type { Order } from "./order-model";
import type { PaymentRecord, ProviderName } from "./payment-model";

// Ödeme kuruluşlarının uyması gereken arayüz. Sipariş ve ödeme akışı (payments.ts) yalnız bunu bilir; kuruluşa özgü
// ayrıntılar (adresler, imzalar, alan adları) kendi dosyasında kalır. Yeni kuruluş eklemek = bu arayüzü uygulayan bir
// dosya yazıp payment-providers.ts'e eklemek.
//
// Güven ilkesi: müşterinin tarayıcısıyla gelen hiçbir şeye ödemenin sonucu olarak güvenilmez. Müşteri ödeme sonrası
// sitemize döner, ama ödemenin gerçekten olup olmadığını SUNUCU kuruluşa sorarak öğrenir (verify).

// Kuruluşla konuşurken bir sorun çıktığında fırlatılır (ağ hatası, beklenmeyen yanıt). İleti günlüğe yazılır;
// müşteriye ya da yönetime olduğu gibi gösterilmez.
export class PaymentError extends Error {}

export type StartInput = {
  order: Order;
  conversationId: string; // bizim ürettiğimiz kimlik; kuruluşa da gönderilir, günlüklerde eşleştirmeye yarar
  callbackUrl: string; // müşterinin ödeme sonrası döneceği adres (mutlak)
  ip: string; // müşterinin bağlantı adresi (bazı kuruluşlar ister)
};

export type StartResult = {
  token: string; // kuruluşun bu ödeme oturumu için verdiği anahtar
  redirectUrl: string; // müşterinin gönderileceği ödeme sayfası (mutlak adres ya da bu sitede / ile başlayan yol)
  expiresAt: Date;
};

export type VerifyResult =
  | { outcome: "paid"; providerPaymentId: string; paidAmount: number; orderNumber?: string; refundRef?: string }
  | { outcome: "failed"; reason: string }
  | { outcome: "pending" }; // müşteri ödemeyi henüz tamamlamadı

export type RefundResult = { ok: true } | { ok: false; error: string };

export interface PaymentProvider {
  name: ProviderName;
  // Gerçek para çeken ortam mı? (deneme ve sandbox değil). Gerçek ortamda örnek ürünlerden oluşan sipariş ödenemez.
  live: boolean;
  start(input: StartInput): Promise<StartResult>;
  verify(payment: PaymentRecord): Promise<VerifyResult>;
  // Ödemenin tamamını iade eder. Kuruluş reddederse { ok: false }, ulaşılamazsa PaymentError.
  refund(payment: PaymentRecord): Promise<RefundResult>;
}
