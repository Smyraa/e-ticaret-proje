import "server-only";

import { deleteMailsForOrders } from "./mail";
import { getDb } from "./mongodb";
import { releaseOrderStock } from "./order-flow";
import type { Order, OrderStatus } from "./order-model";
import { unusedImages } from "./products-admin";

// Yönetim tarafı: siparişleri listeleme, okuma, not yazma ve test siparişlerini temizleme. Bu dosyadaki her işlev yalnız
// requireAdmin() geçmiş yerlerden çağrılmalı (siparişlerde müşterinin kişisel bilgileri var). Durum geçişleri ve stok
// işlemleri order-flow.ts'te.

const ordersOf = async () => (await getDb()).collection<Order>("orders");

export type OrderListItem = {
  number: string;
  status: OrderStatus;
  total: number;
  createdAt: Date;
  test: boolean;
  customerName: string;
  lineCount: number; // farklı ürün sayısı
  unitCount: number; // toplam adet
};

// Listede yalnız gereken alanlar okunur (adres, telefon gibi bilgiler listeye gelmez).
export async function listOrders(options: {
  statuses?: OrderStatus[];
  page: number;
  pageSize: number;
}): Promise<{ orders: OrderListItem[]; total: number }> {
  const orders = await ordersOf();
  const filter = options.statuses ? { status: { $in: options.statuses } } : {};
  const [total, docs] = await Promise.all([
    orders.countDocuments(filter),
    orders
      .find(filter, { projection: { number: 1, status: 1, total: 1, createdAt: 1, test: 1, "customer.name": 1, items: 1 } })
      .sort({ createdAt: -1, _id: -1 })
      .skip((options.page - 1) * options.pageSize)
      .limit(options.pageSize)
      .toArray(),
  ]);

  return {
    total,
    orders: docs.map((doc) => ({
      number: doc.number,
      status: doc.status,
      total: doc.total,
      createdAt: doc.createdAt,
      test: doc.test === true,
      customerName: doc.customer?.name ?? "",
      lineCount: doc.items?.length ?? 0,
      unitCount: (doc.items ?? []).reduce((sum, item) => sum + item.qty, 0),
    })),
  };
}

// Durum başına sipariş sayısı (hiç olmayan durumlar 0).
export async function countByStatus(): Promise<Record<OrderStatus, number>> {
  const counts: Record<OrderStatus, number> = { pending: 0, paid: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0 };
  const orders = await ordersOf();
  const groups = await orders.aggregate<{ _id: OrderStatus; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray();
  for (const group of groups) if (group._id in counts) counts[group._id] = group.n;
  return counts;
}

export async function getOrderForAdmin(number: string): Promise<Order | null> {
  const orders = await ordersOf();
  return orders.findOne({ number }, { projection: { _id: 0 } });
}

// Yönetici notunu yazar (boş not notu siler). Sipariş yoksa false.
export async function saveAdminNote(number: string, note: string): Promise<boolean> {
  const orders = await ordersOf();
  const result = note
    ? await orders.updateOne({ number }, { $set: { adminNote: note, updatedAt: new Date() } })
    : await orders.updateOne({ number }, { $unset: { adminNote: "" }, $set: { updatedAt: new Date() } });
  return result.matchedCount === 1;
}

export async function countTestOrders(): Promise<number> {
  const orders = await ordersOf();
  return orders.countDocuments({ test: true });
}

// Test (yalnız örnek ürünlerden oluşan) siparişlerin TÜMÜNÜ siler; gerçek siparişlere dokunmaz. Stoğu düşülmüş olanların
// stoğu önce iade edilir. unusedImages: artık hiçbir ürün ya da siparişte kullanılmayan, diskten de silinecek görseller.
export async function deleteTestOrders(): Promise<{ count: number; unusedImages: string[] }> {
  const orders = await ordersOf();
  const tests = await orders.find({ test: true }, { projection: { _id: 0 } }).toArray();
  if (tests.length === 0) return { count: 0, unusedImages: [] };

  for (const order of tests) if (order.stockDeducted) await releaseOrderStock(order);
  const numbers = tests.map((order) => order.number);
  const result = await orders.deleteMany({ test: true, number: { $in: numbers } });
  await deleteMailsForOrders(numbers); // e-posta kayıtlarında da müşterinin bilgileri var

  const names = [...new Set(tests.flatMap((order) => order.items.map((item) => item.image).filter((name): name is string => Boolean(name))))];
  return { count: result.deletedCount, unusedImages: await unusedImages(names) };
}
