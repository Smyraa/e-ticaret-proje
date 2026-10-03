"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/yonetim", label: "Ana sayfa", exact: true, hideOnTiny: true },
  { href: "/yonetim/urunler", label: "Ürünler", exact: false, hideOnTiny: false },
  { href: "/yonetim/ayarlar", label: "Ayarlar", exact: false, hideOnTiny: false },
  { href: "/yonetim/hesap", label: "Hesap", exact: false, hideOnTiny: false },
];

// "display" burada yok: her bağlantı kendi görünürlüğünü (inline-flex ya da dar ekranda gizli) ayrıca alır.
const linkClass = "min-h-11 items-center whitespace-nowrap underline-offset-8 transition hover:text-primary";

// Yönetim menüsü; bulunulan sayfa işaretlenir (aria-current + alt çizgi). "Ana sayfa" 420 px'ten dar ekranda gizlenir
// (menü tek satıra sığsın diye); oradan marka yazısı zaten ana sayfaya götürür.
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Yönetim menüsü"
      className="flex flex-wrap items-center gap-x-4 text-xs tracking-wider uppercase md:gap-x-5 md:tracking-widest"
    >
      {links.map(({ href, label, exact, hideOnTiny }) => {
        const current = pathname === href || (!exact && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`${linkClass} ${current ? "text-primary underline decoration-2" : ""} ${hideOnTiny ? "hidden min-[420px]:inline-flex" : "inline-flex"}`}
          >
            {label}
          </Link>
        );
      })}
      <a href="/" target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex text-muted`}>
        Siteyi gör
        <span className="sr-only"> (yeni sekmede açılır)</span>
      </a>
    </nav>
  );
}
