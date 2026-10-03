import { StaticPage } from "@/components/static-page";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "Atölye",
  "TAURA Tesbihçilik’in hikâyesi ve atölyesi (örnek içerik).",
);

export default function WorkshopPage() {
  return (
    <StaticPage title="Atölye">
      <p>
        Bu sayfada TAURA Tesbihçilik’in hikâyesi, atölyesi ve çalışma şekli anlatılacak. Şimdilik
        yalnızca yer tutucu metin var.
      </p>

      <h2>Hikâyemiz</h2>
      <p>Yer tutucu: markanın nasıl başladığı ve neye değer verdiği burada yazılacak.</p>

      <h2>Malzemeler ve işçilik</h2>
      <p>
        Yer tutucu: kullanılan malzemeler, ölçüler ve tesbihlerin nasıl hazırlandığı burada
        anlatılacak.
      </p>
    </StaticPage>
  );
}
