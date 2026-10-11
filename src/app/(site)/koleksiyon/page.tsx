import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { pageMetadata } from "@/lib/metadata";
import { ProductFilterForm } from "@/components/product-filter-form";
import { filterProducts, getProducts, materialsOf, readFilterParams, type Product } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata(
  "Koleksiyon",
  "Tesbih koleksiyonunu arayın; malzemeye, fiyata ve indirime göre süzün, fiyata göre sıralayın. Demo sürümü: ürünler örnek içeriktir.",
);

// İlk satırdaki kartlar ekranın üstünde olduğundan görselleri tembel yüklenmez.
const FIRST_ROW = 4;

export default async function CollectionPage({
  searchParams,
}: PageProps<"/koleksiyon">) {
  const { values, filter, active: isFiltered } = readFilterParams(await searchParams);

  let all: Product[] = [];
  let failed = false;
  try {
    all = await getProducts();
  } catch (error) {
    console.error("Ürünler okunamadı", error);
    failed = true;
  }

  const products = filterProducts(all, filter);
  const materials = materialsOf(all);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-4xl">Koleksiyon</h1>

      <ProductFilterForm action="/koleksiyon" values={values} materials={materials} />

      {failed ? (
        <p className="mt-8 rounded-md bg-soft p-4 text-sm text-muted">
          Ürünler şu an yüklenemedi. Yerel MongoDB çalışıyor mu? (127.0.0.1:27017)
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted">
            {products.length} ürün
            {isFiltered && (
              <>
                {" · "}
                <Link href="/koleksiyon" className="underline transition hover:text-primary">
                  Filtreleri temizle
                </Link>
              </>
            )}
          </p>

          {products.length === 0 ? (
            <p className="mt-8 rounded-md bg-soft p-6 text-sm text-muted">
              Aramanıza uygun ürün bulunamadı. Başka bir kelime deneyin ya da filtreleri
              temizleyin.
            </p>
          ) : (
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product, index) => (
                <li key={product.slug} className="reveal">
                  <ProductCard product={product} eager={index < FIRST_ROW} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
