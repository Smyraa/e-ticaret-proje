import type { Metadata } from "next";
import { StaticPage } from "@/components/static-page";

export const metadata: Metadata = {
  title: "Mesafeli satış sözleşmesi · TAURA Tesbihçilik",
};

// Hukuki metin yazılmaz: yalnızca yer tutucu bırakılır, metni yetkin biri hazırlayıp ekleyecek.
export default function DistanceSalesPage() {
  return (
    <StaticPage title="Mesafeli satış sözleşmesi">
      <p>
        Bu metin yer tutucudur. İnternetten yapılan satışlarda alıcıya sipariş öncesi verilmesi
        gereken bilgilendirme ve sözleşme metni yetkin biri tarafından hazırlanıp eklenecektir.
      </p>

      <h2>Bu sayfada ne olacak?</h2>
      <p>
        Satıcı bilgileri, ürün ve teslimat bilgileri, ödeme koşulları, cayma hakkı ve iade şartları
        gibi başlıklar bu sayfada yer alacak.
      </p>
    </StaticPage>
  );
}
