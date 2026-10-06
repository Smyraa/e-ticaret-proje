import "server-only";

import { randomBytes } from "node:crypto";
import { after } from "next/server";
import { formatPrice } from "./format";
import { getDb } from "./mongodb";
import { ensureCouponHeld } from "./coupons";
import { applyPayment, releaseReservation, reserveOrderStock } from "./order-flow";
import { notifyOrderPlaced, notifyPaymentAlert } from "./order-notify";
import type { Order, OrderStatus } from "./order-model";
import { canRefund, isCheckable, sameAmount, type PaymentAttention, type PaymentRecord } from "./payment-model";
import { activeProvider, getProvider } from "./payment-providers";
import type { RefundResult, StartResult, VerifyResult } from "./payment-provider";
import { siteUrl } from "./site";

// Kartla ödeme akışı (koleksiyon "payments"). Müşteri ödeme sayfasına gönderilir (startPayment), ödemeden sonra sitemize döner
// (confirmPaymentByToken) ve sonuç kuruluşa SUNUCUDAN sorularak öğrenilir; tarayıcının söylediğine güvenilmez. Aynı ödeme
// birden çok kez bildirilse de (yenileme, çift tıklama, eşzamanlı istek) yalnız bir kez işlenir: "başlatıldı" durumundaki kayıt
// koşullu güncellenir, kazanan istek siparişi günceller, diğerleri "zaten işlendi" görür.
// Kayıtta kart bilgisi yoktur; kart bilgisi yalnız kuruluşun kendi sayfasına girilir.
// `after()` kullanılır (e-postalar yanıt gittikten sonra hazırlanır): yalnız bir istek (sayfa, sunucu eylemi, yol işleyici)
// içinden çağrılmalı.

type PaymentDoc = PaymentRecord & { _id: string };
export type PaymentView = PaymentRecord & { id: string };

const paymentsOf = async () => (await getDb()).collection<PaymentDoc>("payments");

const toView = ({ _id, ...rest }: PaymentDoc): PaymentView => ({ id: _id, ...rest });
const newId = () => randomBytes(12).toString("hex");

let indexesReady: Promise<void> | undefined;
function ensureIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    const payments = await paymentsOf();
    await Promise.all([
      payments.createIndex({ token: 1 }, { unique: true }),
      payments.createIndex({ orderNumber: 1, createdAt: -1 }),
      payments.createIndex({ status: 1, updatedAt: -1 }), // yönetim ana sayfasındaki "ilgilenilecek ödemeler"
    ]);
  })().catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  return indexesReady;
}

// Açık bir ödeme oturumu bitmesine bu kadar süre varsa aynı oturum yeniden kullanılır (yenileme ve çift tıklamada yeni
// oturum açılmaz); daha azsa yenisi açılır.
const REUSE_MARGIN_MS = 3 * 60_000;

// stock: stok yetmediği için ödeme başlatılmadıysa yetmeyen ürünlerin açıklamaları.
export type StartOutcome = { ok: true; url: string } | { ok: false; error: string; stock?: string[] };

const stockError = (problems: string[]) =>
  `Ödeme başlatılmadı, çünkü bazı ürünler stokta yetmiyor: ${problems.join(" ")}`;

