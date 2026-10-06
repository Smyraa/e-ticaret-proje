import "server-only";
import { internalBarcode } from "./barcode";
import { getDb } from "./mongodb";
import { IMAGE_LIMITS } from "./images";
import type { ProductData } from "./product-form";
import { NAME_COLLATION, toProduct, type Product, type ProductDoc } from "./products";
import { slugify } from "./slug";

// Yönetim tarafı: taslaklar dahil tüm ürünler. Mağaza sayfalarında KULLANILMAZ (orada products.ts var,
// yalnız yayındakileri okur). Bu dosyadaki her işlev yalnız requireAdmin() geçmiş yerlerden çağrılmalı.

type StoredProduct = ProductDoc & { createdAt?: Date; updatedAt?: Date };

const productsOf = async () => (await getDb()).collection<StoredProduct>("products");

// Barkod iki üründe aynı olamaz (yalnız barkodu olan ürünler dizine girer). Adres de benzersizdir.
let indexesReady: Promise<void> | undefined;
function ensureIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    const products = await productsOf();
    await Promise.all([
      products.createIndex({ slug: 1 }, { unique: true }),
      products.createIndex({ barcode: 1 }, { unique: true, partialFilterExpression: { barcode: { $type: "string" } } }),
    ]);
  })().catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  return indexesReady;
}

// Barkod başka bir üründe kayıtlı (yönetim formunda barkod kutusunun hatası olarak gösterilir).
export class BarcodeTakenError extends Error {}
const isDuplicate = (error: unknown, field: string) =>
  (error as { code?: number }).code === 11000 && Boolean((error as { keyPattern?: Record<string, unknown> }).keyPattern?.[field]);

// Sistemin üreteceği sıradaki barkod. Sıra sayacı tek adımda artar (aynı anda iki ürün aynı kodu alamaz).
async function nextBarcode(): Promise<string> {
  const counters = (await getDb()).collection<{ _id: string; seq: number }>("counters");
  const counter = await counters.findOneAndUpdate(
    { _id: "barcode" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return internalBarcode(counter?.seq ?? 1);
}

// Barkodu olmayan (eski) ürünlere barkod verir. Yönetimde ürün listesi ve stok sayfası açılınca çağrılır; hepsinde
// barkod varsa tek bir sorgudan ibarettir.
export async function ensureBarcodes(): Promise<void> {
  await ensureIndexes();
  const products = await productsOf();
  const missing = await products.find({ barcode: { $not: { $type: "string" } } }, { projection: { slug: 1 } }).toArray();
  for (const { slug } of missing) {
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await products.updateOne({ slug, barcode: { $not: { $type: "string" } } }, { $set: { barcode: await nextBarcode() } });
        break;
      } catch (error) {
        if (!isDuplicate(error, "barcode")) throw error; // elle yazılmış bir kodla çakıştı: sıradakini dene
      }
    }
  }
}

export async function getAllProducts(): Promise<Product[]> {
  const docs = await (await productsOf())
    .find({}, { projection: { _id: 0 } })
    .sort({ name: 1 })
    .collation(NAME_COLLATION)
    .toArray();
  return docs.map(toProduct);
}

export async function getProductForAdmin(slug: string): Promise<Product | null> {
  const doc = await (await productsOf()).findOne({ slug }, { projection: { _id: 0 } });
  return doc ? toProduct(doc) : null;
}

// Forma malzeme önerisi olarak gösterilecek, kayıtlı malzemeler (Türkçe sıralı).
export async function listMaterials(): Promise<string[]> {
  const materials = await (await productsOf()).distinct("material");
  return materials.sort((a, b) => a.localeCompare(b, "tr"));
}

// /yonetim/urunler/yeni "yeni ürün" sayfasıdır; bir ürünün adresi bu olamaz.
const RESERVED_SLUGS = new Set(["yeni"]);
const MAX_SLUG_TRIES = 50;

