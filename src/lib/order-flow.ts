import "server-only";

import { getDb } from "./mongodb";
import { ORDER_STATUS_LABELS, type Order, type OrderItem, type OrderShipment, type OrderStatus } from "./order-model";
import { availableCommands, targetStatus, type OrderCommand } from "./order-status";
import { recordStockMoves, type StockMoveKind } from "./stock-moves";

// Siparişin durumunu değiştiren ve stoğu düşüp iade eden işlemler. Çağıranın yetkisi kendi işidir: yönetim eylemleri
// requireAdmin() geçtikten sonra, ödeme (applyPayment) ise sonucu kuruluşa sorularak doğrulandıktan sonra çağırır.
//
// Stok kuralı (kullanıcı kararı): stok sipariş verilince değil ÖDEME ALININCA düşer; iptalde ya da ödeme geri alınınca
// iade edilir. MongoDB'de çok belgeli işlem (transaction) kullanmıyoruz; bunun yerine adımların sırası, bir çökme ya da
// yarış olsa bile stoğun FAZLA değil EKSİK kalacağı (fazla satış olmayacağı) ve tutarsızlığın yönetim sayfasında
// görünüp onarılabileceği şekilde seçildi:
//   - Düşme: önce durum "ödendi" olur, sonra stok koşullu düşer, en son siparişteki stockDeducted bayrağı true olur.
//     Çökerse bayrak false kalır (sayfada uyarı + "stoğu düş" düğmesi çıkar).
//   - İade: önce bayrak false olur, sonra stok iade edilir. İki kez iade edilemez; çökerse stok eksik kalır.
// Durum geçişleri "durum hâlâ beklediğimiz gibiyse" koşuluyla yapılır: aynı anda gelen iki istekten biri kazanır.
//
// Kartla ödemede stok ödeme BAŞLARKEN ayrılır (reserveOrderStock): müşteri ödeme sayfasına gitmeden stok tek adımda düşer,
// sipariş `reservedUntil` alır. Stok yetmezse ödeme sayfası açılmaz. Ödeme olmazsa ayrılan stok hemen (releaseReservation),
// ödeme sayfası terk edilirse süre dolunca (sweepExpiredReservations) geri konur. Ödeme alınınca ayrılan stok zaten
// düşülmüş olduğundan ikinci kez düşülmez (stockDeducted). Süre dolup stok geri konduktan sonra gelen ödemede stok yeniden
// düşülmeye çalışılır; yetmezse mevcut "ödendi ama stok yok" uyarısı ve iade yolu devreye girer.
//
// Her stok değişimi stok hareket geçmişine yazılır (stock-moves.ts).

export const RESERVATION_MINUTES = 20; // kullanıcı kararı (2026-10-07)

// notify: işlemin ardından müşteriye e-posta gitmesi gerekiyorsa hangisi (yalnız durum gerçekten değiştiğinde).
export type FlowResult =
  | { ok: true; message: string; notify?: "shipped" }
  | { ok: false; error: string; problems?: string[] };

const MISSING = "Sipariş bulunamadı.";
const NOT_ALLOWED = "Bu işlem siparişin şu anki durumunda yapılamaz. Sayfayı yenileyip yeniden deneyin.";
const CHANGED = "Siparişin durumu bu arada değişmiş. Sayfayı yenileyip yeniden deneyin.";

const ordersOf = async () => (await getDb()).collection<Order>("orders");
const productsOf = async () => (await getDb()).collection<{ slug: string; stock: number; name: string }>("products");

// Durumu `from` listesindeki bir durumdan `to`'ya geçirir (durum hâlâ oradaysa) ve geçmişe yazar. Yeni kaydı döndürür;
// durum bu arada değiştiyse ya da sipariş yoksa null.
async function setStatus(number: string, from: OrderStatus[], to: OrderStatus, extra: Partial<Order> = {}) {
  const orders = await ordersOf();
  const now = new Date();
  return orders.findOneAndUpdate(
    { number, status: { $in: from } },
    { $set: { ...extra, status: to, updatedAt: now }, $push: { history: { status: to, at: now } } },
    { returnDocument: "after", projection: { _id: 0 } },
  );
}

