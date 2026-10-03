import { formatPrice } from "./format";

// Kargo ücreti site ayarlarından gelir (yönetim paneli → Site ayarları; tam lira, 0 = ücretsiz). Aşağıdaki işlevler
// ücreti parametre olarak alır: sepet, ödeme ve bilgi sayfaları ücreti ayarlardan okuyup verir.

// Ödeme özetindeki kargo satırında görünen yazı.
export const shippingLabel = (fee: number): string => (fee === 0 ? "Ücretsiz" : formatPrice(fee));

// Sepet özetinde görünen kargo notu.
export const shippingNote = (fee: number): string =>
  fee === 0 ? "Kargo ücretsiz." : "Kargo ücreti ödeme adımında eklenir.";

// Sıkça sorulan sorular ve kargo ve iade sayfasında görünen kargo bilgisi.
export const shippingInfo = (fee: number): string =>
  fee === 0
    ? "Şimdilik kargo ücretsizdir. Koşullar ileride değişebilir."
    : `Kargo ücreti ${formatPrice(fee)}; ödeme adımında eklenir.`;
