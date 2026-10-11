import Link from "next/link";
import { OrderLookupForm } from "@/components/order-lookup-form";
import { getCustomer } from "@/lib/customer-auth";
import { pageMetadata } from "@/lib/metadata";
import { lookupOrder } from "./actions";

// Kişiye özel sonuçlara götüren sayfa: canlıda da arama motorlarına kapalı kalır.
export const metadata = pageMetadata(
  "Sipariş sorgula",
  "Sipariş numaranız ve e-posta adresinizle siparişinizin durumuna bakın.",
  { noindex: true },
);

// Misafir siparişine ödemeden sonra verilen gizli adresle ulaşılır. Adresi kaybeden müşteri burada sipariş numarası ve
// e-postasıyla siparişinin sayfasını yeniden açar. Giriş yapmış müşteri siparişlerini "Hesabım"da görür (burada da sorgulayabilir).
export default async function OrderLookupPage() {
  const customer = await getCustomer().catch(() => null);
  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl">Sipariş sorgula</h1>
      <p className="mt-4 text-sm text-muted">
        Siparişinizin durumuna bakmak için sipariş numaranızı ve sipariş verirken yazdığınız e-posta adresini girin.
      </p>

      {customer && (
        <p className="mt-4 rounded-md bg-soft p-4 text-sm">
          Giriş yaptınız: hesabınızdayken verdiğiniz siparişler{" "}
          <Link href="/hesabim" className="font-semibold underline transition hover:text-primary">
            Hesabım
          </Link>{" "}
          sayfasında listelenir. Misafir olarak verdiğiniz bir siparişi aşağıdan sorgulayabilirsiniz.
        </p>
      )}

      <OrderLookupForm action={lookupOrder} />

      <p className="mt-8 text-sm text-muted">
        Sipariş numaranıza ulaşamıyor musunuz?{" "}
        <Link href="/iletisim" className="underline transition hover:text-primary">
          Bizimle iletişime geçin
        </Link>
        .
      </p>
    </div>
  );
}
