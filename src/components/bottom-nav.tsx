"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cartCount, useCart } from "@/lib/cart";
import { useFavorites } from "@/lib/favorites";
import { BagIcon } from "./bag-icon";
import { HeartIcon } from "./heart-icon";
import type { HeaderCategory } from "./site-header";
import { UserIcon } from "./user-icon";

// Telefon ve tablette (< 1024 px) ekranın altındaki sabit gezinme çubuğu: Ana sayfa, Kategoriler, Favoriler, Sepet, Hesabım.
// "Kategoriler" alttan açılan bir liste açar (koleksiyon, kategoriler, vitrinler, rehber). Sepette adet, favorilerde nokta görünür.
// Ödeme sayfasında gösterilmez (ödemeden dikkat dağılmasın; o sayfanın kendi düğmeleri var).
export function BottomNav({ signedIn, categories }: { signedIn: boolean; categories: HeaderCategory[] }) {
  const pathname = usePathname();
  const favoriteCount = useFavorites().length;
  const cartQuantity = cartCount(useCart());
  const [sheet, setSheet] = useState(false);
  const sheetButton = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  // Liste açılınca odak ilk bağlantıya gider; Escape kapatır ve odağı düğmeye döndürür.
  useEffect(() => {
    if (!sheet) return;
    firstLink.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSheet(false);
        sheetButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet]);

  if (pathname.startsWith("/odeme")) return null;

  const accountHref = signedIn ? "/hesabim" : "/giris";
  const close = () => setSheet(false);
  const itemClass = (active: boolean) =>
    `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold tracking-wide transition ${
      active ? "text-gold-light" : "text-paper/80 hover:text-gold-light"
    }`;
  // Etkin sekmenin üstünde ince gold çizgi
  const activeBar = <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-gold-light" />;

  const navLink = (href: string, label: string, icon: ReactNode, active: boolean, badge?: ReactNode) => (
    <Link href={href} onClick={close} aria-current={active ? "page" : undefined} className={itemClass(active)}>
      {active && activeBar}
      <span className="relative">
        {icon}
        {badge}
      </span>
      {label}
    </Link>
  );

  const onShop = sheet || pathname === "/koleksiyon" || pathname.startsWith("/kategori/") || ["/kampanyalar", "/en-cok-satanlar"].includes(pathname);
  const shopLinks = [
    { href: "/koleksiyon", label: "Tüm koleksiyon" },
    ...categories.map((category) => ({ href: `/kategori/${category.slug}`, label: category.name })),
    { href: "/kampanyalar", label: "Kampanyalar" },
    { href: "/en-cok-satanlar", label: "En çok satanlar" },
    { href: "/rehber", label: "Tesbih rehberi" },
  ];

  return (
    <>
      {sheet && (
        <>
          {/* Arka planı karartan katman: dokununca liste kapanır */}
          <div aria-hidden="true" onClick={close} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="alt-kategoriler-baslik"
            className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-50 max-h-[65vh] overflow-y-auto rounded-t-2xl border-t border-gold-light/50 bg-espresso/95 px-4 pt-4 pb-3 text-paper shadow-2xl backdrop-blur-md lg:hidden [&_:focus-visible]:outline-gold-light"
          >
            <div className="flex items-center justify-between">
              <h2 id="alt-kategoriler-baslik" className="font-display text-2xl">
                Alışveriş
              </h2>
              <button type="button" onClick={close} aria-label="Kapat" className="flex h-11 w-11 items-center justify-center rounded-full text-paper/80 transition hover:text-gold-light">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {shopLinks.map((link, index) => (
                <li key={link.href}>
                  <Link
                    ref={index === 0 ? firstLink : undefined}
                    href={link.href}
                    onClick={close}
                    aria-current={pathname === link.href ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 text-sm transition ${
                      pathname === link.href
                        ? "border-gold-light bg-gold-light/10 text-gold-light"
                        : "border-gold-light/30 bg-paper/5 hover:border-gold-light hover:text-gold-light"
                    }`}
                  >
                    <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true" className="shrink-0 text-gold-light">
                      <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" />
                    </svg>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <nav
        aria-label="Alt menü"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-gold-light/40 bg-espresso/95 pb-[env(safe-area-inset-bottom)] text-paper shadow-[0_-8px_24px_rgb(0_0_0/0.35)] backdrop-blur-md lg:hidden [&_:focus-visible]:outline-gold-light"
      >
        <div className="mx-auto flex max-w-xl">
          {navLink(
            "/",
            "Ana sayfa",
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 10.5 12 4l8 6.5V20h-5.5v-6h-5v6H4z" />
            </svg>,
            pathname === "/" && !sheet,
          )}
          <button
            ref={sheetButton}
            type="button"
            aria-expanded={sheet}
            aria-haspopup="dialog"
            onClick={() => setSheet((value) => !value)}
            className={itemClass(onShop)}
          >
            {onShop && activeBar}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
              <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
              <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
              <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
              <path d="M16.75 13.5 20 16.75 16.75 20 13.5 16.75z" />
            </svg>
            Kategoriler
          </button>
          {navLink(
            "/favoriler",
            "Favoriler",
            <HeartIcon filled={pathname === "/favoriler"} size={22} />,
            pathname === "/favoriler" && !sheet,
            favoriteCount > 0 && <span aria-hidden="true" className="absolute -top-0.5 -right-1 h-2.5 w-2.5 rounded-full bg-gold-light ring-2 ring-espresso" />,
          )}
          {navLink(
            "/sepet",
            cartQuantity > 0 ? `Sepet (${cartQuantity})` : "Sepet",
            <BagIcon size={22} />,
            pathname === "/sepet" && !sheet,
            cartQuantity > 0 && (
              <span aria-hidden="true" className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-light px-1 text-[10px] font-bold text-espresso ring-2 ring-espresso">
                {cartQuantity > 99 ? "99+" : cartQuantity}
              </span>
            ),
          )}
          {navLink(
            accountHref,
            signedIn ? "Hesabım" : "Giriş",
            <UserIcon filled={signedIn} />,
            ["/hesabim", "/giris", "/kayit"].some((path) => pathname.startsWith(path)) && !sheet,
          )}
        </div>
      </nav>
      {/* Sayfa sonu alt çubuğun altında kalmasın */}
      <div aria-hidden="true" className="h-[calc(3.5rem+env(safe-area-inset-bottom))] lg:hidden" />
    </>
  );
}
