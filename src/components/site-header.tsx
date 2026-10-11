"use client";

import Form from "next/form";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState, useSyncExternalStore, type FocusEvent } from "react";
import { cartCount, useCart } from "@/lib/cart";
import { useFavorites } from "@/lib/favorites";
import { BagIcon } from "./bag-icon";
import { HeartIcon } from "./heart-icon";
import { UserIcon } from "./user-icon";

export type HeaderCategory = { slug: string; name: string };

// Atölye, iletişim ve bilgi sayfalarının bağlantıları alt bilgide durur (kullanıcı kararı); üst menüde alışveriş bağlantıları var.
// Kategoriler (varsa) "Koleksiyon"dan sonra açılır liste olarak gelir.
const links = [
  { href: "/koleksiyon", label: "Koleksiyon" },
  { href: "/kampanyalar", label: "Kampanyalar" },
  { href: "/en-cok-satanlar", label: "En çok satanlar" },
  { href: "/siparis", label: "Sipariş sorgula" }, // misafir müşteri siparişini numara + e-postayla bulur
];

// Menü yazısı: altında üzerine gelince ortadan açılan gold çizgi.
const navLinkClass =
  "relative inline-flex min-h-11 items-center text-[12px] font-semibold tracking-[0.22em] uppercase transition hover:text-gold-light after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-center after:scale-x-0 after:bg-gold-light after:transition after:duration-300 hover:after:scale-x-100";

// Favoriler ya da sepet doluyken simgenin sağ üstünde görünen nokta (sayı yok).
const dotClass = "absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-gold-light ring-2 ring-espresso";

function Diamond({ className = "" }: { className?: string }) {
  return (
    <svg width="7" height="7" viewBox="0 0 10 10" aria-hidden="true" className={`shrink-0 text-gold-light/70 ${className}`}>
      <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" />
    </svg>
  );
}

// Sayfa biraz aşağı kaydırıldı mı? Üst menü yapışkandır; kayınca incelir (daha az yer kaplar).
function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}
const useScrolled = () => useSyncExternalStore(subscribeScroll, () => window.scrollY > 40, () => false);

// Ürün arama kutusu: koleksiyon sayfasına ?q= ile gider (JavaScript olmadan da çalışan sıradan bir GET formu;
// next/form sayfayı yenilemeden geçer). Koleksiyon sayfası ad ve malzeme içinde arar.
function SearchBox({ onSearch, className = "" }: { onSearch?: () => void; className?: string }) {
  const id = useId();
  return (
    <Form action="/koleksiyon" role="search" onSubmit={onSearch} className={`flex items-center ${className}`}>
      <label htmlFor={id} className="sr-only">
        Ürün ara
      </label>
      <div className="flex h-11 w-full items-center rounded-full border border-gold-light/45 bg-paper/10 pl-4 transition focus-within:border-gold-light focus-within:bg-paper/15">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-gold-light">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-4.2-4.2" />
        </svg>
        <input
          id={id}
          name="q"
          type="search"
          maxLength={80}
          placeholder="Tesbih, kehribar, kuka…"
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-paper placeholder:text-paper/55 focus:outline-none"
        />
        <button
          type="submit"
          className="h-full shrink-0 rounded-r-full border-l border-gold-light/45 px-4 text-[11px] font-semibold tracking-[0.22em] text-gold-light uppercase transition hover:bg-gold-light hover:text-espresso"
        >
          Ara
        </button>
      </div>
    </Form>
  );
}

