import "server-only";

import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { Order } from "./order-model";
import { allowRequest } from "./rate-limit";

// Ürün yorumları (koleksiyon "reviews"). Kullanıcı kararları (2026-10-07): yalnız giriş yapmış ve o ürünü içeren TESLİM
// EDİLMİŞ bir siparişi olan müşteri yazar; müşteri başına ürün başına tek yorum; 1–5 yıldız + en çok 1000 karakter; yorum
// yönetim onayına kadar "bekliyor"dur ve müşteri onu Hesabım'da görür, düzenler ya da siler; onaydan sonra yalnız silebilir.
// Ürün sayfasında yalnız onaylı yorumlar görünür. Yetki her işlemde sunucuda yeniden denetlenir.

export const REVIEW_TEXT_MAX = 1000;
export const REVIEW_TEXT_MIN = 10;
const REVIEWS_PER_HOUR = 10; // müşteri başına yazma/düzenleme isteği

export type ReviewStatus = "pending" | "approved" | "rejected";
export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "Onay bekliyor",
  approved: "Yayında",
  rejected: "Yayımlanmadı",
};

type ReviewDoc = {
  _id: ObjectId;
  slug: string;
  productName: string;
  customerId: string;
  authorName: string; // sitede gösterilen kısaltılmış ad ("Ayşe Y.")
  orderNumber: string; // yetki veren teslim edilmiş sipariş
  rating: number;
  text: string;
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
  decidedAt?: Date;
};

export type Review = Omit<ReviewDoc, "_id" | "customerId" | "orderNumber"> & { id: string };
export type AdminReview = Review & { orderNumber: string };

const reviewsOf = async () => (await getDb()).collection<ReviewDoc>("reviews");

let indexesReady: Promise<void> | undefined;
function ensureIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    const reviews = await reviewsOf();
    await Promise.all([
      reviews.createIndex({ customerId: 1, slug: 1 }, { unique: true }), // ürün başına tek yorum
      reviews.createIndex({ slug: 1, status: 1, createdAt: -1 }),
      reviews.createIndex({ status: 1, createdAt: -1 }),
    ]);
  })().catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  return indexesReady;
}

const toReview = ({ _id, customerId, orderNumber, ...rest }: ReviewDoc): Review => {
  void customerId;
  void orderNumber;
  return { id: _id.toHexString(), ...rest };
};

// "Ayşe Nur Yılmaz" → "Ayşe Y." (gizlilik: soyadın yalnız baş harfi).
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Müşteri";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts.at(-1)!.slice(0, 1).toLocaleUpperCase("tr")}.`;
}

export type Reviewable = { slug: string; name: string; orderNumber: string };

// Müşterinin teslim edilmiş siparişlerindeki ürünler (yorum yazılabilecekler; her ürün bir kez, en yeni sipariş).
export async function reviewableProducts(customerId: string): Promise<Reviewable[]> {
  const orders = (await getDb()).collection<Order>("orders");
  const delivered = await orders
    .find({ customerId, status: "delivered" }, { projection: { _id: 0, number: 1, items: 1 } })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  const seen = new Map<string, Reviewable>();
  for (const order of delivered) {
    for (const item of order.items) {
      if (!seen.has(item.slug)) seen.set(item.slug, { slug: item.slug, name: item.name, orderNumber: order.number });
    }
  }
  return [...seen.values()];
}

export async function myReviews(customerId: string): Promise<Review[]> {
  await ensureIndexes();
  const docs = await (await reviewsOf()).find({ customerId }).sort({ createdAt: -1 }).toArray();
  return docs.map(toReview);
}

export async function myReviewFor(customerId: string, slug: string): Promise<Review | null> {
  const doc = await (await reviewsOf()).findOne({ customerId, slug });
  return doc ? toReview(doc) : null;
}

export type ReviewInput = { rating: number; text: string };
export type ReviewResult = { ok: true } | { ok: false; field: "puan" | "metin" | null; message: string };

export function checkReviewInput(ratingText: string, text: string): ReviewResult & { input?: ReviewInput } {
  const rating = /^[1-5]$/.test(ratingText) ? Number(ratingText) : NaN;
  if (!Number.isInteger(rating)) return { ok: false, field: "puan", message: "1 ile 5 arasında bir puan seçin." };
  const length = [...text].length;
  if (length < REVIEW_TEXT_MIN) return { ok: false, field: "metin", message: `Yorumunuz en az ${REVIEW_TEXT_MIN} karakter olmalı.` };
  if (length > REVIEW_TEXT_MAX) return { ok: false, field: "metin", message: `Yorumunuz en çok ${REVIEW_TEXT_MAX} karakter olabilir.` };
  return { ok: true, input: { rating, text } };
}

