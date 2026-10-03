"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// also: bu sayfalar da aynı menü öğesinin altında sayılır (Ayarlar'ın altında Hesap sayfası var).
// wide: dar ekranda gizlenir (menü iki satırlı başlığa sığsın diye); oradan marka yazısı zaten ana sayfaya götürür.
const links = [
  { href: "/yonetim", label: "Ana sayfa", exact: true, also: [] as string[], wide: true },
  { href: "/yonetim/siparisler", label: "Siparişler", exact: false, also: [], wide: false },
  { href: "/yonetim/urunler", label: "Ürünler", exact: false, also: [], wide: false },
  { href: "/yonetim/ayarlar", label: "Ayarlar", exact: false, also: ["/yonetim/hesap"], wide: false },
];

// "display" burada yok: her bağlantı kendi görünürlüğünü (inline-flex ya da dar ekranda gizli) ayrıca alır.
const linkClass = "min-h-11 items-center whitespace-nowrap underline-offset-8 transition hover:text-primary";

// Yönetim menüsü; bulunulan sayfa işaretlenir (aria-current + alt çizgi). Dar ekranda başlık iki satırda kalsın diye
// "Ana sayfa" 480 px'ten dar ekranda gizlenir ve "Siteyi gör" 420 px'ten dar ekranda "Site" diye kısalır (ekran okuyucu
// yine tam adı okur).
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Yönetim menüsü"
      className="flex flex-wrap items-center gap-x-4 text-xs tracking-wider uppercase md:gap-x-5 md:tracking-widest"
    >
      {links.map(({ href, label, exact, also, wide }) => {
        const current = [href, ...also].some(
          (match) => pathname === match || (!exact && pathname.startsWith(`${match}/`)),
        );
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`${linkClass} ${current ? "text-primary underline decoration-2" : ""} ${wide ? "hidden min-[480px]:inline-flex" : "inline-flex"}`}
          >
            {label}
          </Link>
        );
      })}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Siteyi gör (yeni sekmede açılır)"
        className={`${linkClass} inline-flex text-muted`}
      >
        <span aria-hidden="true" className="min-[420px]:hidden">
          Site
        </span>
        <span aria-hidden="true" className="hidden min-[420px]:inline">
          Siteyi gör
        </span>
      </a>
    </nav>
  );
}
