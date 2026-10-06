import "server-only";

import { ObjectId } from "mongodb";
import { couponLabel, discountFor, type Coupon, type CouponData, type OrderCoupon } from "./coupon-model";
import { getDb } from "./mongodb";

// Kuponlar (koleksiyon "coupons") ve kullanımları ("couponUses": sipariş başına bir kayıt). Kullanım hakkı sipariş verilirken
// AYRILIR ("held"), ödeme alınınca KESİNLEŞİR ("used"); sipariş iptal edilir, hiç ödenmeden silinir ya da kartla ödeme olmaz/
// terk edilirse (stoğun geri konduğu anda) GERİ BIRAKILIR. Müşteri sonra yeniden ödemeye geçerse hak yeniden ayrılır.
// Sınırlar tek adımda denetlenir: kullanım sayacı koşullu artar (toplam sınır aşılmaz), müşteri başına tek kullanım
// benzersiz dizinle sağlanır (aynı anda gelen iki sipariş ikisini birden alamaz).

type CouponDoc = Omit<Coupon, "id"> & { _id: ObjectId; updatedAt: Date };
type UseDoc = {
  _id: ObjectId;
  couponId: ObjectId;
  code: string;
  orderNumber: string;
  customerKey?: string; // yalnız "müşteri başına tek kullanım" kuponlarında (hesap: c:<id>, misafir: e:<e-posta>)
  status: "held" | "used";
  at: Date;
};

const couponsOf = async () => (await getDb()).collection<CouponDoc>("coupons");
const usesOf = async () => (await getDb()).collection<UseDoc>("couponUses");

let indexesReady: Promise<void> | undefined;
function ensureIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    const [coupons, uses] = await Promise.all([couponsOf(), usesOf()]);
    await Promise.all([
      coupons.createIndex({ code: 1 }, { unique: true }),
      uses.createIndex({ orderNumber: 1 }, { unique: true }),
      uses.createIndex(
        { couponId: 1, customerKey: 1 },
        { unique: true, partialFilterExpression: { customerKey: { $exists: true } } },
      ),
    ]);
  })().catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  return indexesReady;
}

const toCoupon = ({ _id, updatedAt, ...rest }: CouponDoc): Coupon => {
  void updatedAt;
  return { id: _id.toHexString(), ...rest };
};

// ---------- Yönetim ----------

export async function listCoupons(): Promise<Coupon[]> {
  await ensureIndexes();
  return (await (await couponsOf()).find().sort({ createdAt: -1 }).toArray()).map(toCoupon);
}

export async function getCoupon(id: string): Promise<Coupon | null> {
  if (!ObjectId.isValid(id)) return null;
  const doc = await (await couponsOf()).findOne({ _id: new ObjectId(id) });
  return doc ? toCoupon(doc) : null;
}

export class CouponCodeTakenError extends Error {}

export async function createCoupon(data: CouponData): Promise<string> {
  await ensureIndexes();
  const now = new Date();
  const _id = new ObjectId();
  try {
    await (await couponsOf()).insertOne({ ...data, _id, used: 0, createdAt: now, updatedAt: now });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new CouponCodeTakenError();
    throw error;
  }
  return _id.toHexString();
}

export async function updateCoupon(id: string, data: CouponData): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  await ensureIndexes();
  try {
    const result = await (await couponsOf()).updateOne({ _id: new ObjectId(id) }, { $set: { ...data, updatedAt: new Date() } });
    return result.matchedCount === 1;
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new CouponCodeTakenError();
    throw error;
  }
}

export async function setCouponActive(id: string, active: boolean): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await couponsOf()).updateOne({ _id: new ObjectId(id) }, { $set: { active, updatedAt: new Date() } });
  return result.matchedCount === 1;
}

// ---------- Sepet ve sipariş ----------

export type Buyer = { customerId: string | null; email: string | null }; // email: misafirde (sipariş verirken bilinir)

const customerKeyOf = (buyer: Buyer) =>
  buyer.customerId ? `c:${buyer.customerId}` : buyer.email ? `e:${buyer.email.toLowerCase()}` : null;

export type CouponCheck =
  | { ok: true; coupon: Coupon; discount: number; label: string }
  | { ok: false; message: string };

