import type { OrderStatus } from "./order-model";

// Ödeme kayıtlarının biçimi ve ekranlarda gösterilen adlar. Sunucuda ve sayfalarda ortak kullanılır. Kayıtta kart bilgisi
// YOKTUR ve hiçbir zaman olmayacak: kart bilgisi yalnız ödeme kuruluşunun kendi sayfasına girilir, bize gelmez.

export type ProviderName = "fake" | "iyzico";

export const PROVIDER_LABELS: Record<ProviderName, string> = {
  fake: "Deneme ödeme sayfası",
  iyzico: "iyzico",
};

// started: ödeme sayfasına gidildi, sonuç bekleniyor. paid: para alındı. failed: ödeme olmadı (reddedildi, vazgeçildi).
// refunded: iade edildi. refund-failed: iade istendi ama kuruluş yapamadı (yeniden denenir).
export type PaymentStatus = "started" | "paid" | "failed" | "refunded" | "refund-failed";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  started: "Ödeme bekleniyor",
  paid: "Ödendi",
  failed: "Ödeme olmadı",
  refunded: "İade edildi",
  "refund-failed": "İade edilemedi",
};

// Para alınmış ama sipariş buna göre ilerleyemediyse yönetimin elle ilgilenmesi gerekir.
export type PaymentAttention = "amount-mismatch" | "duplicate" | "order-closed" | "not-applied";

export const PAYMENT_ATTENTION_LABELS: Record<PaymentAttention, string> = {
  "amount-mismatch":
    "Alınan tutar sipariş tutarıyla uyuşmuyor, bu yüzden siparişe işlenmedi. Ödemeyi ödeme kuruluşunun panelinde kontrol edip iade edin.",
  duplicate: "Bu siparişe ikinci bir ödeme alındı. Fazla alınan ödemeyi iade edin.",
  "order-closed": "Sipariş iptal edilmiş ya da silinmişken ödeme alındı. Ödemeyi iade edin.",
  "not-applied": "Ödeme alındı ama sipariş güncellenemedi. “Siparişe işle” düğmesiyle yeniden deneyin.",
};

export type PaymentRecord = {
  orderNumber: string;
  provider: ProviderName;
  token: string; // kuruluşun bu ödeme oturumu için verdiği anahtar; geri dönüşte hangi ödeme olduğunu bu söyler
  redirectUrl: string; // müşterinin gönderildiği ödeme sayfası
  conversationId: string; // bizim ürettiğimiz, günlüklerde eşleştirmek için kimlik
  amount: number; // TL (tam lira); sipariş toplamıyla aynı
  currency: "TRY";
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date; // ödeme oturumunun geçerlilik sonu
  checkedAt?: Date; // sonucun kuruluştan son sorulduğu an
  paidAt?: Date;
  providerPaymentId?: string; // kuruluşun ödeme kimliği (iade için)
  refundRef?: string; // iade için kuruluşa gereken, kart bilgisi içermeyen veri
  applied?: boolean; // ödeme siparişe işlendi mi (sipariş "ödendi" oldu mu)
  attention?: PaymentAttention;
  failure?: string; // ödeme olmadıysa kısa neden
  refundedAt?: Date;
  refundError?: string;
  refundLockUntil?: Date; // aynı ödemeyi iki kez iade etmemek için kısa süreli kilit
};

// Ödeme oturumları 30 dakika açık kalır (kuruluşların oturum süresiyle uyumlu).
export const PAYMENT_SESSION_MINUTES = 30;

// Kuruluşun verdiği anahtarın kabul edilen biçimi (geri dönüş adresine dışarıdan gelen değer veritabanına gitmeden elenir).
export const PAYMENT_TOKEN_PATTERN = /^[A-Za-z0-9._-]{16,200}$/;

export const isSessionOpen = (payment: Pick<PaymentRecord, "status" | "expiresAt">, now = new Date()) =>
  payment.status === "started" && payment.expiresAt > now;

// Kuruluşun bildirdiği tutar bizim kaydımızla (kuruşa kadar) aynı mı?
export const sameAmount = (a: number, b: number) => Math.abs(a - b) < 0.005;

// Adres yalnız bu bilgisayara mı çıkıyor? Deneme ödeme sayfası yalnız böyle bir adreste açılabilir: gerçek bir sitede
// yanlışlıkla açık kalırsa herkes sahte ödeme yapıp siparişi "ödendi" yapabilirdi.
export function isLocalAddress(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host.endsWith(".localhost") || host.endsWith(".test");
  } catch {
    return false;
  }
}

// Müşterinin sipariş sayfasındaki ödeme düğmelerinin sonucu (sunucu eylemleri ve istemci bileşeni ortak kullanır).
export type PayState = { error?: string; message?: string } | undefined;

