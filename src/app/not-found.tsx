import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { pageMetadata } from "@/lib/metadata";

// 404 sayfasına Next.js zaten kendi noindex etiketini ekler.
export const metadata = pageMetadata("Sayfa bulunamadı", "Aradığınız sayfa bulunamadı.");

// Bu sayfa rota gruplarının dışında kaldığı için mağaza çerçevesini kendisi giyer.
export default function NotFound() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="font-display text-4xl">Sayfa bulunamadı</h1>
        <p className="mt-4 text-muted">Aradığınız sayfa yok ya da taşınmış olabilir.</p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
        >
          Ana sayfaya dön
        </Link>
      </div>
    </SiteShell>
  );
}
