"use client";

import { useEffect, useState } from "react";
import { addToCart, useCart } from "@/lib/cart";
import { BagIcon } from "./bag-icon";

type Props = { slug: string; name: string; stock: number };

// Ürün kartındaki "Sepete ekle": fareyle kartın üzerine gelince (ya da klavyeyle odaklanınca) görselin altında belirir;
// dokunmatik ekranlarda (üzerine gelme yok) hep görünür. Eklenince kısa bir süre "Sepete eklendi" yazar.
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
        className="absolute inset-x-3 bottom-3 z-10 inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-gold-light/70 bg-espresso/85 px-4 text-xs font-semibold tracking-widest text-paper uppercase shadow-lg backdrop-blur-sm transition duration-300 hover:bg-bordo disabled:cursor-not-allowed disabled:bg-espresso/60 disabled:text-paper/80 [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:translate-y-0 [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100"
      >
        <BagIcon size={18} />
        {label}
      </button>
      {/* Ekran okuyucular eklemeyi duysun */}
      <span role="status" className="sr-only">
        {added ? `${name} sepete eklendi` : ""}
      </span>
    </>
  );
}
