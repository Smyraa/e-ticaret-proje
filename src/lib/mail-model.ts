// E-posta kayıtlarının biçimi ve yönetimde gösterilen adlar. Sunucuda ve sayfalarda ortak kullanılır.

export type MailKind = "order-received" | "order-shipped" | "order-new" | "payment-alert";

// logged: e-posta hizmeti bağlı değil, e-posta GÖNDERİLMEDİ, yalnız kaydedildi. sent: taşıyıcıya teslim edildi.
export type MailStatus = "logged" | "sent" | "failed";

export const MAIL_KIND_LABELS: Record<MailKind, string> = {
  "order-received": "Sipariş alındı (müşteriye)",
  "order-shipped": "Kargoya verildi (müşteriye)",
  "order-new": "Yeni sipariş (size)",
  "payment-alert": "Ödeme uyarısı (size)",
};

export const MAIL_STATUS_LABELS: Record<MailStatus, string> = {
  logged: "Kaydedildi, gönderilmedi",
  sent: "Gönderildi",
  failed: "Gönderilemedi",
};

// E-posta hizmetinin durumu: log = kayıt modu (gönderilmiyor), live = gerçek taşıyıcı bağlı, invalid = ayar hatalı.
export type MailSetup = { mode: "log" | "live" | "invalid"; name: string };

// Yönetim ekranlarında gösterilen durum yazısı (bağlıysa boş: söylenecek bir şey yok).
export function describeMailSetup(setup: MailSetup): string {
  if (setup.mode === "log") {
    return "E-posta hizmeti henüz bağlı değil: e-postalar müşteriye ve size gönderilmiyor, yalnızca kaydediliyor.";
  }
  if (setup.mode === "invalid") {
    return `E-posta ayarı hatalı (MAIL_TRANSPORT=${setup.name}): e-postalar gönderilemiyor.`;
  }
  return "";
}

// Gönderilecek e-posta (düz metin). Başlık alanlarında (to, replyTo, subject) satır sonu olamaz.
export type MailMessage = {
  kind: MailKind;
  orderNumber: string;
  to: string;
  replyTo?: string; // yanıt verilirse gideceği adres
  subject: string;
  text: string;
};

// Veritabanındaki kayıt ("mails" koleksiyonu). İçerik (text) yalnız "logged" kayıtlarda tutulur: yönetimde önizlenir.
export type MailRecord = {
  kind: MailKind;
  orderNumber: string;
  to: string; // alıcı yoksa ("bildirim e-postası ayarlanmadı") boş
  replyTo?: string;
  subject: string;
  text?: string;
  status: MailStatus;
  error?: string;
  createdAt: Date;
  expireAt: Date; // kayıt bu tarihte kendiliğinden silinir (TTL)
};
