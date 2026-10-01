import { mediaUrl } from "@/lib/media";
import type { Product } from "@/lib/products";
import { siteUrl } from "@/lib/site";

// Arama motorları için ürün bilgisi (schema.org Product): ad, görsel, fiyat ve stok durumu.
// Örnek ürünler için yazılmaz: demo verisi yanlışlıkla gerçek teklif gibi yayımlanmasın.
export function ProductJsonLd({ product }: { product: Product }) {
  if (product.sample) return null;

  const url = `${siteUrl}/urun/${product.slug}`;
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.story,
    sku: product.slug,
    material: product.material,
    image: product.images.map((file) => `${siteUrl}${mediaUrl(file)}`),
    url,
    offers: {
      "@type": "Offer",
      url,
      price: product.price,
      priceCurrency: "TRY",
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  // "<" karakteri kaçırılır: ürün metni </script> içerse bile sayfa bozulmaz.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
