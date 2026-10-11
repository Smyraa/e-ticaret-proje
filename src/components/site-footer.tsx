import Link from "next/link";
import { formatPhone } from "@/lib/phone";
import { getSiteSettings } from "@/lib/settings";

// Atölye, iletişim ve bilgi sayfalarının bağlantıları alt bilgide durur (kullanıcı kararı: üst menüde değil).
const groups = [
  {
    title: "Kurumsal",
    links: [
      { href: "/atolye", label: "Atölye" },
      { href: "/iletisim", label: "İletişim" },
    ],
  },
  {
    title: "Yardım",
    links: [
      { href: "/sss", label: "Sıkça sorulan sorular" },
      { href: "/rehber", label: "Tesbih rehberi" },
      { href: "/kargo-ve-iade", label: "Kargo ve iade" },
      { href: "/siparis", label: "Sipariş sorgula" },
    ],
  },
  {
    title: "Yasal",
    links: [
      { href: "/gizlilik", label: "Gizlilik ve KVKK" },
      { href: "/mesafeli-satis", label: "Mesafeli satış sözleşmesi" },
    ],
  },
];

export async function SiteFooter() {
  // Telefon ve e-posta yönetim panelindeki Site ayarlarından gelir; boş olanlar gösterilmez.
  const { phone, email } = await getSiteSettings();
  const contactClass = "inline-flex min-h-11 items-center text-sm transition hover:text-gold-light";

  return (
    <footer className="border-t border-gold-light/40 bg-espresso/55 text-paper backdrop-blur-md [&_:focus-visible]:outline-gold-light">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 sm:col-span-1">
            <p className="font-display text-2xl tracking-[0.16em]">TAURA</p>
            <p className="text-[11px] tracking-[0.3em] text-gold-light uppercase">Tesbihçilik</p>
            {(phone || email) && (
              <ul className="mt-3">
                {phone && (
                  <li>
                    <a href={`tel:+${phone}`} className={contactClass}>
                      {formatPhone(phone)}
                    </a>
                  </li>
                )}
                {email && (
                  <li>
                    <a href={`mailto:${email}`} className={`${contactClass} break-all`}>
                      {email}
                    </a>
                  </li>
                )}
              </ul>
            )}
          </div>

          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-[11px] tracking-widest text-gold-light uppercase">{group.title}</h2>
              <ul className="mt-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 min-w-11 items-center text-sm transition hover:text-gold-light"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-10 border-t border-gold-light/25 pt-6 text-xs text-paper/70">
          TAURA Tesbihçilik · Demo sürümü. Bu sayfadaki tüm ürün ve fiyatlar örnek içeriktir.
        </p>
      </div>
    </footer>
  );
}