// Kodu sepet için denetler ve indirimi hesaplar (ayırmaz). Sınırlar burada bilgi içindir; asıl denetim ayırmada (holdCoupon).
export async function checkCoupon(code: string, subtotal: number, buyer: Buyer): Promise<CouponCheck> {
  await ensureIndexes();
  const doc = await (await couponsOf()).findOne({ code });
  if (!doc || !doc.active) return { ok: false, message: "Bu kupon kodu geçerli değil." };
  const coupon = toCoupon(doc);
  if (coupon.endsAt.getTime() < Date.now()) return { ok: false, message: "Bu kuponun süresi dolmuş." };
  if (!coupon.allowGuests && !buyer.customerId) {
    return { ok: false, message: "Bu kupon yalnız üye girişi yapan müşteriler içindir. Giriş yapıp yeniden deneyin." };
  }
  if (coupon.minSubtotal > 0 && subtotal < coupon.minSubtotal) {
    return { ok: false, message: `Bu kupon ${coupon.minSubtotal.toLocaleString("tr-TR")} TL ve üzeri sepetlerde geçerli.` };
  }
  if (coupon.usageLimit !== null && coupon.used >= coupon.usageLimit) return { ok: false, message: "Bu kuponun kullanım hakkı dolmuş." };
  const key = customerKeyOf(buyer);
  if (coupon.onePerCustomer && key && (await (await usesOf()).countDocuments({ couponId: doc._id, customerKey: key })) > 0) {
    return { ok: false, message: "Bu kuponu daha önce kullandınız." };
  }
  return { ok: true, coupon, discount: discountFor(coupon, subtotal), label: couponLabel(coupon) };
}

export type HoldResult = { ok: true } | { ok: false; message: string };

// Siparişe kupon kullanım hakkı ayırır. Sayaç koşullu artar (etkin, süresi dolmamış, sınır dolmamış); müşteri başına tek
// kullanım kuralı benzersiz dizinle denetlenir. Başarısızsa hiçbir şey değişmez.
export async function holdCoupon(coupon: OrderCoupon, orderNumber: string, buyer: Buyer): Promise<HoldResult> {
  await ensureIndexes();
  const coupons = await couponsOf();
  const now = new Date();
  const doc = await coupons.findOneAndUpdate(
    {
      code: coupon.code,
      active: true,
      endsAt: { $gt: now },
      $or: [{ usageLimit: null }, { $expr: { $lt: ["$used", "$usageLimit"] } }],
    },
    { $inc: { used: 1 } },
    { returnDocument: "after", projection: { _id: 1, onePerCustomer: 1 } },
  );
  if (!doc) return { ok: false, message: "Kupon artık geçerli değil (süresi dolmuş ya da kullanım hakkı bitmiş olabilir)." };

  const key = doc.onePerCustomer ? customerKeyOf(buyer) : null;
  try {
    await (await usesOf()).insertOne({
      _id: new ObjectId(),
      couponId: doc._id,
      code: coupon.code,
      orderNumber,
      ...(key ? { customerKey: key } : {}),
      status: "held",
      at: now,
    });
  } catch (error) {
    await coupons.updateOne({ _id: doc._id }, { $inc: { used: -1 } });
    if ((error as { code?: number }).code === 11000) {
      const sameOrder = (await (await usesOf()).countDocuments({ orderNumber })) > 0;
      return sameOrder ? { ok: true } : { ok: false, message: "Bu kuponu daha önce kullandınız." };
    }
    throw error;
  }
  return { ok: true };
}

// Siparişin kupon hakkı ayrılı değilse (ör. ödeme olmadığı için bırakılmışsa) yeniden ayırır.
export async function ensureCouponHeld(order: { number: string; coupon?: OrderCoupon; customerId?: string; customer: { email: string } }): Promise<HoldResult> {
  if (!order.coupon) return { ok: true };
  await ensureIndexes();
  if ((await (await usesOf()).countDocuments({ orderNumber: order.number })) > 0) return { ok: true };
  return holdCoupon(order.coupon, order.number, { customerId: order.customerId ?? null, email: order.customer.email });
}

// Ödeme alındı: ayrılan kullanım kesinleşir.
export async function markCouponUsed(orderNumber: string): Promise<void> {
  await (await usesOf()).updateOne({ orderNumber, status: "held" }, { $set: { status: "used", at: new Date() } });
}

// Kullanımı geri bırakır. includeUsed: iptal edilen (ödenmiş olabilir) siparişte kesinleşmiş kullanım da bırakılır.
export async function releaseCoupon(orderNumber: string, includeUsed = false): Promise<void> {
  try {
    const removed = await (await usesOf()).findOneAndDelete(
      includeUsed ? { orderNumber } : { orderNumber, status: "held" },
    );
    if (removed) await (await couponsOf()).updateOne({ _id: removed.couponId, used: { $gt: 0 } }, { $inc: { used: -1 } });
  } catch (error) {
    console.error(`Kupon kullanımı geri bırakılamadı (${orderNumber})`, error);
  }
}