// Siparişin ödemesini başlatır: kuruluşta oturum açar ve müşterinin gönderileceği ödeme sayfasının adresini verir.
// Açık bir oturum varsa onu yeniden kullanır. Yalnız "ödeme bekleniyor" durumundaki sipariş için çalışır.
// Ödeme sayfası açılmadan ÖNCE siparişin stoğu ayrılır (order-flow.ts → reserveOrderStock); stok yetmezse ödeme
// başlatılmaz ve yetmeyen ürünler söylenir. Oturum açılamazsa ayrılan stok hemen geri konur.
export async function startPayment(order: Order, ip: string): Promise<StartOutcome> {
  const provider = activeProvider();
  if (!provider) return { ok: false, error: "Kartla ödeme şu an alınamıyor." };
  if (order.status !== "pending") return { ok: false, error: "Bu sipariş için ödeme beklenmiyor." };
  if (provider.live && order.test) {
    return { ok: false, error: "Örnek ürünlerden oluşan siparişler için gerçek ödeme alınamaz." };
  }

  try {
    await ensureIndexes();
    const reserved = await reserveOrderStock(order.number);
    if (!reserved.ok) return { ok: false, error: stockError(reserved.problems), stock: reserved.problems };
    const held = await ensureCouponHeld(order);
    if (!held.ok) {
      await releaseReservation(order.number);
      return { ok: false, error: `Ödeme başlatılmadı: ${held.message}` };
    }

    const payments = await paymentsOf();
    const now = new Date();

    const open = await payments.findOne(
      {
        orderNumber: order.number,
        provider: provider.name,
        status: "started",
        expiresAt: { $gt: new Date(now.getTime() + REUSE_MARGIN_MS) },
      },
      { sort: { createdAt: -1 } },
    );
    if (open) return { ok: true, url: open.redirectUrl };

    const conversationId = randomBytes(12).toString("hex");
    let session: StartResult;
    try {
      session = await provider.start({ order, conversationId, callbackUrl: `${siteUrl}/odeme/geri-donus`, ip });
    } catch (error) {
      await releaseReservation(order.number).catch(() => false); // açık oturum yok: ayrılan stok beklemesin
      throw error;
    }
    await payments.insertOne({
      _id: newId(),
      orderNumber: order.number,
      provider: provider.name,
      token: session.token,
      redirectUrl: session.redirectUrl,
      conversationId,
      amount: order.total,
      currency: "TRY",
      status: "started",
      createdAt: now,
      updatedAt: now,
      expiresAt: session.expiresAt,
    });
    return { ok: true, url: session.redirectUrl };
  } catch (error) {
    console.error(`Ödeme başlatılamadı (${order.number})`, error);
    return { ok: false, error: "Ödeme sayfası şu an açılamadı. Biraz sonra yeniden deneyin." };
  }
}

export type ConfirmOutcome =
  | { kind: "unknown" } // bu anahtarla bir ödememiz yok
  | { kind: "error"; payment: PaymentView } // kuruluşa ulaşılamadı; ödeme bekleyen durumda kalır, sonra yeniden sorulabilir
  | { kind: "settled"; payment: PaymentView } // zaten işlenmişti (ya da başka bir istek şimdi işledi)
  | { kind: "pending"; payment: PaymentView } // müşteri ödemeyi henüz tamamlamadı
  | { kind: "failed"; payment: PaymentView } // ödeme olmadı
  | { kind: "paid"; payment: PaymentView }; // ödeme bu istekte alındı ve işlendi (siparişe işlenip işlenmediği payment.applied'da)

// Alınan ödemeyi siparişe işler ve e-postaları hazırlar. Çağıran, ödemeyi "ödendi" olarak AZ ÖNCE tek başına kazanmış olmalı.
async function applyClaimed(payment: PaymentDoc): Promise<ConfirmOutcome> {
  const payments = await paymentsOf();

  if (payment.attention === "amount-mismatch") {
    console.error(`Ödeme tutarı sipariş tutarıyla uyuşmuyor (${payment.orderNumber})`);
    after(() => notifyPaymentAlert(payment.orderNumber, payment.amount, "amount-mismatch"));
    return { kind: "paid", payment: toView(payment) };
  }

  const outcome = await applyPayment(payment.orderNumber);
  const attention: PaymentAttention | undefined = outcome.applied
    ? undefined
    : outcome.reason === "already-paid"
      ? "duplicate"
      : "order-closed";
  try {
    await payments.updateOne(
      { _id: payment._id },
      { $set: { applied: outcome.applied, updatedAt: new Date(), ...(attention ? { attention } : {}) } },
    );
  } catch (error) {
    // Sipariş güncellendi ama kayıt yazılamadı: ödeme "siparişe işlenmedi" görünür, yönetimden yeniden işlenebilir.
    console.error(`Ödeme kaydı güncellenemedi (${payment.orderNumber})`, error);
  }

  if (outcome.applied) {
    after(() => notifyOrderPlaced(payment.orderNumber, outcome.stockProblems));
  } else {
    after(() => notifyPaymentAlert(payment.orderNumber, payment.amount, attention!));
  }
  return { kind: "paid", payment: toView({ ...payment, applied: outcome.applied, ...(attention ? { attention } : {}) }) };
}

