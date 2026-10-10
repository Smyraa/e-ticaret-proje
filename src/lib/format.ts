export const formatPrice = (price: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(price);

// Tarih ve saat (yönetim sayfaları): sunucu hangi saat diliminde olursa olsun Türkiye saatiyle, örn. "4 Eki 2026 14:03".
export const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(
    date,
  );

export const stockText = (stock: number) =>
  stock > 0 ? `Stokta ${stock} adet` : "Tükendi";

// İndirim yüzdesi: eski fiyata göre, aşağı yuvarlanır (indirim olduğundan fazla gösterilmesin); en az %1.
export const discountPercent = (price: number, oldPrice: number) =>
  Math.max(1, Math.floor(((oldPrice - price) / oldPrice) * 100));
