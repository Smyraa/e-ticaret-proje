"use client";

import { useEffect, useState } from "react";
import { recentProducts } from "@/app/(site)/urun/actions";
import type { Product } from "@/lib/products";
import { RECENT_MAX, recentStore } from "@/lib/recently-viewed";
import { ProductCard } from "./product-card";

// Ürün sayfasının altında "Son baktıklarınız": bu tarayıcıda daha önce açılan ürünler (açık olan hariç, en çok 4).
// Sayfa açılınca bu ürün listenin başına yazılır. Liste boşsa bölüm hiç görünmez.
export function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const previous = recentStore.get().filter((slug) => slug !== currentSlug);
    recentStore.set([currentSlug, ...previous].slice(0, RECENT_MAX));
    if (previous.length === 0) return;
    let cancelled = false;
    recentProducts(previous.slice(0, 8)).then((list) => {
      if (!cancelled) setProducts(list.slice(0, 4));
    });
    return () => {
      cancelled = true;
    };
  }, [currentSlug]);

  if (products.length === 0) return null;
  return (
    <section aria-labelledby="son-bakilan" className="mt-16">
      <h2 id="son-bakilan" className="font-display text-3xl">
        Son baktıklarınız
      </h2>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.slug}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
