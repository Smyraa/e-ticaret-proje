"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

// Menü öğeleri. also: bu sayfalar da aynı öğenin altında sayılır (Ayarlar'ın altında Hesap sayfası var).
// Henüz yapılmamış bölümler (Kampanyalar, Müşteriler, Yorumlar…) yapıldıkça eklenir; boş sayfa gösterilmez.
const links: { href: string; label: string; exact?: boolean; also?: string[]; icon: ReactNode }[] = [
  {
    href: "/yonetim",
    label: "Genel Bakış",
    exact: true,
    icon: <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />,
  },
  {
    href: "/yonetim/siparisler",
    label: "Siparişler",
    icon: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />,
  },
  {
    href: "/yonetim/urunler",
    label: "Ürünler",
    icon: <path d="M3 12V4h8l10 10-8 8L3 12zM7.5 7.5h.01" />,
  },
  {
    href: "/yonetim/stok",
    label: "Stok Takibi",
    icon: <path d="M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8" />,
  },
  {
    href: "/yonetim/yorumlar",
    label: "Yorumlar",
    icon: <path d="M4 5h16v11H9l-5 4zM8 9h8M8 12h5" />,
  },
  {
    href: "/yonetim/ayarlar",
    label: "Ayarlar",
    also: ["/yonetim/hesap"],
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
      </>
    ),
  },
];

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

const Brand = () => (
  <span className="inline-flex flex-col leading-none">
    <span className="font-display text-2xl tracking-[0.18em] text-paper">TAURA</span>
    <span className="mt-1 text-[10px] tracking-[0.35em] text-gold uppercase">Yönetim</span>
  </span>
);

type Props = {
  email: string;
  logout: ReactNode; // çıkış formu (sunucu eylemi; düzen verir)
};

// Yönetim gezinmesi: geniş ekranda solda sabit koyu menü; dar ekranda üstte ince bir çubuk ve "Menü" düğmesiyle soldan açılan
// çekmece (Escape, arka plana dokunma ya da bir bağlantı kapatır; açılınca odak çekmeceye, kapanınca düğmeye döner).
// Bulunulan sayfa aria-current ile işaretlenir. Tek bir <nav> vardır (her iki görünüm de aynı menüyü kullanır).
export function AdminSidebar({ email, logout }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) {
      panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
      const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") setOpen(false);
      };
      document.addEventListener("keydown", onKey);
      wasOpen.current = true;
      return () => document.removeEventListener("keydown", onKey);
    }
    if (wasOpen.current) toggleRef.current?.focus();
    wasOpen.current = false;
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      {/* Dar ekran: üst çubuk */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-espresso px-4 py-2 md:hidden">
        <Link href="/yonetim" className="inline-flex min-h-11 items-center">
          <Brand />
        </Link>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls="yonetim-menu"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 px-2 text-xs font-semibold tracking-widest text-paper uppercase"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          Menü
        </button>
      </div>

      {/* Dar ekranda çekmece açıkken arka plan; dokununca kapanır. */}
      {open && (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={close}
          className="fixed inset-0 z-40 bg-espresso/50 md:hidden"
        />
      )}

      <div
        id="yonetim-menu"
        ref={panelRef}
        className={`${open ? "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] shadow-xl" : "hidden"} flex-col overflow-y-auto bg-espresso text-sand md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:shadow-none`}
      >
        <div className="flex items-center justify-between border-b border-gold/40 px-5 py-5">
          <Link href="/yonetim" onClick={close} className="inline-flex min-h-11 items-center">
            <Brand />
          </Link>
          <button
            type="button"
            onClick={close}
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-paper md:hidden"
            aria-label="Menüyü kapat"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav aria-label="Yönetim menüsü" className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {links.map(({ href, label, exact, also = [], icon }) => {
              const current = [href, ...also].some(
                (match) => pathname === match || (!exact && pathname.startsWith(`${match}/`)),
              );
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={close}
                    aria-current={current ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-md border-l-2 px-3 text-sm transition ${
                      current
                        ? "border-gold bg-bordo font-semibold text-paper"
                        : "border-transparent hover:bg-paper/10 hover:text-paper"
                    }`}
                  >
                    <Icon>{icon}</Icon>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-1 border-t border-gold/40 px-5 py-4 text-sm">
          <Link
            href="/yonetim/hesap"
            onClick={close}
            className="block min-h-11 truncate py-3 text-sand transition hover:text-paper hover:underline"
            title={email}
          >
            {email}
          </Link>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Siteyi gör (yeni sekmede açılır)"
            className="flex min-h-11 items-center text-sand transition hover:text-paper hover:underline"
          >
            Siteyi gör ↗
          </a>
          {logout}
        </div>
      </div>
    </>
  );
}
