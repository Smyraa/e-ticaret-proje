import { requireAdmin } from "@/lib/auth";
import { sweepExpiredReservations } from "@/lib/order-flow";
import { logout } from "./actions";
import { AdminSidebar } from "./admin-nav";

// Giriş gerektiren yönetim sayfalarının çerçevesi (rota grubu "(panel)": adreste görünmez): solda menü, sağda içerik.
// Giriş sayfası bu grubun dışında. Not: yetki kontrolü yalnız burada yapılmaz; her sayfa ve her eylem
// kendi içinde requireAdmin() çağırır (ortak düzenler sayfa geçişlerinde yeniden çalışmayabilir).
export default async function AdminPanelLayout({ children }: LayoutProps<"/yonetim">) {
  const admin = await requireAdmin();
  await sweepExpiredReservations(); // ödeme sayfası terk edilmiş siparişlerin ayrılmış stoğu geri konur

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      {/* Klavye kullanıcıları için: Tab ile ilk gelen bağlantı, menüyü atlayıp içeriğe götürür. */}
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:bg-paper focus:px-4 focus:py-3 focus:text-xs focus:font-semibold focus:tracking-widest focus:text-ink focus:uppercase focus:shadow-md"
      >
        Ana içeriğe geç
      </a>

      <AdminSidebar
        email={admin.email}
        logout={
          <form action={logout}>
            <button
              type="submit"
              className="flex min-h-11 items-center text-xs font-semibold tracking-widest text-paper uppercase underline transition hover:text-gold"
            >
              Çıkış yap
            </button>
          </form>
        }
      />

      <main id="icerik" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
        {children}
      </main>
    </div>
  );
}
