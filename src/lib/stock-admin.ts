import "server-only";

import { normalizeBarcode } from "./barcode";
import { getDb } from "./mongodb";
import type { Order } from "./order-model";
import { getAllProducts } from "./products-admin";
import type { Product } from "./products";
import { recordStockMoves } from "./stock-moves";
import { fold } from "./text";

// Stok Takibi sayfasının işlevleri. Yalnız requireAdmin() geçmiş yerlerden çağrılmalı.

export const STOCK_ADJUST_MAX = 10_000; // tek işlemde en çok bu kadar eklenip çıkarılabilir
export const STOCK_REASON_MAX = 120;

// Barkod tam eşleşirse yalnız o ürün; değilse ad, malzeme ya da barkod içinde geçenler (Türkçe harf farkı gözetmeden).
export async function searchStock(query: string): Promise<{ products: Product[]; exactBarcode: boolean }> {
  const products = await getAllProducts();
  const code = normalizeBarcode(query);
  const exact = products.filter((product) => product.barcode && product.barcode === code);
  if (exact.length > 0) return { products: exact, exactBarcode: true };
  const needle = fold(query.trim());
  if (!needle) return { products: [], exactBarcode: false };
  return {
    products: products.filter((product) =>
      [product.name, product.material, product.barcode].some((text) => fold(text).includes(needle)),
    ),
    exactBarcode: false,
  };
}

export async function lowStockProducts(threshold: number): Promise<Product[]> {
  return (await getAllProducts()).filter((product) => product.stock <= threshold).sort((a, b) => a.stock - b.stock);
}

// Kartla ödeme için şu an ayrılmış adetler (ürün → adet): süresi dolmamış ayırmalar.
export async function reservedQuantities(): Promise<Map<string, number>> {
  const orders = (await getDb()).collection<Order>("orders");
  const reserved = await orders
    .find(
      { status: "pending", stockDeducted: true, reservedUntil: { $gt: new Date() } },
      { projection: { _id: 0, items: 1 } },
    )
    .toArray();
  const totals = new Map<string, number>();
  for (const order of reserved) {
    for (const item of order.items) totals.set(item.slug, (totals.get(item.slug) ?? 0) + item.qty);
  }
  return totals;
}

export type AdjustResult = { ok: true; stock: number } | { ok: false; error: string };

// Stoğa ekler (delta > 0) ya da çıkarır (delta < 0). Çıkarma, stok yetiyorsa tek adımda yapılır (eksiye düşmez; aynı
// anda gelen bir siparişle yarışta da). Her değişim yöneticinin adıyla stok geçmişine yazılır.
export async function adjustStock(slug: string, delta: number, admin: string, reason: string): Promise<AdjustResult> {
  const products = (await getDb()).collection<{ slug: string; name: string; stock: number }>("products");
  const updated = await products.findOneAndUpdate(
    delta < 0 ? { slug, stock: { $gte: -delta } } : { slug },
    { $inc: { stock: delta }, $set: { updatedAt: new Date() } },
    { returnDocument: "after", projection: { name: 1, stock: 1 } },
  );
  if (!updated) {
    const current = await products.findOne({ slug }, { projection: { stock: 1 } });
    return current
      ? { ok: false, error: `Stokta ${current.stock} adet var; ${-delta} adet çıkarılamaz.` }
      : { ok: false, error: "Ürün bulunamadı; silinmiş olabilir." };
  }
  await recordStockMoves([
    {
      slug,
      name: updated.name,
      delta,
      after: updated.stock,
      kind: delta > 0 ? "manual-add" : "manual-remove",
      admin,
      ...(reason ? { reason } : {}),
    },
  ]);
  return { ok: true, stock: updated.stock };
}