// Yeni yorum yazar ya da bekleyen yorumu düzenler (düzenlenen yorum yeniden onay bekler). Onaylanmış ya da reddedilmiş
// yorum düzenlenemez (silinip yeniden yazılabilir: reddedilen için).
export async function saveReview(
  customer: { id: string; name: string },
  slug: string,
  input: ReviewInput,
): Promise<ReviewResult> {
  await ensureIndexes();
  if (!(await allowRequest(`yorum|${customer.id}`, REVIEWS_PER_HOUR, 60))) {
    return { ok: false, field: null, message: "Kısa sürede çok fazla yorum gönderildi. Biraz sonra yeniden deneyin." };
  }
  const allowed = (await reviewableProducts(customer.id)).find((item) => item.slug === slug);
  if (!allowed) {
    return { ok: false, field: null, message: "Bu ürüne yorum yazabilmek için ürünü içeren siparişinizin teslim edilmiş olması gerekir." };
  }

  const reviews = await reviewsOf();
  const existing = await reviews.findOne({ customerId: customer.id, slug });
  const now = new Date();
  if (existing) {
    if (existing.status !== "pending") {
      return { ok: false, field: null, message: "Yayımlanmış ya da değerlendirilmiş yorum düzenlenemez; isterseniz silebilirsiniz." };
    }
    await reviews.updateOne(
      { _id: existing._id, status: "pending" },
      { $set: { rating: input.rating, text: input.text, authorName: shortName(customer.name), updatedAt: now } },
    );
    return { ok: true };
  }
  try {
    await reviews.insertOne({
      _id: new ObjectId(),
      slug,
      productName: allowed.name,
      customerId: customer.id,
      authorName: shortName(customer.name),
      orderNumber: allowed.orderNumber,
      rating: input.rating,
      text: input.text,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return { ok: false, field: null, message: "Bu ürün için zaten bir yorumunuz var." };
    }
    throw error;
  }
  return { ok: true };
}

export async function deleteMyReview(customerId: string, id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const result = await (await reviewsOf()).deleteOne({ _id: new ObjectId(id), customerId });
  return result.deletedCount === 1;
}

// Hesap silinince müşterinin yorumları da silinir (kişisel veri).
export async function deleteReviewsOf(customerId: string): Promise<void> {
  await (await reviewsOf()).deleteMany({ customerId });
}

export type ProductReviews = { reviews: Review[]; count: number; average: number | null };

// Ürün sayfası: yalnız onaylı yorumlar (yeniden eskiye, en çok 50) ve ortalama.
export async function approvedReviews(slug: string): Promise<ProductReviews> {
  await ensureIndexes();
  const reviews = await reviewsOf();
  const [docs, stats] = await Promise.all([
    reviews.find({ slug, status: "approved" }).sort({ createdAt: -1 }).limit(50).toArray(),
    reviews
      .aggregate<{ count: number; average: number }>([
        { $match: { slug, status: "approved" } },
        { $group: { _id: null, count: { $sum: 1 }, average: { $avg: "$rating" } } },
      ])
      .toArray(),
  ]);
  return { reviews: docs.map(toReview), count: stats[0]?.count ?? 0, average: stats[0]?.average ?? null };
}

// ---------- Yönetim ----------

export async function listReviewsForAdmin(status: ReviewStatus, limit = 100): Promise<AdminReview[]> {
  await ensureIndexes();
  const docs = await (await reviewsOf()).find({ status }).sort({ createdAt: status === "pending" ? 1 : -1 }).limit(limit).toArray();
  return docs.map((doc) => ({ ...toReview(doc), orderNumber: doc.orderNumber }));
}

export async function countPendingReviews(): Promise<number> {
  await ensureIndexes();
  return (await reviewsOf()).countDocuments({ status: "pending" });
}

// Onayla / reddet. Yalnız bekleyen ya da (fikir değiştirilirse) diğer karar durumundaki yorum değişir.
export async function decideReview(id: string, status: "approved" | "rejected"): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const now = new Date();
  const result = await (await reviewsOf()).updateOne(
    { _id: new ObjectId(id), status: { $ne: status } },
    { $set: { status, decidedAt: now, updatedAt: now } },
  );
  return result.modifiedCount === 1;
}

export async function deleteReviewByAdmin(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  return (await (await reviewsOf()).deleteOne({ _id: new ObjectId(id) })).deletedCount === 1;
}
