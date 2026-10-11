import { FavoritesList } from "@/components/favorites-list";
import { pageMetadata } from "@/lib/metadata";
import { getProducts, type Product } from "@/lib/products";

export const dynamic = "force-dynamic";

// Kişiye özel sayfa: canlıda da arama motorlarına kapalı kalır.
export const metadata = pageMetadata(
  "Favorilerim",
  "Beğendiğiniz ürünler bu tarayıcıda saklanır.",
  { noindex: true },
);

export default async function FavoritesPage() {
  let products: Product[] = [];
  let failed = false;
  try {
    products = await getProducts();
  } catch (error) {
    console.error("Ürünler okunamadı", error);
    failed = true;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl">Favorilerim</h1>

      {failed ? (
        <p className="mt-8 rounded-md bg-soft p-4 text-sm text-muted">
          Ürünler şu an yüklenemedi. Yerel MongoDB çalışıyor mu? (127.0.0.1:27017)
        </p>
      ) : (
        <FavoritesList products={products} />
      )}
    </div>
  );
}
