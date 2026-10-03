import { CartView } from "@/components/cart-view";
import { pageMetadata } from "@/lib/metadata";
import { getProducts, type Product } from "@/lib/products";
import { getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// Kişiye özel sayfa: canlıda da arama motorlarına kapalı kalır.
export const metadata = pageMetadata(
  "Sepetim",
  "Sepetinizdeki ürünler, hediye paketi ve not seçeneği.",
  { noindex: true },
);

export default async function CartPage() {
  const { shippingFee } = await getSiteSettings();
  let products: Product[] = [];
  let failed = false;
  try {
    products = await getProducts();
  } catch (error) {
    console.error("Ürünler okunamadı", error);
    failed = true;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-display text-4xl">Sepetim</h1>

      {failed ? (
        <p className="mt-8 rounded-md bg-soft p-4 text-sm text-muted">
          Ürünler şu an yüklenemedi. Yerel MongoDB çalışıyor mu? (127.0.0.1:27017)
        </p>
      ) : (
        <CartView products={products} shippingFee={shippingFee} />
      )}
    </div>
  );
}
