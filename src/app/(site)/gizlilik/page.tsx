import { StaticPage } from "@/components/static-page";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata("Gizlilik ve KVKK", "Gizlilik ve KVKK metni (yer tutucu).");

// Hukuki metin yazılmaz: yalnızca yer tutucu bırakılır, metni yetkin biri hazırlayıp ekleyecek.
export default function PrivacyPage() {
  return (
    <StaticPage title="Gizlilik ve KVKK">
      <p>
        Bu metin yer tutucudur. Kişisel Verilerin Korunması Kanunu’na (KVKK) uygun gizlilik ve
        aydınlatma metni yetkin biri tarafından hazırlanıp eklenecektir.
      </p>

      <h2>Bu sayfada ne olacak?</h2>
      <p>
        Sipariş ve iletişim sırasında alınan kişisel verilerin (ad, telefon, e-posta, adres gibi)
        neden ve nasıl kullanıldığı, ne kadar saklandığı ve haklarınız bu sayfada anlatılacak.
      </p>
    </StaticPage>
  );
}
