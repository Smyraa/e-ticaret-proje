import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { logout } from "./actions";
import { AdminNav } from "./admin-nav";

// Giriş gerektiren yönetim sayfalarının çerçevesi (rota grubu "(panel)": adreste görünmez).
// Giriş sayfası bu grubun dışında. Not: yetki kontrolü yalnız burada yapılmaz; her sayfa ve her eylem
// kendi içinde requireAdmin() çağırır (ortak düzenler sayfa geçişlerinde yeniden çalışmayabilir).
export default async function AdminPanelLayout({ children }: LayoutProps<"/yonetim">) {
  const admin = await requireAdmin();

  return (
    <>
      <header className="border-b border-line bg-paper">
        {/* Dar ekranda iki satır: üstte marka + çıkış, altta menü. Geniş ekranda tek satır.
            Kaynak sırası (odak sırası) geniş ekrandaki görünüşle aynı: marka, menü, çıkış. */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 px-6 py-1 md:gap-x-6 md:py-2">
          <Link href="/yonetim" className="order-1 inline-flex min-h-11 items-center gap-2 md:order-none">
            <span className="font-display text-xl tracking-[0.16em]">TAURA</span>
            <span className="text-[11px] tracking-[0.3em] text-muted uppercase">Yönetim</span>
          </Link>

          <div className="order-3 w-full md:order-none md:w-auto">
            <AdminNav />
          </div>

          <div className="order-2 ml-auto flex items-center gap-x-5 text-sm md:order-none">
            <span className="hidden text-muted lg:inline">{admin.email}</span>
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
