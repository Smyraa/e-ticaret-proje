import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowBubble, GoldOrnament } from "@/components/gold-ornament";
import { ProductCard } from "@/components/product-card";
import { ProductRail } from "@/components/product-rail";
import { Stars } from "@/components/stars";
import { TrustStrip } from "@/components/trust-strip";
import { listCategories, SHOWCASES, showcaseProducts, type Category } from "@/lib/catalog";
import { mediaUrl } from "@/lib/media";
import { getProducts, type Product } from "@/lib/products";
import { latestApprovedReviews, type Review } from "@/lib/reviews";
import { getSiteSettings } from "@/lib/settings";

// Ürünler her istekte MongoDB'den okunur.
export const dynamic = "force-dynamic";

// Ana sayfada gösterilen ürün sayısı; tamamı koleksiyon sayfasında.
const FEATURED_COUNT = 4;

// Halı zemini üzerindeki saydam (koyu cam) panel. Yazı açık renktir; koyu zemin + bulanıklık, arkadaki açık halı motiflerinin
// yazıyı zayıflatmasını önler. ProductRail de aynı paneli kullanır.
const glass =
  "rounded-2xl bg-espresso/50 shadow-lg shadow-black/30 ring-1 ring-gold-light/50 backdrop-blur-[3px] [text-shadow:0_1px_3px_rgb(0_0_0/0.85)]";

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div>
      <h2 id={id} className="font-display text-2xl text-paper sm:text-3xl">
        {children}
      </h2>
      <GoldOrnament className="mt-2" />
    </div>
  );
}

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

