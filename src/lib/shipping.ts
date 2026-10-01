import { formatPrice } from "./format";

// Kargo ücreti tek yerde tutulur (TL). Şimdilik ücretsiz: kullanıcı kararı (ürünlerin pahalı olduğu
// varsayılıyor, kesin bilgi yok); gerçek koşullar belli olunca burada güncellenir.
export const SHIPPING_FEE: number = 0;

// Ödeme özetindeki kargo satırında görünen yazı.
export const shippingLabel: string = SHIPPING_FEE === 0 ? "Ücretsiz" : formatPrice(SHIPPING_FEE);

// Sepet özetinde görünen kargo notu.
export const shippingNote: string =
  SHIPPING_FEE === 0 ? "Kargo ücretsiz." : "Kargo ücreti ödeme adımında eklenir.";

// Sıkça sorulan sorular ve kargo ve iade sayfasında görünen kargo bilgisi.
export const shippingInfo: string =
  SHIPPING_FEE === 0
    ? "Şimdilik kargo ücretsizdir. Koşullar ileride değişebilir."
    : `Kargo ücreti ${formatPrice(SHIPPING_FEE)}; ödeme adımında eklenir.`;
