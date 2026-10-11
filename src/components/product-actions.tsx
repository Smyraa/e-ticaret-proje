"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { addToCart, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { useReady } from "@/lib/use-ready";
import { FavoriteButton } from "./favorite-button";

type Props = {
  slug: string;
  name: string;
  stock: number;
  price: number;
  oldPrice: number | null;
};

// Ürün sayfasındaki düğmeler: "Sepete ekle" ve "Favorilere ekle".
// Ürün sepetteyse altında küçük bir bilgi ve sepete bağlantı çıkar.
// Telefonda (< 1024 px) asıl "Sepete ekle" düğmesi ekranda görünmüyorsa altta sabit bir şerit çıkar: ad, fiyat ve "Sepete ekle".
export function ProductActions({ slug, name, stock, price, oldPrice }: Props) {
  const mainButton = useRef<HTMLButtonElement>(null);
  const [showBar, setShowBar] = useState(false);
  const ready = useReady(); // şerit yalnız tarayıcıda, sayfanın köküne çizilir
  useEffect(() => {
    const button = mainButton.current;
    if (!button) return;
    const observer = new IntersectionObserver(([entry]) =>
      setShowBar(!entry.isIntersecting),
    );
    observer.observe(button);
    return () => observer.disconnect();
  }, []);
  const inCart = useCart().items.find((item) => item.slug === slug)?.qty ?? 0;
  const soldOut = stock <= 0;
  const allInCart = !soldOut && inCart >= stock;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <button
          ref={mainButton}
          type="button"
          disabled={soldOut || allInCart}
          onClick={() => addToCart(slug, stock)}
          className="inline-flex min-h-12 flex-1 items-center justify-center bg-espresso px-8 sm:flex-none text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-espresso"
        >
          {soldOut ? "Tükendi" : allInCart ? "Tüm stok sepette" : "Sepete ekle"}
        </button>
        <FavoriteButton
          slug={slug}
          name={name}
          variant="full"
          className="flex-1 justify-center sm:flex-none"
        />
      </div>

      {/* Ekran okuyucular değişikliği duyabilsin diye bu alan her zaman sayfada durur. */}
      <p role="status" className="mt-3 min-h-5 text-sm text-muted">
        {inCart > 0 && (
          <>
            Sepetinizde {inCart} adet var.{" "}
            <Link
              href="/sepet"
              className="underline transition hover:text-primary"
            >
              Sepeti gör
            </Link>
          </>
        )}
      </p>

      {/* Telefonda sabit satın alma şeridi (asıl düğme ekran dışındayken). body'ye taşınır: içerik paneli buğu (backdrop-filter)
          kullandığı için içindeki "fixed" öğeler ekrana değil panele göre konumlanır. */}
      {ready &&
        createPortal(
          <div
            aria-hidden={!showBar}
            className={`fixed inset-x-0 bottom-0 z-30 border-t border-gold-light/40 bg-espresso/95 px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] text-paper shadow-[0_-8px_24px_rgb(0_0_0/0.35)] backdrop-blur-md transition duration-300 lg:hidden ${
              showBar ? "translate-y-0" : "pointer-events-none translate-y-full"
            }`}
          >
            <div className="mx-auto flex max-w-xl items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-paper/80">{name}</p>
                <p className="flex items-baseline gap-2">
                  <span
                    className={`font-display text-xl ${oldPrice ? "text-gold-light" : ""}`}
                  >
                    {formatPrice(price)}
                  </span>
                  {oldPrice && (
                    <s className="text-xs text-paper/60">
                      {formatPrice(oldPrice)}
                    </s>
                  )}
                </p>
              </div>
              <button
                type="button"
                tabIndex={showBar ? 0 : -1}
                disabled={soldOut || allInCart}
                onClick={() => addToCart(slug, stock)}
                className="min-h-11 shrink-0 rounded-md border border-gold-light/70 bg-bordo px-5 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-gold-light hover:text-espresso disabled:cursor-not-allowed disabled:opacity-60"
              >
                {soldOut
                  ? "Tükendi"
                  : allInCart
                    ? "Tüm stok sepette"
                    : "Sepete ekle"}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
