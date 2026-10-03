import { formatPhone } from "./phone";

// Sipariş kaydının biçimi ve müşteriye gösterilecek yardımcılar. Sunucuda ve sayfalarda ortak kullanılır.

export type OrderStatus = "pending" | "paid" | "preparing" | "shipped" | "delivered" | "cancelled";

// Durum adı veritabanında İngilizce tutulur, ekranda bu yazılarla görünür.
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Ödeme bekleniyor",
  paid: "Ödeme alındı",
  preparing: "Hazırlanıyor",
  shipped: "Kargoya verildi",
  delivered: "Teslim edildi",
  cancelled: "İptal edildi",
};

// Siparişteki ürün satırı: sipariş anındaki bilgilerin ANLIK KOPYASI. Ürün sonradan değişse ya da silinse de
// sipariş geçmişi bozulmaz (görsel dosyası da, sipariş ona başvurdukça diskten silinmez).
export type OrderItem = {
  slug: string;
  name: string;
  material: string;
  price: number; // TL, sipariş anındaki birim fiyat
  qty: number;
  image: string | null; // ana görselin dosya adı
  sample: boolean; // örnek (demo) ürün
};

export type OrderCustomer = { name: string; phone: string; email: string }; // phone: ülke koduyla yalnız rakamlar
export type OrderAddress = { line: string; city: string; district: string; postalCode: string };

export type Order = {
  number: string; // müşterinin gördüğü sipariş numarası: TA-7KQ2-X9DM
  trackKey: string; // sipariş sayfasının gizli anahtarı (adreste: /siparis/<anahtar>)
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number; // sipariş anındaki kargo ücreti
  total: number;
  gift: boolean;
  giftNote: string;
  note: string; // müşterinin sipariş notu
  customer: OrderCustomer;
  address: OrderAddress;
  test: boolean; // yalnız örnek ürünlerden oluşan sipariş (demo denemesi)
  stockDeducted: boolean; // stok, ödeme alınınca düşülür
  consentAt: Date; // ön bilgilendirme ve satış sözleşmesi onayı
  createdAt: Date;
  updatedAt: Date;
};

// Müşteriye gösterilirken kısmen gizlenir: sayfanın adresini bulan biri bilgilerin tamamını görmesin.
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "";
  return `${local.slice(0, 1)}***@${domain}`;
}

export function maskPhone(digits: string): string {
  if (/^90[1-9]\d{9}$/.test(digits)) return `+90 ${digits.slice(2, 5)} *** ** ${digits.slice(10, 12)}`;
  if (digits.length < 6) return formatPhone(digits);
  return `+${digits.slice(0, 2)}${"*".repeat(digits.length - 4)}${digits.slice(-2)}`;
}