// Yorumlar okunamazsa bölüm görünmez.
async function loadReviews(): Promise<Review[]> {
  try {
    return await latestApprovedReviews(6);
  } catch (error) {
    console.error("Yorumlar okunamadı", error);
    return [];
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
  const [{ products, failed }, settings, { categories, campaigns, bestSellers }, reviews] = await Promise.all([
    loadProducts(),
    getSiteSettings(),
    loadCatalog(),
    loadReviews(),
  ]);

  return (
    // Halı zemini ortak çerçevede (CarpetBackground); ana sayfa bölümleri onun üzerinde saydam panellerdir.
    <div className="pb-12 text-paper [&_:focus-visible]:outline-gold-light">

      {deleted && (
        <p role="status" className="mx-auto max-w-6xl px-4 pt-6 text-sm sm:px-6">
          <span className="block rounded-md bg-paper p-4 text-ink">Hesabınız ve kayıtlı bilgileriniz silindi.</span>
        </p>
      )}

      <section>
        {/* Telefonda önce fotoğraf (daha basık), metin paneli fotoğrafın altına biraz biner; geniş ekranda yan yana. */}
        <div className="mx-auto grid max-w-6xl items-center px-3 pt-4 pb-2 sm:px-6 md:grid-cols-2 md:gap-10 md:py-20">
          <div className={`relative z-10 mx-3 -mt-16 space-y-4 p-5 sm:mx-6 sm:space-y-6 sm:p-8 md:mx-0 md:mt-0 ${glass}`}>
            <p className="text-xs font-semibold tracking-[0.3em] text-gold-light uppercase">El işçiliği tesbihler</p>
            <h1 className="font-display text-3xl leading-tight sm:text-5xl">
              Detayında zanaat,
              <br />
              <span className="text-gold-light italic">duruşunda zarafet.</span>
            </h1>
            <GoldOrnament />
            <p className="max-w-md text-paper/85">Tesbih koleksiyonumuzu keşfedin.</p>
            <Link
              href="/koleksiyon"
              className="group inline-flex min-h-11 items-center gap-3 rounded-md border border-gold-light/80 bg-bordo py-1.5 pr-1.5 pl-7 text-xs font-semibold tracking-widest text-paper uppercase shadow-lg shadow-black/30 transition duration-300 hover:border-gold-light hover:bg-[#5c1825] hover:text-gold-light hover:shadow-[0_0_24px_-4px_rgba(220,189,106,0.55)]"
            >
              Koleksiyonu gör
              {/* Dolu gold yuvarlak içinde koyu ok: zemin değişse de hep görünür; üzerine gelince sağa kayar. */}
              <span
                aria-hidden="true"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold-light text-espresso transition duration-300 motion-safe:group-hover:translate-x-1"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          </div>
          <div className="relative order-first aspect-[4/3] overflow-hidden rounded-xl md:order-none md:aspect-[4/5] bg-gradient-to-br from-sand to-soft shadow-lg shadow-black/40 ring-2 ring-gold-light/70">
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
              <span className="absolute inset-0 flex items-center justify-center text-sm text-ink [text-shadow:none]">
                Fotoğraf yakında
              </span>
            )}
            {/* İç gold çerçeve */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-lg border border-gold-light/70" />
          </div>
        </div>
      </section>

      <TrustStrip />

      {categories.length > 0 && (
        <section aria-labelledby="kategoriler" className="reveal pt-6 sm:pt-10">
          <div className="mx-auto max-w-6xl px-3 sm:px-6">
            <div className={`p-4 sm:p-8 ${glass}`}>
              <SectionTitle id="kategoriler">Kategoriler</SectionTitle>
              {/* Üzerine gelince kutu hafifçe yükselir, kenarı gold parlar, ok sağa kayar (hareket azaltma tercihinde kıpırdamaz). */}
              <ul className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3 lg:grid-cols-3">
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/kategori/${category.slug}`}
                      className="group flex min-h-14 items-center gap-2 rounded-xl border border-gold-light/35 bg-paper/5 px-3 py-2 sm:min-h-16 sm:gap-3 sm:px-4 sm:py-3 transition duration-300 hover:border-gold-light hover:bg-paper/10 hover:shadow-[0_10px_30px_-10px_rgba(220,189,106,0.55)] motion-safe:hover:-translate-y-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 10 10" aria-hidden="true" className="shrink-0 text-gold-light">
                        <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" />
                      </svg>
                      <span className="flex-1 font-display text-base leading-tight sm:text-xl">{category.name}</span>
                      <span className="hidden sm:block">
                        <ArrowBubble />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {campaigns.length > 0 && (
        <ProductRail id="vitrin-kampanyalar" title={SHOWCASES.kampanyalar.title} href={SHOWCASES.kampanyalar.path} accent>
          {campaigns.map((product) => (
            <li key={product.slug} className="w-[46%] shrink-0 snap-start sm:w-[45%] lg:w-[23%]">
              <ProductCard product={product} tone="dark" />
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
            <li key={product.slug} className="w-[46%] shrink-0 snap-start sm:w-[45%] lg:w-[23%]">
              <ProductCard product={product} tone="dark" />
            </li>
          ))}
        </ProductRail>
      )}

      {reviews.length > 0 && (
        <section aria-labelledby="yorumlar" className="reveal pt-6 sm:pt-10">
          <div className="mx-auto max-w-6xl px-3 sm:px-6">
            <div className={`p-4 sm:p-8 ${glass}`}>
              <SectionTitle id="yorumlar">Müşterilerimiz ne diyor</SectionTitle>
              <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {reviews.map((review) => (
                  <li key={review.id} className="flex flex-col rounded-xl border border-gold-light/30 bg-paper/10 p-4 sm:p-5">
                    <Stars rating={review.rating} />
                    <blockquote className="mt-3 line-clamp-5 flex-1 font-display text-lg leading-snug break-words">
                      “{review.text}”
                    </blockquote>
                    <p className="mt-4 text-xs text-paper/80">
                      <span className="font-semibold text-paper">{review.authorName}</span> ·{" "}
                      <Link href={`/urun/${review.slug}#degerlendirmeler`} className="underline decoration-gold-light/60 underline-offset-4 transition hover:text-gold-light">
                        {review.productName}
                      </Link>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section id="koleksiyon" aria-labelledby="koleksiyon-baslik" className="reveal pt-6 sm:pt-10">
        <div className="mx-auto max-w-6xl px-3 sm:px-6">
          <div className={`p-4 sm:p-8 ${glass}`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionTitle id="koleksiyon-baslik">Koleksiyon</SectionTitle>
              <Link
                href="/koleksiyon"
                className="group inline-flex min-h-11 items-center gap-3 text-xs font-semibold tracking-widest uppercase transition hover:text-gold-light"
              >
                Tümünü gör
                <ArrowBubble />
              </Link>
            </div>

            {failed ? (
              <p className="mt-8 rounded-md bg-paper p-4 text-sm text-muted [text-shadow:none]">
                Ürünler şu an yüklenemedi. Yerel MongoDB çalışıyor mu? (127.0.0.1:27017)
              </p>
            ) : products.length === 0 ? (
              <p className="mt-8 rounded-md bg-paper p-4 text-sm text-muted [text-shadow:none]">
                Henüz ürün yok. Örnek ürünleri eklemek için <code>npm run seed</code> çalıştırın.
              </p>
            ) : (
              <ul className="mt-5 grid grid-cols-2 sm:mt-8 gap-3 sm:gap-6 lg:grid-cols-4">
                {products.slice(0, FEATURED_COUNT).map((product) => (
                  <li key={product.slug}>
                    <ProductCard product={product} tone="dark" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