// Sonucu henüz kesinleşmemiş bir ödemenin ("başlatıldı" ya da oturumu hâlâ açık "olmadı") sonucunu kuruluştan sorar ve duruma göre
// işler. Başka her durumdaki ödeme zaten işlenmiştir.
const OPEN_STATUSES: PaymentRecord["status"][] = ["started", "failed"];

async function settle(payment: PaymentDoc): Promise<ConfirmOutcome> {
  if (!isCheckable(payment)) return { kind: "settled", payment: toView(payment) };

  let result: VerifyResult;
  try {
    result = await getProvider(payment.provider).verify(payment);
  } catch (error) {
    console.error(`Ödeme sonucu sorulamadı (${payment.orderNumber})`, error);
    return { kind: "error", payment: toView(payment) };
  }

  const payments = await paymentsOf();
  const now = new Date();

  if (result.outcome === "pending") {
    await payments.updateOne({ _id: payment._id, status: "started" }, { $set: { checkedAt: now } });
    return { kind: "pending", payment: toView(payment) };
  }

  if (result.outcome === "failed") {
    const failed = await payments.findOneAndUpdate(
      { _id: payment._id, status: { $in: OPEN_STATUSES } },
      { $set: { status: "failed", failure: result.reason, updatedAt: now, checkedAt: now } },
      { returnDocument: "after" },
    );
    if (!failed) return { kind: "settled", payment: toView(payment) };
    // Ödeme olmadı: siparişin açık başka bir ödeme oturumu yoksa ayrılan stok hemen geri konur.
    const stillOpen = await payments.countDocuments({
      orderNumber: payment.orderNumber,
      status: "started",
      expiresAt: { $gt: now },
      _id: { $ne: payment._id },
    });
    if (stillOpen === 0) await releaseReservation(payment.orderNumber);
    return { kind: "failed", payment: toView(failed) };
  }

  // Para alınmış. Tutar ve sipariş kuruluşun bildirdiğiyle kendi kaydımızdaki ile aynı olmalı.
  const mismatch =
    !sameAmount(result.paidAmount, payment.amount) ||
    (result.orderNumber !== undefined && result.orderNumber !== payment.orderNumber);
  const claimed = await payments.findOneAndUpdate(
    { _id: payment._id, status: { $in: OPEN_STATUSES } },
    {
      $set: {
        status: "paid",
        paidAt: now,
        updatedAt: now,
        checkedAt: now,
        providerPaymentId: result.providerPaymentId,
        applied: false,
        ...(result.refundRef ? { refundRef: result.refundRef } : {}),
        ...(mismatch ? { attention: "amount-mismatch" as const } : {}),
      },
    },
    { returnDocument: "after" },
  );
  if (!claimed) return { kind: "settled", payment: toView(payment) }; // başka bir istek önce davrandı
  return applyClaimed(claimed);
}

// Ödeme sonrası geri dönüşte: kuruluşun verdiği anahtarla ödemeyi bulur ve sonucunu kuruluştan sorarak işler.
export async function confirmPaymentByToken(token: string): Promise<ConfirmOutcome> {
  await ensureIndexes();
  const payment = await (await paymentsOf()).findOne({ token });
  return payment ? settle(payment) : { kind: "unknown" };
}

// "Ödememi kontrol et": siparişin bekleyen ödemelerinin sonucunu kuruluştan sorar (müşteri ödeme sonrası siteye dönmediyse
// ya da geri dönüş yarıda kaldıysa ödemeyi yakalamak için).
export async function checkOrderPayments(orderNumber: string): Promise<ConfirmOutcome[]> {
  await ensureIndexes();
  const waiting = await (await paymentsOf())
    .find({ orderNumber, $or: [{ status: "started" }, { status: "failed", expiresAt: { $gt: new Date() } }] })
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray();
  const outcomes: ConfirmOutcome[] = [];
  for (const payment of waiting) outcomes.push(await settle(payment));
  return outcomes;
}

