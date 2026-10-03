import { NotFoundContent } from "@/components/not-found-content";

// Mağaza sayfalarında notFound() çağrılınca (ör. olmayan ya da taslak bir ürün) gösterilir.
// Çerçeve (üst menü, alt bilgi) (site)/layout.tsx'ten gelir; burada tekrar giydirilmez.
export default function SiteNotFound() {
  return <NotFoundContent />;
}