// Yeni ürünü ekler ve adresini (slug) döndürür. Adres addan üretilir; aynısı varsa -2, -3 ... eklenir.
// Benzersizliği veritabanı sağlar (slug üzerinde benzersiz dizin), böylece aynı anda iki kayıt çakışmaz.
export async function insertProduct(data: ProductData): Promise<string> {
  await ensureIndexes();
  const products = await productsOf();
  let barcode = data.barcode || (await nextBarcode());
  let barcodeTries = 0;

  const base = slugify(data.name);
  const now = new Date();
  for (let attempt = 1; attempt <= MAX_SLUG_TRIES; attempt++) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`;
    if (RESERVED_SLUGS.has(slug)) continue;
    try {
      await products.insertOne({ ...data, barcode, slug, images: [], sample: false, createdAt: now, updatedAt: now });
      return slug;
    } catch (error) {
      if (isDuplicate(error, "barcode")) {
        if (data.barcode) throw new BarcodeTakenError(); // elle yazılan kod başka üründe
        if (++barcodeTries > 5) throw error;
        barcode = await nextBarcode(); // üretilen kod elle yazılmış bir kodla çakıştı: sıradaki
        attempt -= 1; // aynı adresle yeniden dene
        continue;
      }
      if ((error as { code?: number }).code !== 11000) throw error; // 11000: bu adres zaten var
    }
  }
  throw new Error("Benzersiz ürün adresi üretilemedi");
}

// Ürünün bilgilerini günceller; adres (slug), görseller ve oluşturulma tarihi değişmez.
// Ürün bulunamazsa false döner.
// Barkod kutusu boşaltıldıysa yeni kod üretilir. Barkod başka üründeyse BarcodeTakenError fırlatır.
export async function updateProduct(slug: string, data: ProductData, sample: boolean): Promise<boolean> {
  await ensureIndexes();
  const products = await productsOf();
  const barcode = data.barcode || (await nextBarcode());
  try {
    const result = await products.updateOne({ slug }, { $set: { ...data, barcode, sample, updatedAt: new Date() } });
    return result.matchedCount === 1;
  } catch (error) {
    if (isDuplicate(error, "barcode")) throw new BarcodeTakenError();
    throw error;
  }
}

export type AddImageResult = "added" | "duplicate" | "full" | "missing";

// Görsel adını ürünün listesinin sonuna ekler. Sınır ve tekrar denetimi tek sorguda yapılır (aynı anda iki yükleme
// sınırı aşamaz). Sonuç neden eklenmediğini söyler.
export async function addProductImage(slug: string, name: string): Promise<AddImageResult> {
  const products = await productsOf();
  const result = await products.updateOne(
    {
      slug,
      images: { $ne: name },
      $expr: { $lt: [{ $size: { $ifNull: ["$images", []] } }, IMAGE_LIMITS.maxCount] },
    },
    { $push: { images: name }, $set: { updatedAt: new Date() } },
  );
  if (result.modifiedCount === 1) return "added";

  const doc = await products.findOne({ slug }, { projection: { images: 1 } });
  if (!doc) return "missing";
  return doc.images?.includes(name) ? "duplicate" : "full";
}

export type MoveImageOp = "up" | "down" | "main";

// Görseli listede bir yukarı/aşağı kaydırır ya da başa alır (ilk görsel ana görseldir).
// Görsel üründe yoksa ya da liste bu sırada başka yerden değiştiyse false döner.
export async function moveProductImage(slug: string, name: string, op: MoveImageOp): Promise<boolean> {
  const products = await productsOf();
  const doc = await products.findOne({ slug }, { projection: { images: 1 } });
  const images = doc?.images ?? [];

  const from = images.indexOf(name);
  if (from === -1) return false;
  const to = op === "up" ? from - 1 : op === "down" ? from + 1 : 0;
  if (to < 0 || to >= images.length || to === from) return true; // zaten orada

  const next = [...images];
  next.splice(from, 1);
  next.splice(to, 0, name);
  // Süzgeçteki dizi tam eşleşmeli: okuma ile yazma arasında liste değiştiyse hiçbir şey yazılmaz.
  const result = await products.updateOne({ slug, images }, { $set: { images: next, updatedAt: new Date() } });
  return result.matchedCount === 1;
}

// Görseli üründen çıkarır. unused: dosya başka hiçbir üründe kullanılmıyor, yani diskten silinebilir.
export async function removeProductImage(slug: string, name: string): Promise<{ removed: boolean; unused: boolean }> {
  const products = await productsOf();
  const result = await products.updateOne(
    { slug, images: name },
    { $pull: { images: name }, $set: { updatedAt: new Date() } },
  );
  if (result.modifiedCount !== 1) return { removed: false, unused: false };
  return { removed: true, unused: (await unusedImages([name])).length === 1 };
}

// Verilen görsel adlarından, artık ne bir üründe ne de bir siparişte kullanılanlar (diskten silinebilir).
// Siparişler ürün görselini anlık kopya olarak tutar: ürün silinse de sipariş sayfası görseli gösterebilsin.
export async function unusedImages(names: string[]): Promise<string[]> {
  if (names.length === 0) return [];
  const products = await productsOf();
  const orders = (await getDb()).collection<{ items?: { image?: string | null }[] }>("orders");
  const [inProducts, inOrders] = await Promise.all([
    products.find({ images: { $in: names } }, { projection: { images: 1 } }).toArray(),
    orders.find({ "items.image": { $in: names } }, { projection: { "items.image": 1 } }).toArray(),
  ]);
  const stillUsed = new Set([
    ...inProducts.flatMap((doc) => doc.images ?? []),
    ...inOrders.flatMap((doc) => (doc.items ?? []).map((item) => item.image ?? "")),
  ]);
  return names.filter((name) => !stillUsed.has(name));
}

// Ürünü kalıcı olarak siler. unusedImages: başka üründe kullanılmayan, diskten de silinecek görsel dosyaları.
// Ürün zaten yoksa deleted false döner.
export async function deleteProduct(slug: string): Promise<{ deleted: boolean; unusedImages: string[] }> {
  const products = await productsOf();
  const doc = await products.findOneAndDelete({ slug }, { projection: { images: 1 } });
  if (!doc) return { deleted: false, unusedImages: [] };
  return { deleted: true, unusedImages: await unusedImages(doc.images ?? []) };
}

// Örnek (demo) işaretli TÜM ürünleri siler; gerçek ürünlere dokunmaz.
export async function deleteSampleProducts(): Promise<{ count: number; unusedImages: string[] }> {
  const products = await productsOf();
  const samples = await products.find({ sample: true }, { projection: { slug: 1, images: 1 } }).toArray();
  if (samples.length === 0) return { count: 0, unusedImages: [] };

  const result = await products.deleteMany({ slug: { $in: samples.map((doc) => doc.slug) }, sample: true });
  const names = [...new Set(samples.flatMap((doc) => doc.images ?? []))];
  return { count: result.deletedCount, unusedImages: await unusedImages(names) };
}
