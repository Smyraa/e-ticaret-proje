import Link from "next/link";
import { OrderLookupForm } from "@/components/order-lookup-form";
import { pageMetadata } from "@/lib/metadata";
import { lookupOrder } from "./actions";

// Kişiye özel sonuçlara götüren sayfa: canlıda da arama motorlarına kapalı kalır.
export const metadata = pageMetadata(
  "Sipariş sorgula",
  "Sipariş numaranız ve e-posta adresinizle siparişinizin durumuna bakın.",
  { noindex: true },
);

// Üyelik olmadığından siparişe, ödemeden sonra verilen gizli adresle ulaşılır. Adresi kaybeden müşteri burada sipariş
// numarası ve e-postasıyla siparişinin sayfasını yeniden açar.
export default function OrderLookupPage() {
  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="font-display text-4xl">Sipariş sorgula</h1>
      <p className="mt-4 text-sm text-muted">
        Siparişinizin durumuna bakmak için sipariş numaranızı ve sipariş verirken yazdığınız e-posta adresini girin.
      </p>

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