// Ödeme ayarı (ortam değişkenlerinden): off = kartla ödeme yok (siparişler ödeme alınmadan kaydedilir, yönetim elle
// "ödendi" der), fake = yalnız yerelde çalışan deneme ödeme sayfası, iyzico = gerçek kuruluş, invalid = ayar hatalı.
export type PaymentSetup =
  | { mode: "off" }
  | { mode: "fake" }
  | { mode: "iyzico"; sandbox: boolean }
  | { mode: "invalid"; name: string; problem: string };

export const paymentsActive = (setup: PaymentSetup) => setup.mode === "fake" || setup.mode === "iyzico";

// Yönetim ekranlarında gösterilen durum yazısı (canlı kuruluş bağlıysa boş: söylenecek bir şey yok).
export function describePaymentSetup(setup: PaymentSetup): string {
  switch (setup.mode) {
    case "off":
      return "Kartla ödeme henüz bağlı değil: siparişler ödeme alınmadan kaydedilir, ödemeyi siz “Ödendi olarak işaretle” ile işlersiniz.";
    case "fake":
      return "Deneme ödeme sayfası açık: gerçek kart ve gerçek para yok. Bu ayar yalnız yerel adreste çalışır.";
    case "iyzico":
      return setup.sandbox ? "iyzico deneme (sandbox) ortamı bağlı: gerçek para çekilmez, test kartlarıyla denenir." : "";
    case "invalid":
      return `Ödeme ayarı hatalı (PAYMENT_PROVIDER=${setup.name}): ${setup.problem} Müşteriler şimdilik kartla ödeme yapamıyor.`;
  }
}

// Ödeme sayfasında müşteriye söylenenler (kuruluş bağlı değilse eski demo metni).
export function checkoutPaymentText(setup: PaymentSetup): { note: string; button: string } {
  switch (setup.mode) {
    case "fake":
      return {
        note: "Deneme ödemesi: siparişi onayladığınızda gerçek olmayan bir deneme ödeme sayfasına gidersiniz. Gerçek kart ve gerçek ödeme yoktur.",
        button: "Siparişi onayla ve öde",
      };
    case "iyzico":
      return {
        note: setup.sandbox
          ? "Deneme ortamı: siparişi onayladığınızda iyzico’nun deneme ödeme sayfasına gidersiniz. Gerçek para çekilmez; kart bilgisi bu sitede girilmez."
          : "Siparişi onayladığınızda iyzico’nun güvenli ödeme sayfasına yönlendirilirsiniz. Kart bilgileriniz bu sitede girilmez ve saklanmaz.",
        button: "Siparişi onayla ve öde",
      };
    case "invalid":
      return {
        note: "Kartla ödeme şu an alınamıyor. Siparişinizi kaydedebilirsiniz; ödeme için sizinle iletişime geçeceğiz.",
        button: "Siparişi tamamla",
      };
    default:
      return {
        note: "Ödeme adımı henüz hazır değil: siparişi tamamladığınızda siparişiniz kaydedilir, ödeme alınmaz. Canlıda ödeme kuruluşunun güvenli formu burada açılacak; kart bilgisi bu sitede hiç girilmez.",
        button: "Siparişi tamamla",
      };
  }
}

// Yönetimin ilgilenmesi gereken bir durum varsa açıklaması, yoksa null (iade edilmiş ya da hiç alınmamış ödemede sorun sayılmaz).
export function paymentConcern(
  payment: Pick<PaymentRecord, "status" | "applied" | "attention" | "refundError">,
): string | null {
  if (payment.status === "refund-failed") {
    return `İade yapılamadı${payment.refundError ? ` (${payment.refundError})` : ""}. “Ödemeyi iade et” ile yeniden deneyin.`;
  }
  if (payment.status !== "paid") return null;
  if (payment.attention) return PAYMENT_ATTENTION_LABELS[payment.attention];
  return payment.applied ? null : PAYMENT_ATTENTION_LABELS["not-applied"];
}

// Bir ödemenin iade edilebilmesi: para alınmış (ya da iade denenmiş ama olmamış) olmalı. Siparişin kendi ödemesi, sipariş
// ödenmiş/hazırlanıyor/kargoda iken buradan iade edilmez (önce sipariş iptal edilir; iptal ödemeyi de iade eder).
export function canRefund(payment: Pick<PaymentRecord, "status" | "applied">, orderStatus: OrderStatus | null): boolean {
  if (payment.status !== "paid" && payment.status !== "refund-failed") return false;
  if (!payment.applied) return true; // siparişe işlenmemiş (fazla, uyuşmayan ya da kapanmış siparişe gelen) ödeme
  return orderStatus === "cancelled" || orderStatus === "pending" || orderStatus === null;
}
