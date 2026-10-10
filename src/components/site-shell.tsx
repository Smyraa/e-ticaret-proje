import type { ReactNode } from "react";
import { getCustomer } from "@/lib/customer-auth";
import { sweepExpiredReservations } from "@/lib/order-flow";
import { AccountSync } from "./account-sync";
import { CarpetBackground } from "./carpet-background";
import { MainSurface } from "./main-surface";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

// Mağaza sayfalarının ortak çerçevesi: halı zemini, atlama bağlantısı, demo şeridi, üst menü, içerik ve alt bilgi.
// Üst menü ve alt bilgi zeminin üzerinde saydamdır; içerik MainSurface ile okunaklı panelde durur.
// Yönetim sayfaları bunu kullanmaz (kendi sade çerçevesi var).
export async function SiteShell({ children }: { children: ReactNode }) {
  // Veritabanına ulaşılamazsa site misafir gibi açılır.
  const customer = await getCustomer().catch(() => null);
  // Ödeme sayfası terk edilmiş siparişlerin ayrılmış stoğu süre dolunca geri konur (en çok 30 sn'de bir çalışır).
  await sweepExpiredReservations();

  return (
    <>
      <AccountSync customerId={customer?.id ?? null} />
      <CarpetBackground />

      {/* Klavye kullanıcıları için: Tab ile ilk gelen bağlantı, menüyü atlayıp içeriğe götürür. */}
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-paper focus:px-4 focus:py-3 focus:text-xs focus:font-semibold focus:tracking-widest focus:text-ink focus:uppercase focus:shadow-md"
      >
        Ana içeriğe geç
      </a>

      <div className="bg-espresso/80 px-4 py-2 text-center text-xs tracking-widest text-paper uppercase">
        Demo sürümü · Ürünler ve fiyatlar örnek içeriktir
      </div>

      <SiteHeader signedIn={customer !== null} />

      <main id="icerik" tabIndex={-1} className="flex-1 focus:outline-none">
        <MainSurface>{children}</MainSurface>
      </main>

      <SiteFooter />
    </>
  );
}
