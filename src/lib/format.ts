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