// Her ürünün stoğundan sipariş adedini düşer; yeterli stok yoksa HİÇBİR şey değişmez. Dönüş: sorunlar (boşsa tamam).
async function deductStock(items: OrderItem[], kind: StockMoveKind, orderNumber: string): Promise<string[]> {
  const products = await productsOf();
  const done: { item: OrderItem; after: number }[] = [];
  const problems: string[] = [];

  for (const item of items) {
    const result = await products.findOneAndUpdate(
      { slug: item.slug, stock: { $gte: item.qty } },
      { $inc: { stock: -item.qty } },
      { returnDocument: "after", projection: { stock: 1 } },
    );
    if (result) {
      done.push({ item, after: result.stock });
      continue;
    }
    const current = await products.findOne({ slug: item.slug }, { projection: { stock: 1 } });
    problems.push(
      current
        ? `${item.name}: stokta ${current.stock} adet var, siparişte ${item.qty} adet isteniyor.`
        : `${item.name}: ürün artık yok (silinmiş).`,
    );
  }

  // Bir satır yetmediyse, düşülenler geri konur: ya hepsi düşer ya hiçbiri (geçmişe de yazılmaz; net değişim yok).
  if (problems.length > 0) {
    for (const { item } of done) await products.updateOne({ slug: item.slug }, { $inc: { stock: item.qty } });
    return problems;
  }
  await recordStockMoves(
    done.map(({ item, after }) => ({ slug: item.slug, name: item.name, delta: -item.qty, after, kind, orderNumber })),
  );
  return problems;
}

async function returnStock(items: OrderItem[], kind: StockMoveKind, orderNumber: string): Promise<void> {
  const products = await productsOf();
  const moves = [];
  // Ürün silinmişse eşleşme olmaz; sorun değil (geçmişe sonraki stok boş olarak yazılır).
  for (const item of items) {
    const result = await products.findOneAndUpdate(
      { slug: item.slug },
      { $inc: { stock: item.qty } },
      { returnDocument: "after", projection: { stock: 1 } },
    );
    moves.push({ slug: item.slug, name: item.name, delta: item.qty, after: result?.stock ?? null, kind, orderNumber });
  }
  await recordStockMoves(moves);
}

// Siparişin stoğunu düşer (zaten düşülmüşse bir şey yapmaz). Dönüş: stok yetmeyen satırların açıklamaları.
async function deductOrderStock(order: Order): Promise<string[]> {
  if (order.stockDeducted) return [];
  const problems = await deductStock(order.items, "order-deduct", order.number);
  if (problems.length === 0) {
    const orders = await ordersOf();
    await orders.updateOne({ number: order.number, stockDeducted: false }, { $set: { stockDeducted: true, updatedAt: new Date() } });
  }
  return problems;
}

// Düşülmüş stoğu iade eder. Bayrak önce kapatılır: aynı sipariş için iki kez iade edilemez.
export async function releaseOrderStock(order: Order, kind: StockMoveKind = "order-return"): Promise<void> {
  const orders = await ordersOf();
  const flipped = await orders.updateOne(
    { number: order.number, stockDeducted: true },
    { $set: { stockDeducted: false, updatedAt: new Date() }, $unset: { reservedUntil: "" } },
  );
  if (flipped.modifiedCount === 1) await returnStock(order.items, kind, order.number);
}

export type ReserveResult = { ok: true } | { ok: false; problems: string[] };

// Kartla ödeme başlamadan hemen önce siparişin stoğunu ayırır (düşer) ve RESERVATION_MINUTES süre tanır. Stok zaten
// ayrılmışsa süre yenilenir. Yetmeyen ürün varsa hiçbir stok değişmez ve sorunlar döner (ödeme başlatılmamalı).
export async function reserveOrderStock(number: string): Promise<ReserveResult> {
  const orders = await ordersOf();
  const until = () => new Date(Date.now() + RESERVATION_MINUTES * 60_000);
  const order = await orders.findOne({ number, status: "pending" }, { projection: { _id: 0 } });
  if (!order) return { ok: false, problems: ["Bu sipariş için ödeme beklenmiyor."] };

  if (order.stockDeducted) {
    await orders.updateOne({ number, status: "pending", stockDeducted: true }, { $set: { reservedUntil: until() } });
    return { ok: true };
  }

  const problems = await deductStock(order.items, "order-reserve", number);
  if (problems.length > 0) return { ok: false, problems: await shortageForCustomer(order.items) };

  // Stok düştü; sipariş bu arada değişmediyse ayrıldı olarak işaretlenir. Değiştiyse (başka istek ayırdı ya da iptal
  // edildi) düşülen stok geri konur: aynı sipariş için stok iki kez düşülmez.
  const marked = await orders.updateOne(
    { number, status: "pending", stockDeducted: false },
    { $set: { stockDeducted: true, reservedUntil: until(), updatedAt: new Date() } },
  );
  if (marked.modifiedCount === 1) return { ok: true };
  await returnStock(order.items, "order-release", number);
  const current = await orders.findOne({ number }, { projection: { status: 1, stockDeducted: 1 } });
  return current?.status === "pending" && current.stockDeducted
    ? { ok: true }
    : { ok: false, problems: ["Bu sipariş için ödeme beklenmiyor."] };
}

