import { NotFoundContent } from "@/components/not-found-content";
import { SiteShell } from "@/components/site-shell";
import { pageMetadata } from "@/lib/metadata";

// 404 sayfasına Next.js zaten kendi noindex etiketini ekler.
export const metadata = pageMetadata("Sayfa bulunamadı", "Aradığınız sayfa bulunamadı.");

// Hiçbir sayfayla eşleşmeyen adresler için. Bu sayfa rota gruplarının dışında kaldığı için mağaza çerçevesini
// kendisi giyer; mağaza sayfalarında notFound() çağrılırsa (site)/not-found.tsx kullanılır (çerçeve çiftlenmesin).
export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundContent />
    </SiteShell>
  );
}
