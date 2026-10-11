import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductActions } from "@/components/product-actions";
import { ProductGallery } from "@/components/product-gallery";
import { PriceTag } from "@/components/price-tag";
import { ProductJsonLd } from "@/components/product-json-ld";
import { RecentlyViewed } from "@/components/recently-viewed";
import { Stars } from "@/components/stars";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { stockText } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { getProductBySlug, type Product } from "@/lib/products";
import { approvedReviews, type ProductReviews } from "@/lib/reviews";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/urun/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlug(slug);
    if (!product) return { title: "Ürün bulunamadı" };
    const sample = product.sample ? " Örnek ürün (demo)." : "";
    // Ölçü ve ağırlık isteğe bağlıdır; boşsa açıklamaya yazılmaz.
    const facts = [
      `Malzeme: ${product.material}.`,
      product.size && `Ölçü: ${product.size}.`,
      product.weight && `Ağırlık: ${product.weight}.`,
    ]
      .filter(Boolean)
      .join(" ");
    return pageMetadata(product.name, `${product.name}. ${facts}${sample}`);
  } catch {
    return { title: "TAURA Tesbihçilik" };
  }
}

export default async function ProductPage({ params }: PageProps<"/urun/[slug]">) {
  const { slug } = await params;

  let product: Product | null;
  try {
    product = await getProductBySlug(slug);
  } catch (error) {
    console.error("Ürün okunamadı", error);
    return (
      <p className="mx-auto max-w-6xl px-6 py-16 text-muted">
        Ürün şu an yüklenemedi. Yerel MongoDB çalışıyor mu? (127.0.0.1:27017)
      </p>
    );
  }
  if (!product) notFound();
  const { whatsapp } = await getSiteSettings();
  // Yalnız onaylı yorumlar. Okunamazsa bölüm boş görünür; sayfa yine açılır.
  const reviews: ProductReviews = await approvedReviews(product.slug).catch((error) => {
    console.error("Yorumlar okunamadı", error);
    return { reviews: [], count: 0, average: null };
  });
  const monthYear = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "Europe/Istanbul" });

  // Ölçü, ağırlık ve işçilik isteğe bağlıdır; boş olanlar tabloda gösterilmez.
  const details = [
    ["Malzeme", product.material],
    ["Ölçü", product.size],
    ["Ağırlık", product.weight],
    ["İşçilik", product.craft],
  ].filter(([, value]) => value);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <ProductJsonLd product={product} />
      <Link
        href="/koleksiyon"
        className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase transition hover:text-primary"
      >
        ← Koleksiyona dön
      </Link>

      <div className="mt-4 grid gap-6 sm:mt-8 md:grid-cols-2 md:gap-10">
        <ProductGallery product={product} />

        <div>
          <p className="text-[11px] tracking-widest text-muted uppercase">
            {product.material}
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{product.name}</h1>
          <PriceTag price={product.price} oldPrice={product.oldPrice} size="lg" className="mt-4" />
          <p className="mt-1 text-sm text-muted">{stockText(product.stock)}</p>
          {reviews.count > 0 && reviews.average !== null && (
            <a href="#degerlendirmeler" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm text-muted transition hover:text-primary">
              <Stars rating={reviews.average} />
              <span>
                {reviews.average.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} · {reviews.count} değerlendirme
              </span>
            </a>
          )}

          <ProductActions slug={product.slug} name={product.name} stock={product.stock} price={product.price} oldPrice={product.oldPrice} />
          <WhatsAppButton slug={product.slug} name={product.name} whatsapp={whatsapp} />

          {product.story && (
            <p className="mt-6 leading-relaxed whitespace-pre-line text-muted">{product.story}</p>
          )}

          <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-6 py-3">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>

          {product.sample && (
            <p className="mt-6 text-xs text-muted">Bu sayfadaki tüm bilgiler örnek içeriktir.</p>
          )}
        </div>
      </div>

      <section id="degerlendirmeler" aria-labelledby="degerlendirme-baslik" className="mt-16 max-w-3xl scroll-mt-6">
        <h2 id="degerlendirme-baslik" className="font-display text-3xl">
          Değerlendirmeler
        </h2>
        {reviews.count === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Henüz değerlendirme yok. Ürünü teslim alan müşteriler Hesabım sayfasından yorum yazabilir.
          </p>
        ) : (
          <>
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Stars rating={reviews.average ?? 0} size={18} />
              5 üzerinden {(reviews.average ?? 0).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} · {reviews.count}{" "}
              değerlendirme
            </p>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {reviews.reviews.map((review) => (
                <li key={review.id} className="py-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Stars rating={review.rating} />
                    <span className="text-sm font-semibold">{review.authorName}</span>
                    <span className="text-xs text-muted">{monthYear.format(review.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-line">{review.text}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <RecentlyViewed currentSlug={product.slug} />
    </div>
  );
}
