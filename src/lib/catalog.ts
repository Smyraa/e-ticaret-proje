import "server-only";

import { ObjectId } from "mongodb";
import { cache } from "react";
import { getDb } from "./mongodb";
import { getProductsBySlugs, getProducts, type Product } from "./products";
import { slugify } from "./slug";

// Kategoriler ve vitrinler (kullanıcının planı, 2026-10-07). Kategori: yönetimde oluşturulur, sıralanır, ürünlere atanır
// (ürünün `category` alanı = kategorinin adresi); mağazada /kategori/<adres>. Vitrin: "Kampanyalar" ve "En çok satanlar";
// ürünlerini ve sırasını yönetici seçer (satışa göre otomatik sıralama YOK; kampanya vitrini kuponlardan bağımsızdır).

export const CATEGORY_NAME_MAX = 40;
export const CATEGORY_MAX = 24;
export const SHOWCASE_MAX = 24;

export type Category = { id: string; slug: string; name: string; order: number };

export const SHOWCASES = {
  kampanyalar: { title: "Kampanyalar", path: "/kampanyalar" },
  "en-cok-satanlar": { title: "En çok satanlar", path: "/en-cok-satanlar" },
} as const;
export type ShowcaseKey = keyof typeof SHOWCASES;
export const isShowcaseKey = (value: unknown): value is ShowcaseKey => typeof value === "string" && value in SHOWCASES;

type CategoryDoc = { _id: ObjectId; slug: string; name: string; order: number; createdAt: Date };
type ShowcaseDoc = { _id: ShowcaseKey; slugs: string[]; updatedAt: Date };

const categoriesOf = async () => (await getDb()).collection<CategoryDoc>("categories");
const showcasesOf = async () => (await getDb()).collection<ShowcaseDoc>("showcases");

let indexesReady: Promise<void> | undefined;
function ensureIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    const [categories, products] = await Promise.all([categoriesOf(), (await getDb()).collection("products")]);
    await Promise.all([categories.createIndex({ slug: 1 }, { unique: true }), products.createIndex({ category: 1 })]);
  })().catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  return indexesReady;
}

const toCategory = ({ _id, slug, name, order }: CategoryDoc): Category => ({ id: _id.toHexString(), slug, name, order });

// ---------- Kategoriler ----------

export const listCategories = cache(async (): Promise<Category[]> => {
  await ensureIndexes();
  const docs = await (await categoriesOf()).find().sort({ order: 1, name: 1 }).toArray();
  return docs.map(toCategory);
});

export async function getCategory(slug: string): Promise<Category | null> {
  const doc = await (await categoriesOf()).findOne({ slug });
  return doc ? toCategory(doc) : null;
}

export type CategoryResult = { ok: true } | { ok: false; message: string };

function checkName(name: string): string | null {
  if (!name) return "Kategori adını yazın.";
  if ([...name].length < 2) return "Kategori adı en az 2 karakter olmalı.";
  if ([...name].length > CATEGORY_NAME_MAX) return `Kategori adı en çok ${CATEGORY_NAME_MAX} karakter olabilir.`;
  return null;
}

// Yeni kategori sona eklenir; adresi addan üretilir ve değişmez (ad sonradan değiştirilebilir).
export async function createCategory(name: string): Promise<CategoryResult> {
  const problem = checkName(name);
  if (problem) return { ok: false, message: problem };
  await ensureIndexes();
  const categories = await categoriesOf();
  if ((await categories.countDocuments()) >= CATEGORY_MAX) return { ok: false, message: `En çok ${CATEGORY_MAX} kategori olabilir.` };
  const base = slugify(name);
  const last = await categories.find().sort({ order: -1 }).limit(1).next();
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      await categories.insertOne({
        _id: new ObjectId(),
        slug: attempt === 1 ? base : `${base}-${attempt}`,
        name,
        order: (last?.order ?? 0) + 1,
        createdAt: new Date(),
      });
      return { ok: true };
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }
  return { ok: false, message: "Bu adla bir kategori zaten var." };
}

export async function renameCategory(id: string, name: string): Promise<CategoryResult> {
  const problem = checkName(name);
  if (problem) return { ok: false, message: problem };
  if (!ObjectId.isValid(id)) return { ok: false, message: "Kategori bulunamadı." };
  const result = await (await categoriesOf()).updateOne({ _id: new ObjectId(id) }, { $set: { name } });
  return result.matchedCount === 1 ? { ok: true } : { ok: false, message: "Kategori bulunamadı." };
}

