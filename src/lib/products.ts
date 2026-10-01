import { cache } from "react";
import { getDb } from "./mongodb";
import { fold } from "./text";

export type Product = {
  slug: string;
  name: string;
  material: string;
  size: string; // ör. "8 mm tane · 33 tane"
  weight: string; // ör. "42 g"
  craft: string; // işçilik bilgisi
  story: string; // zanaat / koleksiyon hikâyesi
  images: string[]; // media/ klasöründeki dosya adları (ilki ana görsel)
  price: number; // TL
  stock: number;
  sample: boolean; // örnek (temsili) içerik
};

export async function getProducts(): Promise<Product[]> {
  const db = await getDb();
  const products = await db
    .collection<Product>("products")
    .find({}, { projection: { _id: 0 } })
    .sort({ name: 1 })
    .toArray();
  return products;
}

export type ProductFilter = {
  q?: string; // arama metni (ad ve malzeme içinde aranır)
  material?: string; // tam eşleşen malzeme
  sort?: string; // "fiyat-artan" | "fiyat-azalan" | boş (varsayılan sıra)
};

// Ürün sayısı az olduğundan arama/filtre/sıralama uygulamada yapılır; ürünler çok artarsa veritabanı sorgusuna taşınır.
export function filterProducts(
  products: Product[],
  { q, material, sort }: ProductFilter,
): Product[] {
  const query = fold((q ?? "").trim());
  const result = products.filter((product) => {
    if (material && product.material !== material) return false;
    return !query || fold(`${product.name} ${product.material}`).includes(query);
  });
  if (sort === "fiyat-artan") result.sort((a, b) => a.price - b.price);
  if (sort === "fiyat-azalan") result.sort((a, b) => b.price - a.price);
  return result;
}

// Filtre seçeneği olarak gösterilecek benzersiz malzemeler (Türkçe sıralı).
export function materialsOf(products: Product[]): string[] {
  return [...new Set(products.map((product) => product.material))].sort((a, b) =>
    a.localeCompare(b, "tr"),
  );
}

// cache(): aynı istek içinde (sayfa + başlık) tekrar sorgulanmasın.
export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const db = await getDb();
  return db.collection<Product>("products").findOne({ slug }, { projection: { _id: 0 } });
});
