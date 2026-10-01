"use client";

import Link from "next/link";
import { addToCart, useCart } from "@/lib/cart";
import { FavoriteButton } from "./favorite-button";

type Props = {
  slug: string;
  name: string;
  stock: number;
};

// Ürün sayfasındaki düğmeler: "Sepete ekle" ve "Favorilere ekle".
// Ürün sepetteyse altında küçük bir bilgi ve sepete bağlantı çıkar.
export function ProductActions({ slug, name, stock }: Props) {
  const inCart = useCart().items.find((item) => item.slug === slug)?.qty ?? 0;
  const soldOut = stock <= 0;
  const allInCart = !soldOut && inCart >= stock;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={soldOut || allInCart}
          onClick={() => addToCart(slug, stock)}
          className="inline-flex min-h-11 items-center justify-center bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-espresso"
        >
          {soldOut ? "Tükendi" : allInCart ? "Tüm stok sepette" : "Sepete ekle"}
        </button>
        <FavoriteButton slug={slug} name={name} variant="full" />
      </div>

      {/* Ekran okuyucular değişikliği duyabilsin diye bu alan her zaman sayfada durur. */}
      <p role="status" className="mt-3 min-h-5 text-sm text-muted">
        {inCart > 0 && (
          <>
            Sepetinizde {inCart} adet var.{" "}
            <Link href="/sepet" className="underline transition hover:text-primary">
              Sepeti gör
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
