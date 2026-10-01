import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";
import { shippingInfo } from "@/lib/shipping";

export const metadata: Metadata = {
  title: "Kargo ve iade · TAURA Tesbihçilik",
};

// Yalnızca bilinen bilgiler yazılır (kargo şimdilik ücretsiz, iade kabul edilir); koşullar belirlenince güncellenir.
export default function ShippingAndReturnsPage() {
  return (
    <StaticPage title="Kargo ve iade">
      <h2>Kargo</h2>
      <p>{shippingInfo}</p>
      <p>Teslimat süresi ve kargo firması henüz belirlenmedi.</p>

      <h2>İade</h2>
      <p>
        İade kabul edilir. İade koşulları (süre, iade kargosunun kim tarafından ödeneceği gibi)
        henüz belirlenmedi; belirlendiğinde bu sayfada yazılacak.
      </p>
    </StaticPage>
  );
}
