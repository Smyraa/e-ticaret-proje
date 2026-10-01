import type { Cart } from "./cart";
import type { Product } from "./products";

// Sepet satırı: ürün, sepette istenen adet ve stoka göre gerçekten alınabilecek adet (stok yoksa 0).
export type CartLine = { product: Product; requested: number; qty: number };

// Sepetteki kayıtları ürünlerle eşleştirir. Silinmiş ürünlere ait eski kayıtlar atlanır;
// stok sonradan düştüyse adet stokla sınırlanır. Sepet ve ödeme sayfaları aynı hesabı kullanır.
export function cartLines(cart: Cart, products: Product[]): CartLine[] {
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  return cart.items.flatMap((item) => {
    const product = bySlug.get(item.slug);
    if (!product) return [];
    return [{ product, requested: item.qty, qty: Math.min(item.qty, product.stock) }];
  });
}

// Alınabilecek adetlerin ara toplamı (tükenen satırlar 0 adet olduğundan toplama girmez).
export function linesSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
}
