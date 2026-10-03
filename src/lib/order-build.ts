import type { RequestedLine } from "./order-form";
import type { OrderItem } from "./order-model";
import type { Product } from "./products";

export type BuildResult = { ok: true; items: OrderItem[]; subtotal: number } | { ok: false; problems: string[] };

// İstenen satırlardan sipariş satırlarını kurar. `products` veritabanından yeni okunmuş, YAYINDAKİ ürünler olmalı:
// ad, fiyat, görsel ve stok buradan alınır, tarayıcıdan gelen hiçbir değere güvenilmez. Her satır o anki bilgilerin
// anlık kopyasıdır. Müşteriye gösterilecek sorunlar (tükenen ürün, yetersiz stok) Türkçe iletilerle döner.
export function buildOrderItems(products: Product[], requested: RequestedLine[]): BuildResult {
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const items: OrderItem[] = [];
  const problems: string[] = [];
  let missing = false;

  for (const { slug, qty } of requested) {
    const product = bySlug.get(slug);
    if (!product) {
      missing = true; // silinmiş, taslağa alınmış ya da hiç var olmayan ürün
      continue;
    }
    if (!Number.isInteger(product.price) || product.price < 1) {
      problems.push(`${product.name} şu an satın alınamıyor.`);
    } else if (product.stock < 1) {
      problems.push(`${product.name} tükendi.`);
    } else if (qty > product.stock) {
      problems.push(`${product.name} için stokta en çok ${product.stock} adet var.`);
    } else {
      items.push({
        slug: product.slug,
        name: product.name,
        material: product.material,
        price: product.price,
        qty,
        image: product.images[0] ?? null,
        sample: product.sample,
      });
    }
  }
  if (missing) problems.push("Sepetinizdeki bir ürün artık satışta değil.");
  if (problems.length > 0) return { ok: false, problems };

  return { ok: true, items, subtotal: items.reduce((sum, item) => sum + item.price * item.qty, 0) };
}
