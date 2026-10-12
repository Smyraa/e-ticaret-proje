import { redirect } from "next/navigation";
import { FavoritesList } from "@/components/favorites-list";
import { getCustomer } from "@/lib/customer-auth";
import { pageMetadata } from "@/lib/metadata";
import { getProducts, type Product } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("Favorilerim", "Beğendiğiniz ürünler.", { noindex: true });

// Hesap alanındaki Favorilerim: /favoriler ile aynı liste (giriş yapılınca favoriler hesapla eşitlenir), hesap menüsüyle birlikte.
// Misafirler için /favoriler sayfası olduğu gibi durur.
export default async function AccountFavoritesPage() {
  const customer = await getCustomer();
  if (!customer) redirect("/giris?donus=/hesabim/favoriler");

  let products: Product[] = [];
  let failed = false;
  try {
    products = await getProducts();
  } catch (error) {
    console.error("Ürünler okunamadı", error);
    failed = true;
  }

  return (
    <section aria-labelledby="favoriler-baslik">
      <h1 id="favoriler-baslik" className="font-display text-3xl sm:text-4xl">
        Favorilerim
      </h1>
      {failed ? (
        <p className="mt-6 rounded-md bg-soft p-4 text-sm text-muted">Ürünler şu an yüklenemedi. Biraz sonra yeniden deneyin.</p>
      ) : (
        <FavoritesList products={products} />
      )}
    </section>
  );
}
