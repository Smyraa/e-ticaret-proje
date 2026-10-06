import "server-only";

import { getDb } from "./mongodb";

// Stok hareket geçmişi (koleksiyon "stockMoves"). Her stok değişimi bir kayıt bırakır: hangi ürün, ne kadar (delta),
// değişimden sonraki stok, işlem türü, zaman ve yapan (yönetici e-postası ya da sipariş numarası). Kayıt yazılamasa
// bile stok değişimi geri alınmaz (stok asıl veridir; geçmiş, açıklama içindir): hata günlüğe yazılır.

export type StockMoveKind =
  | "manual-add" // yönetici stok ekledi
  | "manual-remove" // yönetici stok çıkardı
  | "order-reserve" // ödeme başlarken siparişe ayrıldı
  | "order-release" // ayrılan stok geri kondu (ödeme olmadı ya da süre doldu)
  | "order-deduct" // sipariş için düşüldü (elle "ödendi" ya da sonradan düşme)
  | "order-return"; // siparişin düşülmüş stoğu iade edildi (iptal, ödeme işaretinin geri alınması)

export const STOCK_MOVE_LABELS: Record<StockMoveKind, string> = {
  "manual-add": "Stok eklendi",
  "manual-remove": "Stok çıkarıldı",
  "order-reserve": "Ödeme için ayrıldı",
  "order-release": "Ayrılan stok geri kondu",
  "order-deduct": "Sipariş için düşüldü",
  "order-return": "Sipariş iptali/iadesi",
};

export type StockMove = {
  slug: string;
  name: string; // o anki ürün adı (ürün sonradan silinse de geçmiş okunur)
  delta: number; // + ekleme, − çıkarma
  after: number | null; // değişimden sonraki stok (ürün silinmişse null)
  kind: StockMoveKind;
  orderNumber?: string;
  admin?: string; // işlemi yapan yöneticinin e-postası
  reason?: string; // elle değişimde yazılan açıklama
  at: Date;
};

export type StockMoveView = StockMove & { id: string };

const movesOf = async () => (await getDb()).collection<StockMove>("stockMoves");

let indexesReady: Promise<void> | undefined;
function ensureIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    const moves = await movesOf();
    await Promise.all([moves.createIndex({ at: -1 }), moves.createIndex({ slug: 1, at: -1 })]);
  })().catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  return indexesReady;
}

export async function recordStockMoves(moves: Omit<StockMove, "at">[]): Promise<void> {
  if (moves.length === 0) return;
  try {
    await ensureIndexes();
    const at = new Date();
    await (await movesOf()).insertMany(moves.map((move) => ({ ...move, at })));
  } catch (error) {
    console.error("Stok hareketi kaydedilemedi", error);
  }
}

// Son hareketler, yeniden eskiye (isteğe bağlı olarak tek ürünün).
export async function listStockMoves(options: { slug?: string; limit?: number } = {}): Promise<StockMoveView[]> {
  await ensureIndexes();
  const docs = await (await movesOf())
    .find(options.slug ? { slug: options.slug } : {})
    .sort({ at: -1, _id: -1 })
    .limit(Math.min(options.limit ?? 50, 200))
    .toArray();
  return docs.map(({ _id, ...rest }) => ({ id: String(_id), ...rest }));
}
