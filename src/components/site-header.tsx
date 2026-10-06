"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cartCount, useCart } from "@/lib/cart";
import { useFavorites } from "@/lib/favorites";
import { BagIcon } from "./bag-icon";
import { HeartIcon } from "./heart-icon";
import { UserIcon } from "./user-icon";

// Atölye, iletişim ve bilgi sayfalarının bağlantıları alt bilgide durur (kullanıcı kararı); üst menüde yalnızca alışveriş bağlantıları var.
const links = [
  { href: "/koleksiyon", label: "Koleksiyon" },
  { href: "/koleksiyon#q", label: "Ara" }, // koleksiyon sayfasındaki arama kutusuna götürür
];

const linkClass =
  "text-xs tracking-widest uppercase transition hover:text-primary";

// Favoriler ya da sepet doluyken simgenin sağ üstünde görünen nokta (sayı yok).
const dotClass =
  "absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-paper";

// signedIn: müşteri giriş yapmış mı (sunucu söyler). Hesap simgesi girişliyse "Hesabım"a, değilse giriş sayfasına götürür.
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  // Mobil menünün açık/kapalı durumu tarayıcıda tutulur.
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const favoriteCount = useFavorites().length;
  const cart = useCart();
  const cartQuantity = cartCount(cart);
  const accountHref = signedIn ? "/hesabim" : "/giris";
  const onAccount = ["/hesabim", "/giris", "/kayit"].includes(pathname);

  // Hesap simgesi: geniş ekranda kalp ve sepetin yanında; telefonda menü düğmesinin yanında (sağda üç simge sığmıyor,
  // dokunma alanları 44 pikselin altına düşüyordu; iki yan eşit kalınca logo da ortada kalır).
  const accountLink = (
    <Link
      href={accountHref}
      aria-label={signedIn ? "Hesabım" : "Giriş yap"}
      aria-current={pathname === accountHref ? "page" : undefined}
      onClick={() => setOpen(false)}
      className={`relative flex h-11 w-11 items-center justify-center transition hover:text-primary ${
        onAccount ? "text-primary" : "text-ink"
      }`}
    >
      <UserIcon filled={signedIn} />
    </Link>
  );

  return (
    <header className="border-b border-line">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-6 py-6">
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

          <div className="-ml-2.5 flex items-center md:hidden">
            <button
              type="button"
              className="p-2.5"
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
            {accountLink}
          </div>
        </div>

        <Link href="/" className="text-center" onClick={() => setOpen(false)}>
          <p className="font-display text-3xl tracking-[0.16em] sm:tracking-[0.22em]">TAURA</p>
          <p className="-mt-1 text-[11px] tracking-[0.3em] text-muted uppercase sm:tracking-[0.38em]">
            Tesbihçilik
          </p>
        </Link>

        {/* Sağ taraf: hesap, favoriler ve sepet; favori ve sepet doluyken simgenin üstünde nokta görünür */}
        <div className="-mr-2.5 flex items-center justify-end">
          <div className="hidden md:flex">{accountLink}</div>
          <Link
            href="/favoriler"
            aria-label={
              favoriteCount > 0 ? `Favorilerim, ${favoriteCount} ürün` : "Favorilerim"
            }
            aria-current={pathname === "/favoriler" ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={`relative flex h-11 w-11 items-center justify-center transition hover:text-primary ${
              pathname === "/favoriler" ? "text-primary" : "text-ink"
            }`}
          >
            <HeartIcon filled={pathname === "/favoriler"} />
            {favoriteCount > 0 && <span aria-hidden="true" className={dotClass} />}
          </Link>

          <Link
            href="/sepet"
            aria-label={cartQuantity > 0 ? `Sepetim, ${cartQuantity} ürün` : "Sepetim"}
            aria-current={pathname === "/sepet" ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={`relative flex h-11 w-11 items-center justify-center transition hover:text-primary ${
              pathname === "/sepet" ? "text-primary" : "text-ink"
            }`}
          >
            <BagIcon />
            {cart.items.length > 0 && <span aria-hidden="true" className={dotClass} />}
          </Link>
        </div>
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
