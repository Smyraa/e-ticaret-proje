import Link from "next/link";
import { CheckoutView } from "@/components/checkout-view";
import { pageMetadata } from "@/lib/metadata";
import { paymentSetup } from "@/lib/payment-config";
import { checkoutPaymentText, paymentsActive } from "@/lib/payment-model";
import { getProducts, type Product } from "@/lib/products";
import { getSiteSettings } from "@/lib/settings";
import { placeOrder } from "./actions";

export const dynamic = "force-dynamic";

// Kişiye özel sayfa: canlıda da arama motorlarına kapalı kalır.
export const metadata = pageMetadata(
  "Ödeme",
  "Teslimat bilgileriniz ve sipariş özeti. Demo sürümünde ödeme alınmaz.",
  { noindex: true },
);

export default async function CheckoutPage() {
  const { shippingFee } = await getSiteSettings();
  const setup = paymentSetup();
  const payment = checkoutPaymentText(setup);
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
        className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase transition hover:text-primary"
      >
        ← Sepete dön
      </Link>
      <h1 className="mt-6 font-display text-4xl">Ödeme</h1>
      {!paymentsActive(setup) && (
        <p className="mt-4 rounded-md bg-soft p-4 text-sm text-muted">Demo sürümü: sipariş kaydedilir, ödeme alınmaz.</p>
      )}

      {failed ? (
        <p className="mt-8 rounded-md bg-soft p-4 text-sm text-muted">
          Ürünler şu an yüklenemedi. Yerel MongoDB çalışıyor mu? (127.0.0.1:27017)
        </p>
      ) : (
        <CheckoutView
          products={products}
          shippingFee={shippingFee}
          paymentNote={payment.note}
          submitLabel={payment.button}
          action={placeOrder}
        />
      )}
    </div>
  );
}
