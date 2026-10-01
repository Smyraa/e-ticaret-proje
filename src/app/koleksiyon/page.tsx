import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { pageMetadata } from "@/lib/metadata";
import {
  filterProducts,
  getProducts,
  materialsOf,
  type Product,
} from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata(
  "Koleksiyon",
  "Tesbih koleksiyonunu arayın, malzemeye göre süzün ve fiyata göre sıralayın. Demo sürümü: ürünler örnek içeriktir.",
);

const field =
  "w-full rounded-md border border-line bg-paper px-4 py-3 text-sm outline-none transition focus:border-primary";

// İlk satırdaki kartlar ekranın üstünde olduğundan görselleri tembel yüklenmez.
const FIRST_ROW = 4;

// Adres çubuğundaki değer tek ya da birden çok olabilir; ilkini al.
const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value) ?? "";

export default async function CollectionPage({
  searchParams,
}: PageProps<"/koleksiyon">) {
  const params = await searchParams;
  const q = first(params.q);
  const material = first(params.malzeme);
  const sort = first(params.sirala);

  let all: Product[] = [];
  let failed = false;
  try {
    all = await getProducts();
  } catch (error) {
    console.error("Ürünler okunamadı", error);
    failed = true;
  }

  const products = filterProducts(all, { q, material, sort });
  const materials = materialsOf(all);
  const isFiltered = Boolean(q.trim() || material || sort);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-4xl">Koleksiyon</h1>

      {/* Form adres çubuğuna yazar (?q=...&malzeme=...): sayfa paylaşılabilir, JavaScript gerekmez. */}
      <form
        action="/koleksiyon"
        className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]"
      >
        <label className="sr-only" htmlFor="q">
          Ara
        </label>
        <input
          id="q"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Ara (ör. kuka, kehribar)"
          className={`${field} scroll-mt-24`}
        />

        <label className="sr-only" htmlFor="malzeme">
          Malzeme
        </label>
        <select id="malzeme" name="malzeme" defaultValue={material} className={field}>
          <option value="">Tüm malzemeler</option>
          {materials.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="sirala">
          Sırala
        </label>
        <select id="sirala" name="sirala" defaultValue={sort} className={field}>
          <option value="">Önerilen sıra</option>
          <option value="fiyat-artan">Fiyat: düşükten yükseğe</option>
          <option value="fiyat-azalan">Fiyat: yüksekten düşüğe</option>
        </select>

        <button
          type="submit"
          className="bg-espresso px-8 py-3 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
        >
          Uygula
        </button>
      </form>

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
                <li key={product.slug}>
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
