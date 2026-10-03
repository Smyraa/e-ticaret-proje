import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductActions } from "@/components/product-actions";
import { ProductGallery } from "@/components/product-gallery";
import { ProductJsonLd } from "@/components/product-json-ld";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { formatPrice, stockText } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { getProductBySlug, type Product } from "@/lib/products";

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

  // Ölçü, ağırlık ve işçilik isteğe bağlıdır; boş olanlar tabloda gösterilmez.
  const details = [
    ["Malzeme", product.material],
    ["Ölçü", product.size],
    ["Ağırlık", product.weight],
    ["İşçilik", product.craft],
  ].filter(([, value]) => value);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <ProductJsonLd product={product} />
      <Link
        href="/koleksiyon"
        className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase transition hover:text-primary"
      >
        ← Koleksiyona dön
      </Link>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <ProductGallery product={product} />

        <div>
          <p className="text-[11px] tracking-widest text-muted uppercase">
            {product.material}
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight">{product.name}</h1>
          <p className="mt-4 font-display text-3xl">{formatPrice(product.price)}</p>
          <p className="mt-1 text-sm text-muted">{stockText(product.stock)}</p>

          <ProductActions slug={product.slug} name={product.name} stock={product.stock} />
          <WhatsAppButton slug={product.slug} name={product.name} />

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
    </div>
  );
}
