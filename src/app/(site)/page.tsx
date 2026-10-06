import Image from "next/image";
import Link from "next/link";
import { KilimPattern } from "@/components/kilim-pattern";
import { ProductCard } from "@/components/product-card";
import { ProductRail } from "@/components/product-rail";
import { listCategories, SHOWCASES, showcaseProducts, type Category } from "@/lib/catalog";
import { mediaUrl } from "@/lib/media";
import { getProducts, type Product } from "@/lib/products";
import { getSiteSettings } from "@/lib/settings";

// Ürünler her istekte MongoDB'den okunur.
export const dynamic = "force-dynamic";

// Ana sayfada gösterilen ürün sayısı; tamamı koleksiyon sayfasında.
const FEATURED_COUNT = 4;

// Kategoriler ve vitrinler okunamazsa bölümleri görünmez; sayfa yine açılır.
async function loadCatalog(): Promise<{ categories: Category[]; campaigns: Product[]; bestSellers: Product[] }> {
  try {
    const [categories, campaigns, bestSellers] = await Promise.all([
      listCategories(),
      showcaseProducts("kampanyalar"),
      showcaseProducts("en-cok-satanlar"),
    ]);
    return { categories, campaigns, bestSellers };
  } catch (error) {
    console.error("Kategoriler ya da vitrinler okunamadı", error);
    return { categories: [], campaigns: [], bestSellers: [] };
  }
}

async function loadProducts(): Promise<{ products: Product[]; failed: boolean }> {
  try {
    return { products: await getProducts(), failed: false };
  } catch (error) {
    console.error("Ürünler okunamadı", error);
    return { products: [], failed: true };
  }
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const deleted = (await searchParams).hesap === "silindi"; // müşteri hesabını sildi
  // Ayarlar okunamazsa getSiteSettings varsayılanları döner; sayfa yine açılır, görsel yerine yer tutucu görünür.
  const [{ products, failed }, settings, { categories, campaigns, bestSellers }] = await Promise.all([
    loadProducts(),
    getSiteSettings(),
    loadCatalog(),
  ]);

  return (
    <>
      {deleted && (
        <p role="status" className="mx-auto mt-6 max-w-6xl px-6 text-sm">
          <span className="block rounded-md bg-soft p-4">Hesabınız ve kayıtlı bilgileriniz silindi.</span>
        </p>
      )}
      {/* Tanıtım alanı: sitenin desen kullanılan TEK yeri (silik kilim dokusu); metin düz zeminli bir panelde. */}
      <section className="relative overflow-hidden border-b border-gold/40 bg-soft">
        <KilimPattern className="opacity-[0.07]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 py-14 md:grid-cols-2 md:py-20">
          <div className="space-y-6 rounded-xl bg-paper/95 p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold tracking-[0.3em] text-gold-deep uppercase">El işçiliği tesbihler</p>
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">
              Detayında zanaat,
              <br />
              <span className="text-bordo italic">duruşunda zarafet.</span>
            </h1>
            <p className="max-w-md text-muted">Tesbih koleksiyonumuzu keşfedin.</p>
            <Link
              href="/koleksiyon"
              className="inline-flex min-h-11 items-center bg-bordo px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-espresso"
            >
              Koleksiyonu gör
            </Link>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gradient-to-br from-sand to-soft shadow-sm ring-1 ring-gold/40">
            {settings.heroImage ? (
              // Süs amaçlı çizim: ekran okuyucuya okunmaz (boş alt metin).
              <Image
                src={mediaUrl(settings.heroImage)}
                alt=""
                fill
                preload
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-sm text-ink">
                Fotoğraf yakında
              </span>
            )}
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section aria-labelledby="kategoriler" className="border-b border-line bg-paper">
          <div className="mx-auto max-w-6xl px-6 py-8">
            <h2 id="kategoriler" className="text-xs font-semibold tracking-[0.3em] text-muted uppercase">
              Kategoriler
            </h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/kategori/${category.slug}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-bordo/40 bg-soft px-5 text-sm font-semibold text-bordo transition hover:border-bordo hover:bg-bordo hover:text-paper"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="text-gold">
                      <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" />
                    </svg>
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {campaigns.length > 0 && (
        <ProductRail id="vitrin-kampanyalar" title={SHOWCASES.kampanyalar.title} href={SHOWCASES.kampanyalar.path} accent>
          {campaigns.map((product) => (
            <li key={product.slug} className="w-[72%] shrink-0 snap-start sm:w-[45%] lg:w-[23%]">
              <ProductCard product={product} />
            </li>
          ))}
        </ProductRail>
      )}

      {bestSellers.length > 0 && (
        <ProductRail
          id="vitrin-en-cok-satanlar"
          title={SHOWCASES["en-cok-satanlar"].title}
          href={SHOWCASES["en-cok-satanlar"].path}
        >
          {bestSellers.map((product) => (
            <li key={product.slug} className="w-[72%] shrink-0 snap-start sm:w-[45%] lg:w-[23%]">
              <ProductCard product={product} />
            </li>
          ))}
        </ProductRail>
      )}

      <section id="koleksiyon" className="bg-soft py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl">Koleksiyon</h2>
            <Link
              href="/koleksiyon"
              className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase transition hover:text-primary"
            >
              Tümünü gör →
            </Link>
          </div>

          {failed ? (
            <p className="mt-8 rounded-md bg-paper p-4 text-sm text-muted">
              Ürünler şu an yüklenemedi. Yerel MongoDB çalışıyor mu? (127.0.0.1:27017)
            </p>
          ) : products.length === 0 ? (
            <p className="mt-8 rounded-md bg-paper p-4 text-sm text-muted">
              Henüz ürün yok. Örnek ürünleri eklemek için <code>npm run seed</code> çalıştırın.
            </p>
          ) : (
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.slice(0, FEATURED_COUNT).map((product) => (
                <li key={product.slug}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
