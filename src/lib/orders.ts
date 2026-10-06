import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { getDb } from "./mongodb";
import { newOrderNumber, newTrackKey, TRACK_KEY_PATTERN } from "./order-ids";
import type { Order } from "./order-model";

// Siparişlerin veritabanı işlemleri (koleksiyon "orders"). Kayıtta kişisel bilgi (ad, telefon, e-posta, adres) var:
// yalnızca sipariş sayfasının gizli anahtarını bilen kişiye (getOrderByKey) ya da yönetime gösterilir.

const ordersOf = async () => (await getDb()).collection<Order>("orders");

// Numara ve gizli anahtar benzersiz olmalı; yönetim listesi tarihe ve duruma göre sıralanır.
let indexesReady: Promise<void> | undefined;
function ensureOrderIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    const orders = await ordersOf();
    await Promise.all([
      orders.createIndex({ number: 1 }, { unique: true }),
      orders.createIndex({ trackKey: 1 }, { unique: true }),
      orders.createIndex({ createdAt: -1 }),
      orders.createIndex({ status: 1, createdAt: -1 }),
      orders.createIndex({ customerId: 1, createdAt: -1 }),
    ]);
  })().catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  return indexesReady;
}

// Siparişe girecek bilgiler; numara, anahtar, durum ve tarihler kayıt sırasında eklenir.
export type NewOrder = Omit<
  Order,
  "number" | "trackKey" | "status" | "stockDeducted" | "createdAt" | "updatedAt" | "shipment" | "adminNote" | "history"
>;

const MAX_TRIES = 5;

// Yeni sipariş "ödeme bekleniyor" durumunda açılır. Stok burada DÜŞÜLMEZ: ödeme alınınca düşülür (kullanıcı kararı).
export async function createOrder(data: NewOrder): Promise<{ number: string; trackKey: string }> {
  await ensureOrderIndexes();
  const orders = await ordersOf();
  const now = new Date();

  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    const order: Order = {
      ...data,
      number: newOrderNumber(),
      trackKey: newTrackKey(),
      status: "pending",
      stockDeducted: false,
      createdAt: now,
      updatedAt: now,
      history: [{ status: "pending", at: now }],
    };
    try {
      await orders.insertOne({ ...order });
      return { number: order.number, trackKey: order.trackKey };
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error; // numara ya da anahtar çakıştı: yenisini dene
    }
  }
  throw new Error("Benzersiz sipariş numarası üretilemedi");
}

// Sipariş sayfasının gizli anahtarıyla siparişi bulur. Biçimi tutmayan anahtar için veritabanına gidilmez.
export async function getOrderByKey(key: string): Promise<Order | null> {
  if (!TRACK_KEY_PATTERN.test(key)) return null;
  const orders = await ordersOf();
  return orders.findOne({ trackKey: key }, { projection: { _id: 0 } });
}

// Sunucu içi işler için (e-posta bildirimleri): numarayla siparişin tamamı. Müşteriye ya da bir sayfaya doğrudan verilmez.
export async function getOrderByNumber(number: string): Promise<Order | null> {
  const orders = await ordersOf();
  return orders.findOne({ number }, { projection: { _id: 0 } });
}

export type CustomerOrderSummary = Pick<Order, "number" | "trackKey" | "status" | "total" | "createdAt"> & {
  itemCount: number;
};

// Müşterinin hesabındayken verdiği siparişler, yeniden eskiye (hesap sayfası için; en çok 50).
export async function listOrdersForCustomer(customerId: string): Promise<CustomerOrderSummary[]> {
  await ensureOrderIndexes();
  const orders = await ordersOf();
  const docs = await orders
    .find(
      { customerId },
      { projection: { _id: 0, number: 1, trackKey: 1, status: 1, total: 1, createdAt: 1, "items.qty": 1 } },
    )
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return docs.map(({ items, ...rest }) => ({ ...rest, itemCount: items.reduce((sum, item) => sum + item.qty, 0) }));
}

// Az önce açılmış ama ödemesi hiç başlatılamamış siparişi siler (ödeme başlarken stok yetmedi). Yalnız "ödeme bekleniyor"
// ve stoğu ayrılmamış sipariş silinir; ödeme kaydı yoktur.
export async function deleteUnstartedOrder(number: string): Promise<void> {
  const orders = await ordersOf();
  await orders.deleteOne({ number, status: "pending", stockDeducted: false });
}

const digest = (text: string) => createHash("sha256").update(text).digest();

// Sipariş sorgulama: numara ve e-posta (küçük harfle) birlikte doğruysa siparişin gizli anahtarını verir, değilse null.
// "Numara yok" ile "e-posta yanlış" aynı sonucu verir ve karşılaştırma her ikisinde de aynı biçimde yapılır; böylece
// ne sonuçtan ne de süreden hangisinin yanlış olduğu anlaşılır.
export async function findTrackKey(number: string, email: string): Promise<string | null> {
  const orders = await ordersOf();
  const order = await orders.findOne({ number }, { projection: { _id: 0, trackKey: 1, "customer.email": 1 } });
  const same = timingSafeEqual(digest(order?.customer.email ?? ""), digest(email));
  return order && same ? order.trackKey : null;
}