// Müşteriye gösterilecek eksik listesi: "X tükendi." ya da "X için stokta yalnız N adet kaldı."
async function shortageForCustomer(items: OrderItem[]): Promise<string[]> {
  const products = await productsOf();
  const lines: string[] = [];
  for (const item of items) {
    const current = await products.findOne({ slug: item.slug }, { projection: { stock: 1 } });
    const stock = current?.stock ?? 0;
    if (stock >= item.qty) continue;
    lines.push(stock <= 0 ? `${item.name} tükendi.` : `${item.name} için stokta yalnız ${stock} adet kaldı.`);
  }
  return lines.length > 0 ? lines : ["Sepetinizdeki bazı ürünler stokta yetmiyor."];
}

// Ayrılmış stoğu geri koyar (ödeme olmadı). Yalnız hâlâ "ödeme bekleniyor" ve ayrılmış durumdaki siparişte çalışır;
// ödenmiş ya da yönetimde elle işlenmiş siparişe dokunmaz.
export async function releaseReservation(number: string): Promise<boolean> {
  const orders = await ordersOf();
  const released = await orders.findOneAndUpdate(
    { number, status: "pending", stockDeducted: true, reservedUntil: { $exists: true } },
    { $set: { stockDeducted: false, updatedAt: new Date() }, $unset: { reservedUntil: "" } },
    { projection: { _id: 0, items: 1 } },
  );
  if (!released) return false;
  await returnStock(released.items, "order-release", number);
  return true;
}

// Süresi dolan ayırmaları geri koyar. Mağaza ve yönetim sayfaları sık çağırır; en çok 30 saniyede bir çalışır ve süresi
// dolan yoksa tek bir sorgudur. force: sınamalar ve stok sayfası beklemeden çalıştırır.
const SWEEP_EVERY_MS = 30_000;
let lastSweep = 0;
export async function sweepExpiredReservations(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  try {
    const orders = await ordersOf();
    const expired = await orders
      .find({ status: "pending", stockDeducted: true, reservedUntil: { $lt: new Date(now) } }, { projection: { number: 1 } })
      .limit(50)
      .toArray();
    for (const { number } of expired) {
      // Koşul yeniden denetlenir: bu arada ödendiyse ya da süre yenilendiyse dokunulmaz.
      const released = await orders.findOneAndUpdate(
        { number, status: "pending", stockDeducted: true, reservedUntil: { $lt: new Date() } },
        { $set: { stockDeducted: false, updatedAt: new Date() }, $unset: { reservedUntil: "" } },
        { projection: { _id: 0, items: 1 } },
      );
      if (released) await returnStock(released.items, "order-release", number);
    }
  } catch (error) {
    lastSweep = 0; // bir sonraki istekte yeniden denensin
    console.error("Süresi dolan stok ayırmaları geri konamadı", error);
  }
}

// Kartla ödeme alındı (sonuç kuruluştan sorularak doğrulanmış): sipariş "ödendi" olur ve stok düşer. Elle "ödendi"den
// farkı: stok yetmese bile sipariş "ödendi" KALIR, çünkü para alınmıştır; yetmeyen ürünler döndürülür ve sipariş sayfasındaki
// stok uyarısı + "Stoğu şimdi düş" düğmesi ya da iptal (ödemeyi de iade eder) ile çözülür.
// Sipariş artık "ödeme bekleniyor" değilse (iptal edilmiş, silinmiş ya da başka yoldan ödenmiş) hiçbir şey değişmez.
export type ApplyPaymentResult =
  | { applied: true; stockProblems: string[] }
  | { applied: false; reason: "missing" | "closed" | "already-paid" };

