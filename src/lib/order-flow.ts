import "server-only";

import { getDb } from "./mongodb";
import { ORDER_STATUS_LABELS, type Order, type OrderItem, type OrderShipment, type OrderStatus } from "./order-model";
import { availableCommands, targetStatus, type OrderCommand } from "./order-status";

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

// notify: işlemin ardından müşteriye e-posta gitmesi gerekiyorsa hangisi (yalnız durum gerçekten değiştiğinde).
export type FlowResult =
  | { ok: true; message: string; notify?: "shipped" }
  | { ok: false; error: string; problems?: string[] };

const MISSING = "Sipariş bulunamadı.";
const NOT_ALLOWED = "Bu işlem siparişin şu anki durumunda yapılamaz. Sayfayı yenileyip yeniden deneyin.";
const CHANGED = "Siparişin durumu bu arada değişmiş. Sayfayı yenileyip yeniden deneyin.";

const ordersOf = async () => (await getDb()).collection<Order>("orders");
const productsOf = async () => (await getDb()).collection<{ slug: string; stock: number }>("products");

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
async function deductStock(items: OrderItem[]): Promise<string[]> {
  const products = await productsOf();
  const done: OrderItem[] = [];
  const problems: string[] = [];

  for (const item of items) {
    const result = await products.updateOne({ slug: item.slug, stock: { $gte: item.qty } }, { $inc: { stock: -item.qty } });
    if (result.modifiedCount === 1) {
      done.push(item);
      continue;
    }
    const current = await products.findOne({ slug: item.slug }, { projection: { stock: 1 } });
    problems.push(
      current
        ? `${item.name}: stokta ${current.stock} adet var, siparişte ${item.qty} adet isteniyor.`
        : `${item.name}: ürün artık yok (silinmiş).`,
    );
  }

  // Bir satır yetmediyse, düşülenler geri konur: ya hepsi düşer ya hiçbiri.
  if (problems.length > 0) {
    for (const item of done) await products.updateOne({ slug: item.slug }, { $inc: { stock: item.qty } });
  }
  return problems;
}

async function returnStock(items: OrderItem[]): Promise<void> {
  const products = await productsOf();
  // Ürün silinmişse eşleşme olmaz; sorun değil.
  for (const item of items) await products.updateOne({ slug: item.slug }, { $inc: { stock: item.qty } });
}

// Siparişin stoğunu düşer (zaten düşülmüşse bir şey yapmaz). Dönüş: stok yetmeyen satırların açıklamaları.
async function deductOrderStock(order: Order): Promise<string[]> {
  if (order.stockDeducted) return [];
  const problems = await deductStock(order.items);
  if (problems.length === 0) {
    const orders = await ordersOf();
    await orders.updateOne({ number: order.number, stockDeducted: false }, { $set: { stockDeducted: true, updatedAt: new Date() } });
  }
  return problems;
}

// Düşülmüş stoğu iade eder. Bayrak önce kapatılır: aynı sipariş için iki kez iade edilemez.
export async function releaseOrderStock(order: Order): Promise<void> {
  const orders = await ordersOf();
  const flipped = await orders.updateOne(
    { number: order.number, stockDeducted: true },
    { $set: { stockDeducted: false, updatedAt: new Date() } },
  );
  if (flipped.modifiedCount === 1) await returnStock(order.items);
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
