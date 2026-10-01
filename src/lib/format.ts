export const formatPrice = (price: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(price);

export const stockText = (stock: number) =>
  stock > 0 ? `Stokta ${stock} adet` : "Tükendi";
