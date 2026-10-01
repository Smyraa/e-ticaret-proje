import Link from "next/link";

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
      { href: "/kargo-ve-iade", label: "Kargo ve iade" },
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

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 sm:col-span-1">
            <p className="font-display text-2xl tracking-[0.16em]">TAURA</p>
            <p className="text-[11px] tracking-[0.3em] text-muted uppercase">Tesbihçilik</p>
          </div>

          {groups.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="text-[11px] tracking-widest text-muted uppercase">{group.title}</h2>
              <ul className="mt-2">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-11 min-w-11 items-center text-sm transition hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-10 border-t border-line pt-6 text-xs text-muted">
          TAURA Tesbihçilik · Demo sürümü. Bu sayfadaki tüm ürün ve fiyatlar örnek içeriktir.
        </p>
      </div>
    </footer>
  );
}