// Sırada bir yukarı/aşağı: komşusuyla yer değiştirir.
export async function moveCategory(id: string, direction: "up" | "down"): Promise<void> {
  const list = await (await categoriesOf()).find().sort({ order: 1, name: 1 }).toArray();
  const index = list.findIndex((item) => item._id.toHexString() === id);
  const other = list[direction === "up" ? index - 1 : index + 1];
  if (index < 0 || !other) return;
  const categories = await categoriesOf();
  // Sıra numaraları eşit/boşluklu olabilir: önce hepsi 1..n yapılır, sonra ikisi yer değiştirir.
  const order = list.map((item) => item._id.toHexString());
  [order[index], order[direction === "up" ? index - 1 : index + 1]] = [order[direction === "up" ? index - 1 : index + 1], order[index]];
  await categories.bulkWrite(order.map((itemId, i) => ({ updateOne: { filter: { _id: new ObjectId(itemId) }, update: { $set: { order: i + 1 } } } })));
}

// Kategoriyi siler; ürünlerden kategori bağı kalkar (ürünler silinmez).
export async function deleteCategory(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const removed = await (await categoriesOf()).findOneAndDelete({ _id: new ObjectId(id) });
  if (removed) await (await getDb()).collection("products").updateMany({ category: removed.slug }, { $unset: { category: "" } });
}

// Mağaza: kategorideki yayındaki ürünler.
export async function productsInCategory(slug: string): Promise<Product[]> {
  return (await getProducts()).filter((product) => product.category === slug);
}

// ---------- Vitrinler ----------

export async function showcaseSlugs(key: ShowcaseKey): Promise<string[]> {
  const doc = await (await showcasesOf()).findOne({ _id: key });
  return doc?.slugs ?? [];
}

// Mağaza: vitrindeki yayındaki ürünler, yöneticinin sırasıyla (silinmiş ya da taslak ürünler atlanır).
export const showcaseProducts = cache(async (key: ShowcaseKey): Promise<Product[]> => {
  const slugs = await showcaseSlugs(key);
  if (slugs.length === 0) return [];
  const products = await getProductsBySlugs(slugs);
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  return slugs.map((slug) => bySlug.get(slug)).filter((product): product is Product => Boolean(product));
});

export type ShowcaseResult = { ok: true } | { ok: false; message: string };

// Ürünü vitrinin sonuna ekler (zaten varsa ya da vitrin doluysa eklemez). Ürün veritabanında olmalı.
export async function addToShowcase(key: ShowcaseKey, slug: string): Promise<ShowcaseResult> {
  const exists = await (await getDb()).collection("products").countDocuments({ slug }, { limit: 1 });
  if (!exists) return { ok: false, message: "Ürün bulunamadı." };
  const result = await (await showcasesOf()).updateOne(
    { _id: key, slugs: { $ne: slug }, [`slugs.${SHOWCASE_MAX - 1}`]: { $exists: false } },
    { $push: { slugs: slug }, $set: { updatedAt: new Date() } },
    { upsert: false },
  );
  if (result.matchedCount === 1) return { ok: true };
  const doc = await (await showcasesOf()).findOne({ _id: key });
  if (!doc) {
    await (await showcasesOf()).insertOne({ _id: key, slugs: [slug], updatedAt: new Date() });
    return { ok: true };
  }
  if (doc.slugs.includes(slug)) return { ok: false, message: "Ürün zaten bu vitrinde." };
  return { ok: false, message: `Bir vitrinde en çok ${SHOWCASE_MAX} ürün olabilir.` };
}

export async function removeFromShowcase(key: ShowcaseKey, slug: string): Promise<void> {
  await (await showcasesOf()).updateOne({ _id: key }, { $pull: { slugs: slug }, $set: { updatedAt: new Date() } });
}

export async function moveInShowcase(key: ShowcaseKey, slug: string, direction: "up" | "down"): Promise<void> {
  const slugs = await showcaseSlugs(key);
  const index = slugs.indexOf(slug);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= slugs.length) return;
  [slugs[index], slugs[target]] = [slugs[target], slugs[index]];
  await (await showcasesOf()).updateOne({ _id: key }, { $set: { slugs, updatedAt: new Date() } });
}
