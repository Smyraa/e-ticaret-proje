"use client";

import { useEffect, useState } from "react";
import { addToCart, useCart } from "@/lib/cart";
import { BagIcon } from "./bag-icon";

type Props = { slug: string; name: string; stock: number };

// Ürün kartındaki "Sepete ekle": fareyle kartın üzerine gelince (ya da klavyeyle odaklanınca) görselin altında belirir;
// dokunmatik ekranlarda (üzerine gelme yok) hep görünür. Eklenince kısa bir süre "Sepete eklendi" yazar (telefonda onay işareti).
// Telefonda görselin sağ alt köşesinde yuvarlak simge düğmesidir (iki kart yan yana sığsın).
export function QuickAdd({ slug, name, stock }: Props) {
  const inCart = useCart().items.find((item) => item.slug === slug)?.qty ?? 0;
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(timer);
  }, [added]);

  const soldOut = stock <= 0;
  const allInCart = !soldOut && inCart >= stock;
  const label = soldOut ? "Tükendi" : added ? "Sepete eklendi" : allInCart ? "Tüm stok sepette" : "Sepete ekle";

  return (
    <>
      <button
        type="button"
        disabled={soldOut || allInCart}
        onClick={() => {
          addToCart(slug, stock);
          setAdded(true);
        }}
        aria-label={`${label}: ${name}`}
        className="absolute right-2 bottom-2 z-10 inline-flex h-10 w-10 items-center justify-center gap-2 rounded-full border sm:inset-x-3 sm:bottom-3 sm:h-auto sm:min-h-11 sm:w-auto sm:rounded-md border-gold-light/70 bg-espresso/85 text-xs font-semibold tracking-widest text-paper uppercase shadow-lg sm:px-4 backdrop-blur-sm transition duration-300 hover:bg-bordo disabled:cursor-not-allowed disabled:bg-espresso/60 disabled:text-paper/80 [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100"
      >
        {added ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <BagIcon size={18} />
        )}
        {/* Telefonda yalnız simge (yuvarlak düğme, kartın köşesinde); daha geniş ekranda yazılı şerit */}
        <span className="hidden sm:inline">{label}</span>
      </button>
      {/* Ekran okuyucular eklemeyi duysun */}
      <span role="status" className="sr-only">
        {added ? `${name} sepete eklendi` : ""}
      </span>
    </>
  );
}
