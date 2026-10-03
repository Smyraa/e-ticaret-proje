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
  published: boolean; // yayında: sitede görünür; değilse taslak (yalnız yönetimde görünür)
};

// Veritabanındaki belge. Eski kayıtlarda published alanı yoktur; yoksa yayında sayılır.
export type ProductDoc = Omit<Product, "published"> & { published?: boolean };

// Belgeden yalnız bilinen alanlar alınır (tarihler gibi iç alanlar sayfalara ve tarayıcıya gitmez).
export const toProduct = (doc: ProductDoc): Product => ({
  slug: doc.slug,
  name: doc.name,
  material: doc.material,
  size: doc.size ?? "",
  weight: doc.weight ?? "",
  craft: doc.craft ?? "",
  story: doc.story ?? "",
  images: doc.images ?? [],
  price: doc.price,
  stock: doc.stock,
  sample: doc.sample === true,
  published: doc.published !== false,
});

// Sitede görünecek ürünlerin süzgeci. Taslaklar yalnız yönetim sayfalarında (products-admin.ts) okunur.
const PUBLISHED = { published: { $ne: false } };

// Türkçe sıralama (Ç, Ö, Ş, Ü ve ı doğru yerde); büyük/küçük harf fark etmez.
export const NAME_COLLATION = { locale: "tr", strength: 2 } as const;

export async function getProducts(): Promise<Product[]> {
  const db = await getDb();
  const docs = await db
    .collection<ProductDoc>("products")
    .find(PUBLISHED, { projection: { _id: 0 } })
    .sort({ name: 1 })
    .collation(NAME_COLLATION)
    .toArray();
  return docs.map(toProduct);
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
  const doc = await db
    .collection<ProductDoc>("products")
    .findOne({ slug, ...PUBLISHED }, { projection: { _id: 0 } });
  return doc ? toProduct(doc) : null;
});
