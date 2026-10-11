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
  price: number; // TL (satış fiyatı: sepette ve ödemede kullanılan)
  oldPrice: number | null; // indirim öncesi fiyat (üstü çizili gösterilir); yalnız satış fiyatından yüksekse, yoksa null
  stock: number;
  barcode: string; // ürün başına tek barkod (bkz. barcode.ts); eski kayıtlarda henüz yoksa ""
  category: string; // kategorinin adresi (bkz. catalog.ts); yoksa ""
  sample: boolean; // örnek (temsili) içerik
  published: boolean; // yayında: sitede görünür; değilse taslak (yalnız yönetimde görünür)
};

// Veritabanındaki belge. Eski kayıtlarda published alanı yoktur; yoksa yayında sayılır.
export type ProductDoc = Omit<Product, "published" | "barcode" | "category" | "oldPrice"> & {
  published?: boolean;
  barcode?: string;
  category?: string;
  oldPrice?: number | null;
};

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
  oldPrice: typeof doc.oldPrice === "number" && doc.oldPrice > doc.price ? doc.oldPrice : null,
  stock: doc.stock,
  barcode: doc.barcode ?? "",
  category: doc.category ?? "",
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

// Verilen adreslerdeki YAYINDAKİ ürünler. Sipariş verilirken sepetin içeriği sunucuda bununla yeniden okunur
// (adresler çağıranda doğrulanmış metinlerdir).
export async function getProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0) return [];
  const db = await getDb();
  const docs = await db
    .collection<ProductDoc>("products")
    .find({ slug: { $in: slugs }, ...PUBLISHED }, { projection: { _id: 0 } })
    .toArray();
  return docs.map(toProduct);
}

export type ProductFilter = {
  q?: string; // arama metni (ad ve malzeme içinde aranır)
  material?: string; // tam eşleşen malzeme
  sort?: string; // "fiyat-artan" | "fiyat-azalan" | boş (varsayılan sıra)
  min?: number | null; // en düşük fiyat (TL, dahil)
  max?: number | null; // en yüksek fiyat (TL, dahil)
  sale?: boolean; // yalnız indirimdekiler (eski fiyatı olanlar)
};

// Ürün sayısı az olduğundan arama/filtre/sıralama uygulamada yapılır; ürünler çok artarsa veritabanı sorgusuna taşınır.
export function filterProducts(
  products: Product[],
  { q, material, sort, min, max, sale }: ProductFilter,
): Product[] {
  const query = fold((q ?? "").trim());
  const result = products.filter((product) => {
    if (material && product.material !== material) return false;
    if (min != null && product.price < min) return false;
    if (max != null && product.price > max) return false;
    if (sale && product.oldPrice === null) return false;
    return !query || fold(`${product.name} ${product.material}`).includes(query);
  });
  if (sort === "fiyat-artan") result.sort((a, b) => a.price - b.price);
  if (sort === "fiyat-azalan") result.sort((a, b) => b.price - a.price);
  return result;
}

// Adres çubuğundaki filtre değerleri (?q=&malzeme=&sirala=&en-az=&en-cok=&indirim=1). Sayfalar ve filtre formu bunu kullanır.
// Fiyatlar yalnız rakam (en çok 8 hane) kabul edilir; okunamayan değer yok sayılır (boş görünür).
export type FilterValues = { q: string; material: string; sort: string; min: string; max: string; sale: boolean };
type Params = Record<string, string | string[] | undefined>;
const firstParam = (value: string | string[] | undefined) => ((Array.isArray(value) ? value[0] : value) ?? "").slice(0, 100);
const priceParam = (value: string) => {
  const digits = value.replace(/[\s.]/g, "");
  return /^\d{1,8}$/.test(digits) ? digits : "";
};

export function readFilterParams(params: Params): { values: FilterValues; filter: ProductFilter; active: boolean } {
  const values: FilterValues = {
    q: firstParam(params.q),
    material: firstParam(params.malzeme),
    sort: ["fiyat-artan", "fiyat-azalan"].includes(firstParam(params.sirala)) ? firstParam(params.sirala) : "",
    min: priceParam(firstParam(params["en-az"])),
    max: priceParam(firstParam(params["en-cok"])),
    sale: firstParam(params.indirim) === "1",
  };
  return {
    values,
    filter: {
      q: values.q,
      material: values.material,
      sort: values.sort,
      min: values.min ? Number(values.min) : null,
      max: values.max ? Number(values.max) : null,
      sale: values.sale,
    },
    active: Boolean(values.q.trim() || values.material || values.sort || values.min || values.max || values.sale),
  };
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
