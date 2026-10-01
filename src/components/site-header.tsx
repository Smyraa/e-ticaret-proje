"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

// Favori ve sepet simgeleri kendi adımlarında eklenecek; "Atölye" ve "İletişim" sabit sayfalar hazır olunca.
const links = [
  { href: "/koleksiyon", label: "Koleksiyon" },
  { href: "/koleksiyon#q", label: "Ara" }, // koleksiyon sayfasındaki arama kutusuna götürür
];

const linkClass =
  "text-xs tracking-widest uppercase transition hover:text-primary";

export function SiteHeader() {
  // Mobil menünün açık/kapalı durumu tarayıcıda tutulur.
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="border-b border-line">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6 py-6">
        <div>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Ana menü">
            {links.map((link) => {
              const active = !link.href.includes("#") && pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`${linkClass} ${active ? "text-ink" : "text-muted"}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            className="-ml-2.5 p-2.5 md:hidden"
            aria-expanded={open}
            aria-controls="mobil-menu"
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            onClick={() => setOpen((value) => !value)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        <Link href="/" className="text-center" onClick={() => setOpen(false)}>
          <p className="font-display text-3xl tracking-[0.22em]">TAURA</p>
          <p className="-mt-1 text-[11px] tracking-[0.38em] text-muted uppercase">
            Tesbihçilik
          </p>
        </Link>

        {/* Sağ taraf: favori ve sepet simgeleri sonraki adımlarda */}
        <div />
      </div>

      {open && (
        <nav
          id="mobil-menu"
          className="border-t border-line md:hidden"
          aria-label="Mobil menü"
        >
          <ul>
            {links.map((link) => (
              <li key={link.href} className="border-b border-line last:border-b-0">
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`block px-6 py-4 ${linkClass}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
