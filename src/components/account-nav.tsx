"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const icon = (path: ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
    {path}
  </svg>
);

// Hesap alanının menüsü. "Değerlendirmelerim", yorum yazma/düzenleme sayfasındayken de işaretli görünür.
const items = [
  {
    href: "/hesabim",
    label: "Siparişlerim",
    active: (path: string) => path === "/hesabim",
    icon: icon(<path d="M6 7h12l-1 13H7L6 7Zm3 0a3 3 0 0 1 6 0" />),
  },
  {
    href: "/hesabim/degerlendirmeler",
    label: "Değerlendirmelerim",
    active: (path: string) => path.startsWith("/hesabim/degerlendirmeler") || path.startsWith("/hesabim/yorum/"),
    icon: icon(<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" />),
  },
  {
    href: "/hesabim/adresler",
    label: "Adreslerim",
    active: (path: string) => path.startsWith("/hesabim/adresler"),
    icon: icon(
      <>
        <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z" />
        <circle cx="12" cy="10" r="2.3" />
      </>,
    ),
  },
  {
    href: "/hesabim/favoriler",
    label: "Favorilerim",
    active: (path: string) => path.startsWith("/hesabim/favoriler"),
    icon: icon(<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />),
  },
  {
    href: "/hesabim/profil",
    label: "Profil ve güvenlik",
    active: (path: string) => path.startsWith("/hesabim/profil"),
    icon: icon(
      <>
        <circle cx="12" cy="8.5" r="3.5" />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>,
    ),
  },
];

// Telefonda yatay kaydırılan sekmeler, geniş ekranda soldaki dikey liste. Çıkış düğmesi (sunucu eylemi) dışarıdan verilir.
export function AccountNav({ logout }: { logout: ReactNode }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Hesap menüsü">
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-col lg:gap-1 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = item.active(pathname);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-full border px-4 text-sm whitespace-nowrap transition lg:rounded-lg lg:border-transparent ${
                  active
                    ? "border-bordo bg-bordo text-paper lg:border-bordo"
                    : "border-gold/50 bg-paper/60 hover:border-bordo hover:text-bordo lg:bg-transparent lg:hover:bg-paper/60"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0 lg:mt-3 lg:border-t lg:border-gold/40 lg:pt-3">{logout}</li>
      </ul>
    </nav>
  );
}
