import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "./actions";

// Giriş gerektiren yönetim sayfalarının çerçevesi (rota grubu "(panel)": adreste görünmez).
// Giriş sayfası bu grubun dışında. Not: yetki kontrolü yalnız burada yapılmaz; her sayfa ve her eylem
// kendi içinde requireAdmin() çağırır (ortak düzenler sayfa geçişlerinde yeniden çalışmayabilir).
export default async function AdminPanelLayout({ children }: LayoutProps<"/yonetim">) {
  const admin = await requireAdmin();

  return (
    <>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-6 py-2">
          <div className="flex items-center gap-6">
            <Link href="/yonetim" className="inline-flex min-h-11 items-center gap-2">
              <span className="font-display text-xl tracking-[0.16em]">TAURA</span>
              <span className="text-[11px] tracking-[0.3em] text-muted uppercase">Yönetim</span>
            </Link>
            <nav aria-label="Yönetim menüsü" className="flex items-center gap-5 text-xs tracking-widest uppercase">
              <Link href="/yonetim" className="inline-flex min-h-11 items-center transition hover:text-primary">
                Ana sayfa
              </Link>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 text-sm">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center text-muted transition hover:text-primary"
            >
              Siteyi gör
              <span className="sr-only"> (yeni sekmede açılır)</span>
            </a>
            <span className="text-muted">{admin.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="min-h-11 text-xs font-semibold tracking-widest uppercase underline transition hover:text-primary"
              >
                Çıkış yap
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </>
  );
}