export type ActionOutcome = { ok: true; message: string } | { ok: false; error: string };

// Alınmış ama siparişe işlenmemiş bir ödemeyi (örn. işlem yarıda kaldı) yeniden siparişe işler.
export async function reapplyPayment(id: string): Promise<ActionOutcome> {
  const payments = await paymentsOf();
  const payment = await payments.findOne({ _id: id, status: "paid", applied: { $ne: true } });
  if (!payment) return { ok: false, error: "Bu ödeme için yapılacak bir işlem yok." };
  if (payment.attention === "amount-mismatch") {
    return { ok: false, error: "Tutar uyuşmadığı için bu ödeme siparişe işlenemez; ödemeyi iade edin." };
  }

  const outcome = await applyPayment(payment.orderNumber);
  const now = new Date();
  if (outcome.applied) {
    await payments.updateOne({ _id: id }, { $set: { applied: true, updatedAt: now }, $unset: { attention: "" } });
    after(() => notifyOrderPlaced(payment.orderNumber, outcome.stockProblems));
    return {
      ok: true,
      message:
        outcome.stockProblems.length > 0
          ? "Ödeme siparişe işlendi ama stok yetmedi; sipariş sayfasındaki uyarıya bakın."
          : "Ödeme siparişe işlendi.",
    };
  }
  if (outcome.reason === "already-paid") {
    // Sipariş zaten ödenmiş: ödeme siparişe daha önce işlenmiş de kayıt yazılamamış olabilir. Başka bir işlenmiş ödeme
    // yoksa bu odur; varsa bu fazladan alınmış demektir.
    const other = await payments.countDocuments({ orderNumber: payment.orderNumber, _id: { $ne: id }, applied: true });
    if (other === 0) {
      await payments.updateOne({ _id: id }, { $set: { applied: true, updatedAt: now }, $unset: { attention: "" } });
      return { ok: true, message: "Ödeme zaten siparişe işlenmiş; kayıt düzeltildi." };
    }
    await payments.updateOne({ _id: id }, { $set: { attention: "duplicate", updatedAt: now } });
    return { ok: false, error: "Siparişe başka bir ödeme işlenmiş; bu ödeme fazla. Ödemeyi iade edin." };
  }
  await payments.updateOne({ _id: id }, { $set: { attention: "order-closed", updatedAt: now } });
  return { ok: false, error: "Sipariş iptal edilmiş ya da silinmiş; ödemeyi iade edin." };
}

type RefundOne = { ok: true; amount: number } | { ok: false; error: string };

// Tek bir ödemeyi iade eder. Aynı ödeme iki kez iade edilmesin diye kısa süreli bir kilit alınır (kilit alınamazsa başka
// bir iade sürüyordur); kuruluş reddederse ya da ulaşılamazsa kayıt "iade edilemedi" olur ve yeniden denenebilir.
async function refundOne(id: string): Promise<RefundOne> {
  const payments = await paymentsOf();
  const now = new Date();
  const locked = await payments.findOneAndUpdate(
    {
      _id: id,
      status: { $in: ["paid", "refund-failed"] },
      $or: [{ refundLockUntil: { $exists: false } }, { refundLockUntil: { $lte: now } }],
    },
    { $set: { refundLockUntil: new Date(now.getTime() + 60_000), updatedAt: now } },
    { returnDocument: "after" },
  );
  if (!locked) return { ok: false, error: "Bu ödeme için iade zaten sürüyor ya da gerekmiyor." };

  let result: RefundResult;
  try {
    result = await getProvider(locked.provider).refund(locked);
  } catch (error) {
    console.error(`Ödeme iadesi yapılamadı (${locked.orderNumber})`, error);
    result = { ok: false, error: "Ödeme kuruluşuna ulaşılamadı." };
  }

  const done = new Date();
  if (result.ok) {
    await payments.updateOne(
      { _id: id },
      { $set: { status: "refunded", refundedAt: done, updatedAt: done }, $unset: { refundLockUntil: "", refundError: "" } },
    );
    return { ok: true, amount: locked.amount };
  }
  await payments.updateOne(
    { _id: id },
    { $set: { status: "refund-failed", refundError: result.error, updatedAt: done }, $unset: { refundLockUntil: "" } },
  );
  return { ok: false, error: result.error };
}

