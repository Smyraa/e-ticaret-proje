import type { ReactNode } from "react";
import { AccountNav } from "@/components/account-nav";
import { getCustomer } from "@/lib/customer-auth";
import { logout } from "./actions";

// Hesap alanının ortak çerçevesi: üstte (geniş ekranda solda) müşterinin adı ve hesap menüsü (Siparişlerim, Değerlendirmelerim,
// Adreslerim, Favorilerim, Profil ve güvenlik, Çıkış yap), yanında seçili bölüm. Giriş yapılmamışsa çerçeve çizilmez; sayfalar
// zaten giriş sayfasına yönlendirir.
export default async function AccountLayout({ children }: { children: ReactNode }) {
  const customer = await getCustomer().catch(() => null);
  if (!customer) return children;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-40 lg:self-start">
        <div className="mb-4 lg:mb-6">
          <p className="font-display text-3xl">Hesabım</p>
          <p className="mt-1 text-sm text-muted">
            <span className="font-semibold text-ink">{customer.name}</span>
            <span className="block break-all">{customer.email}</span>
          </p>
        </div>
        <AccountNav
          logout={
            <form action={logout}>
              <button
                type="submit"
                className="flex min-h-11 w-full items-center gap-3 rounded-full border border-gold/50 bg-paper/60 px-4 text-sm whitespace-nowrap text-muted transition hover:border-danger hover:text-danger lg:rounded-lg lg:border-transparent lg:bg-transparent"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                  <path d="M14 5h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h9" />
                </svg>
                Çıkış yap
              </button>
            </form>
          }
        />
      </aside>
      <div className="mt-6 min-w-0 lg:mt-0">{children}</div>
    </div>
  );
}
