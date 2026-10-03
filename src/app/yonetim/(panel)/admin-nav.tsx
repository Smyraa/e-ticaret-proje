"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/yonetim", label: "Ana sayfa", exact: true },
  { href: "/yonetim/urunler", label: "Ürünler", exact: false },
];

const linkClass = "inline-flex min-h-11 items-center whitespace-nowrap underline-offset-8 transition hover:text-primary";

// Yönetim menüsü; bulunulan sayfa işaretlenir (aria-current + alt çizgi).
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Yönetim menüsü"
      className="flex flex-wrap items-center gap-x-4 text-xs tracking-wider uppercase md:gap-x-5 md:tracking-widest"
    >
      {links.map(({ href, label, exact }) => {
        const current = pathname === href || (!exact && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`${linkClass} ${current ? "text-primary underline decoration-2" : ""}`}
          >
            {label}
          </Link>
        );
      })}
      <a href="/" target="_blank" rel="noopener noreferrer" className={`${linkClass} text-muted`}>
        Siteyi gör
        <span className="sr-only"> (yeni sekmede açılır)</span>
      </a>
    </nav>
  );
}