// Yönetimden tek bir ödemeyi iade eder. orderStatus: siparişin şu anki durumu (null = sipariş yok); siparişin kendi ödemesi,
// sipariş ödenmiş/hazırlanıyor/kargodayken buradan iade edilmez (önce sipariş iptal edilir, iptal ödemeyi de iade eder).
export async function refundPayment(id: string, orderStatus: OrderStatus | null): Promise<ActionOutcome> {
  const payment = await (await paymentsOf()).findOne({ _id: id });
  if (!payment) return { ok: false, error: "Ödeme bulunamadı." };
  if (!canRefund(payment, orderStatus)) {
    return {
      ok: false,
      error: "Bu ödeme şu an iade edilemez. Siparişin ödemesini iade etmek için önce siparişi iptal edin.",
    };
  }
  const refunded = await refundOne(id);
  return refunded.ok
    ? { ok: true, message: `Ödeme iade edildi (${formatPrice(refunded.amount)}).` }
    : { ok: false, error: `İade yapılamadı: ${refunded.error}` };
}

export type OrderRefundSummary = { refunded: number; amount: number; failures: string[] };

// Sipariş iptal edilince: o siparişe alınmış, henüz iade edilmemiş tüm ödemeler iade edilir.
export async function refundOrderPayments(orderNumber: string): Promise<OrderRefundSummary> {
  const refundable = await (await paymentsOf())
    .find({ orderNumber, status: { $in: ["paid", "refund-failed"] } })
    .toArray();
  const summary: OrderRefundSummary = { refunded: 0, amount: 0, failures: [] };
  for (const payment of refundable) {
    const result = await refundOne(payment._id);
    if (result.ok) {
      summary.refunded += 1;
      summary.amount += result.amount;
    } else {
      summary.failures.push(result.error);
    }
  }
  return summary;
}

// Bir siparişin ödemeleri, yeniden eskiye (yönetim sayfası).
export async function listPaymentsForOrder(orderNumber: string): Promise<PaymentView[]> {
  const docs = await (await paymentsOf()).find({ orderNumber }).sort({ createdAt: -1, _id: -1 }).toArray();
  return docs.map(toView);
}

// Siparişin en son ödeme denemesi (müşteri sipariş sayfası).
export async function latestPaymentOf(orderNumber: string): Promise<PaymentView | null> {
  const doc = await (await paymentsOf()).findOne({ orderNumber }, { sort: { createdAt: -1, _id: -1 } });
  return doc ? toView(doc) : null;
}

// Yönetimin ilgilenmesi gereken ödemeler: iade edilemeyenler, siparişe işlenmeyenler, tutarı uyuşmayanlar, fazladan alınanlar
// (iade edilince listeden çıkar). Yönetim ana sayfası kullanır.
export async function listPaymentsNeedingAttention(limit = 10): Promise<{ orderNumber: string; amount: number }[]> {
  const docs = await (await paymentsOf())
    .find(
      {
        $or: [
          { status: "refund-failed" },
          { status: "paid", applied: { $ne: true } },
          { status: "paid", attention: { $exists: true } },
        ],
      },
      { projection: { orderNumber: 1, amount: 1 } },
    )
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
  return docs.map((doc) => ({ orderNumber: doc.orderNumber, amount: doc.amount }));
}

// Silinen (test) siparişlerin ödeme kayıtlarını da siler.
export async function deletePaymentsForOrders(orderNumbers: string[]): Promise<void> {
  if (orderNumbers.length === 0) return;
  await (await paymentsOf()).deleteMany({ orderNumber: { $in: orderNumbers } });
}