// Kategoriler açılır listesi: fareyle üzerine gelince ya da tıklayınca açılır; Escape ya da dışarı tıklama kapatır.
function CategoryMenu({ categories, active }: { categories: HeaderCategory[]; active: boolean }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pointerType = useRef(""); // son basışın türü: fare tıklaması listeyi açık tutar (üzerine gelince zaten açıldı)
  const closeIfOutside = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  };

  return (
    <div
      className="relative"
      onPointerEnter={(event) => event.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setOpen(false)}
      onBlur={closeIfOutside}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="kategori-menusu"
        onPointerDown={(event) => (pointerType.current = event.pointerType)}
        onClick={() => {
          setOpen((value) => (pointerType.current === "mouse" ? true : !value));
          pointerType.current = "";
        }}
        className={`${navLinkClass} gap-1.5 ${active || open ? "text-gold-light after:scale-x-100" : "text-paper/85"}`}
      >
        Kategoriler
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className={`transition duration-300 ${open ? "rotate-180" : ""}`}>
          <path d="M5 9l7 7 7-7" />
        </svg>
      </button>
      <div
        id="kategori-menusu"
        className={`absolute top-full left-1/2 z-50 -translate-x-1/2 pt-2 transition duration-200 ${
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"
        }`}
      >
        <ul className="min-w-60 rounded-xl border border-gold-light/40 bg-espresso/95 p-2 shadow-xl shadow-black/40 backdrop-blur-md">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/kategori/${category.slug}`}
                onClick={() => setOpen(false)}
                className="group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-paper transition hover:bg-gold-light/10 hover:text-gold-light"
              >
                <Diamond />
                <span className="flex-1">{category.name}</span>
                <span aria-hidden="true" className="text-gold-light/0 transition group-hover:translate-x-0.5 group-hover:text-gold-light">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// signedIn: müşteri giriş yapmış mı (sunucu söyler). Hesap simgesi girişliyse "Hesabım"a, değilse giriş sayfasına götürür.
// categories: üst menüdeki açılır liste (yoksa liste görünmez).
export function SiteHeader({ signedIn, categories }: { signedIn: boolean; categories: HeaderCategory[] }) {
  // Mobil menünün açık/kapalı durumu tarayıcıda tutulur.
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const pathname = usePathname();
  const favoriteCount = useFavorites().length;
  const cart = useCart();
  const cartQuantity = cartCount(cart);
  const accountHref = signedIn ? "/hesabim" : "/giris";
  const onAccount = ["/hesabim", "/giris", "/kayit"].includes(pathname);
  const onCategory = pathname.startsWith("/kategori/");

  // Hesap simgesi: geniş ekranda (≥ 1024 px) kalp ve sepetin yanında; telefon ve tablette menü düğmesinin yanında (sağda üç simge sığmıyor,
  // dokunma alanları 44 pikselin altına düşüyordu; iki yan eşit kalınca logo da ortada kalır).
  const accountLink = (
    <Link
      href={accountHref}
      aria-label={signedIn ? "Hesabım" : "Giriş yap"}
      aria-current={pathname === accountHref ? "page" : undefined}
      onClick={() => setOpen(false)}
      className={`relative flex h-11 w-11 items-center justify-center transition hover:text-gold-light ${
        onAccount ? "text-gold-light" : "text-paper"
      }`}
    >
      <UserIcon filled={signedIn} />
    </Link>
  );

  return (
    <header
      className={`sticky top-0 z-40 border-b border-gold-light/40 text-paper backdrop-blur-md transition-colors duration-300 [&_:focus-visible]:outline-gold-light ${
        scrolled ? "bg-espresso/90 shadow-lg shadow-black/30" : "bg-espresso/55"
      }`}
    >
      <div
        className={`mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-6 transition-[padding] duration-300 ${
          scrolled ? "py-2" : "py-5"
        }`}
      >
        <div>
          <SearchBox className="hidden max-w-xs lg:flex" />

          <div className="-ml-2.5 flex items-center lg:hidden">
            <button
              type="button"
              className="p-2.5"
              aria-expanded={open}
              aria-controls="mobil-menu"
              aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
              onClick={() => setOpen((value) => !value)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
            {accountLink}
          </div>
        </div>

        <Link href="/" className="text-center" onClick={() => setOpen(false)}>
          <p
            className={`font-display tracking-[0.16em] transition-[font-size] duration-300 sm:tracking-[0.22em] ${
              scrolled ? "text-2xl" : "text-3xl sm:text-4xl"
            }`}
          >
            TAURA
          </p>
          <p className="-mt-0.5 flex items-center justify-center gap-2 text-[11px] tracking-[0.3em] text-gold-light uppercase sm:tracking-[0.38em]">
            <span aria-hidden="true" className="h-px w-4 bg-gold-light/60 sm:w-6" />
            Tesbihçilik
            <span aria-hidden="true" className="h-px w-4 bg-gold-light/60 sm:w-6" />
          </p>
        </Link>

        {/* Sağ taraf: hesap, favoriler ve sepet; favori ve sepet doluyken simgenin üstünde nokta görünür */}
        <div className="-mr-2.5 flex items-center justify-end">
          <div className="hidden lg:flex">{accountLink}</div>
          <Link
            href="/favoriler"
            aria-label={favoriteCount > 0 ? `Favorilerim, ${favoriteCount} ürün` : "Favorilerim"}
            aria-current={pathname === "/favoriler" ? "page" : undefined}
            onClick={() => setOpen(false)}
            className={`relative flex h-11 w-11 items-center justify-center transition hover:text-gold-light ${
              pathname === "/favoriler" ? "text-gold-light" : "text-paper"
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
            className={`relative flex h-11 w-11 items-center justify-center transition hover:text-gold-light ${
              pathname === "/sepet" ? "text-gold-light" : "text-paper"
            }`}
          >
            <BagIcon />
            {cart.items.length > 0 && <span aria-hidden="true" className={dotClass} />}
          </Link>
        </div>
      </div>

      {/* Geniş ekranda ikinci sıra: alışveriş menüsü, aralarda gold baklava */}
      <nav aria-label="Ana menü" className="hidden border-t border-gold-light/20 lg:block">
        <ul className="mx-auto flex max-w-6xl items-center justify-center gap-6 px-6">
          {links.map((link, index) => {
            const active = pathname === link.href;
            return (
              <li key={link.href} className="flex items-center gap-6">
                {index > 0 && <Diamond />}
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`${navLinkClass} ${active ? "text-gold-light after:scale-x-100" : "text-paper/85"}`}
                >
                  {link.label}
                </Link>
                {index === 0 && categories.length > 0 && (
                  <>
                    <Diamond />
                    <CategoryMenu categories={categories} active={onCategory} />
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {open && (
        <nav id="mobil-menu" className="max-h-[75vh] overflow-y-auto border-t border-gold-light/30 lg:hidden" aria-label="Mobil menü">
          <SearchBox onSearch={() => setOpen(false)} className="px-6 py-4" />
          <ul className="border-t border-gold-light/20">
            {links.map((link) => (
              <li key={link.href} className="border-b border-gold-light/20 last:border-b-0">
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className="flex items-center gap-3 px-6 py-4 text-xs font-semibold tracking-widest uppercase transition hover:text-gold-light"
                >
                  <Diamond />
                  {link.label}
                </Link>
                {link.href === "/koleksiyon" && categories.length > 0 && (
                  <ul className="pb-2">
                    {categories.map((category) => (
                      <li key={category.slug}>
                        <Link
                          href={`/kategori/${category.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex min-h-11 items-center pr-6 pl-12 text-sm text-paper/85 transition hover:text-gold-light"
                        >
                          {category.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
