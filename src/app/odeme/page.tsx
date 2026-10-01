import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutView } from "@/components/checkout-view";
import { getProducts, type Product } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ödeme · TAURA Tesbihçilik",
};

export default async function CheckoutPage() {
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
      <Link
        href="/sepet"
        className="text-xs tracking-widest text-muted uppercase transition hover:text-primary"
      >
        ← Sepete dön
      </Link>
      <h1 className="mt-6 font-display text-4xl">Ödeme</h1>
      <p className="mt-4 rounded-md bg-soft p-4 text-sm text-muted">
        Demo sayfası: girdiğiniz bilgiler hiçbir yere gönderilmez ve kaydedilmez, ödeme alınmaz.
      </p>

      {failed ? (
        <p className="mt-8 rounded-md bg-soft p-4 text-sm text-muted">
          Ürünler şu an yüklenemedi. Yerel MongoDB çalışıyor mu? (127.0.0.1:27017)
        </p>
      ) : (
        <CheckoutView products={products} />
      )}
    </div>
  );
}