export async function applyPayment(number: string): Promise<ApplyPaymentResult> {
  const paid = await setStatus(number, ["pending"], "paid");
  if (paid?.reservedUntil) await (await ordersOf()).updateOne({ number }, { $unset: { reservedUntil: "" } });
  if (!paid) {
    const orders = await ordersOf();
    const current = await orders.findOne({ number }, { projection: { status: 1 } });
    if (!current) return { applied: false, reason: "missing" };
    return { applied: false, reason: current.status === "cancelled" ? "closed" : "already-paid" };
  }
  return { applied: true, stockProblems: await deductOrderStock(paid) };
}

const moved = (to: OrderStatus) => `Sipariş “${ORDER_STATUS_LABELS[to]}” durumuna alındı.`;

// Yönetimdeki bir işlemi uygular. command: işlem; ship: yalnız "ship" komutu için kargo bilgisi.
export async function runOrderCommand(number: string, command: OrderCommand, ship?: OrderShipment): Promise<FlowResult> {
  const orders = await ordersOf();
  const order = await orders.findOne({ number }, { projection: { _id: 0 } });
  if (!order) return { ok: false, error: MISSING };
  if (!availableCommands(order).includes(command)) return { ok: false, error: NOT_ALLOWED };

  switch (command) {
    case "paid": {
      const paid = await setStatus(number, ["pending"], "paid");
      if (!paid) return { ok: false, error: CHANGED };
      const problems = await deductOrderStock(paid);
      if (problems.length > 0) {
        // Stok yetmedi: sipariş "ödeme bekleniyor"a döner (kayıt geçmişten de silinir), hiçbir stok değişmemiştir.
        await orders.updateOne(
          { number, status: "paid", stockDeducted: false },
          { $set: { status: "pending", updatedAt: new Date() }, $pop: { history: 1 } },
        );
        return { ok: false, error: "Stok yetmediği için sipariş ödendi olarak işaretlenemedi.", problems };
      }
      return { ok: true, message: "Sipariş ödendi olarak işaretlendi; ürünlerin stoğu düşüldü." };
    }

    case "ship": {
      if (!ship) return { ok: false, error: "Kargo bilgisi eksik." };
      if (order.status === "shipped") {
        const updated = await orders.updateOne({ number, status: "shipped" }, { $set: { shipment: ship, updatedAt: new Date() } });
        return updated.matchedCount === 1 ? { ok: true, message: "Kargo bilgisi güncellendi." } : { ok: false, error: CHANGED };
      }
      const shipped = await setStatus(number, ["paid", "preparing"], "shipped", { shipment: ship });
      return shipped
        ? { ok: true, message: "Sipariş kargoya verildi olarak işaretlendi.", notify: "shipped" }
        : { ok: false, error: CHANGED };
    }

    case "cancel": {
      const cancelled = await setStatus(number, ["pending", "paid", "preparing"], "cancelled");
      if (!cancelled) return { ok: false, error: CHANGED };
      if (!cancelled.stockDeducted) return { ok: true, message: "Sipariş iptal edildi." };
      if (cancelled.reservedUntil) {
        // Ödenmemiş siparişin stoğu yalnız kartla ödeme için ayrılmıştı.
        await releaseOrderStock(cancelled, "order-release");
        return { ok: true, message: "Sipariş iptal edildi; ödeme için ayrılan stok geri kondu." };
      }
      await releaseOrderStock(cancelled);
      return { ok: true, message: "Sipariş iptal edildi; düşülen stok iade edildi." };
    }

    case "back": {
      const to = targetStatus("back", order.status);
      if (!to) return { ok: false, error: NOT_ALLOWED };
      const back = await setStatus(number, [order.status], to);
      if (!back) return { ok: false, error: CHANGED };
      if (to === "pending" && back.stockDeducted) {
        await releaseOrderStock(back); // ödeme işareti geri alındı: stok da geri gelir
        return { ok: true, message: `${moved(to)} Düşülen stok iade edildi.` };
      }
      return { ok: true, message: moved(to) };
    }

    case "stock-deduct": {
      const problems = await deductOrderStock(order);
      return problems.length > 0
        ? { ok: false, error: "Stok yetmediği için düşülemedi.", problems }
        : { ok: true, message: "Ürünlerin stoğu düşüldü." };
    }

    case "stock-return": {
      await releaseOrderStock(order);
      return { ok: true, message: "Düşülen stok iade edildi." };
    }

    default: {
      // preparing, deliver: yalnız durum değişir.
      const to = targetStatus(command, order.status);
      if (!to) return { ok: false, error: NOT_ALLOWED };
      const next = await setStatus(number, [order.status], to);
      return next ? { ok: true, message: moved(to) } : { ok: false, error: CHANGED };
    }
  }
}
