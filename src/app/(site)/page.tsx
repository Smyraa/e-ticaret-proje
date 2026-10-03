import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { mediaUrl } from "@/lib/media";
import { getProducts, type Product } from "@/lib/products";
import { getSiteSettings, type SiteSettings } from "@/lib/settings";

// Ürünler her istekte MongoDB'den okunur.
export const dynamic = "force-dynamic";

// Ana sayfada gösterilen ürün sayısı; tamamı koleksiyon sayfasında.
const FEATURED_COUNT = 4;

async function loadProducts(): Promise<{ products: Product[]; failed: boolean }> {
  try {
    return { products: await getProducts(), failed: false };
  } catch (error) {
    console.error("Ürünler okunamadı", error);
    return { products: [], failed: true };
  }
}

// Ayarlar okunamazsa sayfa yine açılır; ana sayfa görseli yerine yer tutucu gösterilir.
async function loadSettings(): Promise<SiteSettings> {
  try {
    return await getSiteSettings();
  } catch (error) {
    console.error("Site ayarları okunamadı", error);
    return {};
  }
}

export default async function Home() {
  const [{ products, failed }, settings] = await Promise.all([loadProducts(), loadSettings()]);

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2">
        <div className="space-y-6">
          <h1 className="font-display text-5xl leading-tight">
            Detayında zanaat,
            <br />
            <span className="text-primary italic">duruşunda zarafet.</span>
          </h1>
          <p className="max-w-md text-muted">Tesbih koleksiyonumuzu keşfedin.</p>
          <Link
            href="/koleksiyon"
            className="inline-flex min-h-11 items-center bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
          >
            Koleksiyonu gör
          </Link>
        </div>
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-gradient-to-br from-sand to-soft">
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
      </section>

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
