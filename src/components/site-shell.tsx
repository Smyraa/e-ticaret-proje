import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

// Mağaza sayfalarının ortak çerçevesi: atlama bağlantısı, demo şeridi, üst menü, içerik ve alt bilgi.
// Yönetim sayfaları bunu kullanmaz (kendi sade çerçevesi var).
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Klavye kullanıcıları için: Tab ile ilk gelen bağlantı, menüyü atlayıp içeriğe götürür. */}
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-paper focus:px-4 focus:py-3 focus:text-xs focus:font-semibold focus:tracking-widest focus:text-ink focus:uppercase focus:shadow-md"
      >
        Ana içeriğe geç
      </a>

      <div className="bg-espresso px-4 py-2 text-center text-xs tracking-widest text-paper uppercase">
        Demo sürümü · Ürünler ve fiyatlar örnek içeriktir
      </div>

      <SiteHeader />

      <main id="icerik" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>

      <SiteFooter />
    </>
  );
}
