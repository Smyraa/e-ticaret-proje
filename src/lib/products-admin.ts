import "server-only";
import { getDb } from "./mongodb";
import type { ProductData } from "./product-form";
import { NAME_COLLATION, toProduct, type Product, type ProductDoc } from "./products";
import { slugify } from "./slug";

// Yönetim tarafı: taslaklar dahil tüm ürünler. Mağaza sayfalarında KULLANILMAZ (orada products.ts var,
// yalnız yayındakileri okur). Bu dosyadaki her işlev yalnız requireAdmin() geçmiş yerlerden çağrılmalı.

type StoredProduct = ProductDoc & { createdAt?: Date; updatedAt?: Date };

const productsOf = async () => (await getDb()).collection<StoredProduct>("products");

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
  const products = await productsOf();
  await products.createIndex({ slug: 1 }, { unique: true });

  const base = slugify(data.name);
  const now = new Date();
  for (let attempt = 1; attempt <= MAX_SLUG_TRIES; attempt++) {
    const slug = attempt === 1 ? base : `${base}-${attempt}`;
    if (RESERVED_SLUGS.has(slug)) continue;
    try {
      await products.insertOne({ ...data, slug, images: [], sample: false, createdAt: now, updatedAt: now });
      return slug;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error; // 11000: bu adres zaten var
    }
  }
  throw new Error("Benzersiz ürün adresi üretilemedi");
}

// Ürünün bilgilerini günceller; adres (slug), görseller ve oluşturulma tarihi değişmez.
// Ürün bulunamazsa false döner.
export async function updateProduct(slug: string, data: ProductData, sample: boolean): Promise<boolean> {
  const products = await productsOf();
  const result = await products.updateOne({ slug }, { $set: { ...data, sample, updatedAt: new Date() } });
  return result.matchedCount === 1;
}
