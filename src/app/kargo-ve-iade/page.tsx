import { StaticPage } from "@/components/static-page";
import { pageMetadata } from "@/lib/metadata";
import { shippingInfo } from "@/lib/shipping";

export const metadata = pageMetadata("Kargo ve iade", "Kargo ve iade bilgileri (örnek içerik).");

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
