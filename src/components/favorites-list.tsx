"use client";

import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { useFavorites } from "@/lib/favorites";
import type { Product } from "@/lib/products";
import { useReady } from "@/lib/use-ready";

// Sunucu tüm ürünleri verir (sayıları az); hangilerinin favori olduğunu tarayıcı bilir.
export function FavoritesList({ products }: { products: Product[] }) {
  const favorites = useFavorites();
  const ready = useReady();

  if (!ready) {
    return <p className="mt-8 text-sm text-muted">Yükleniyor…</p>;
  }

  const bySlug = new Map(products.map((product) => [product.slug, product]));
  // Eklenme sırası korunur; silinmiş ürünlere ait eski kayıtlar atlanır.
  const items = favorites
    .map((slug) => bySlug.get(slug))
    .filter((product): product is Product => Boolean(product));

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-md bg-soft p-6 text-sm text-muted">
        <p>Henüz favoriniz yok. Beğendiğiniz ürünlerin kalp simgesine basarak buraya ekleyebilirsiniz.</p>
        <Link
          href="/koleksiyon"
          className="mt-4 inline-flex min-h-11 items-center bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
        >
          Koleksiyona git
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mt-6 text-sm text-muted">{items.length} ürün</p>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((product, index) => (
          <li key={product.slug} className="reveal">
            <ProductCard product={product} eager={index < 4} />
          </li>
        ))}
      </ul>
    </>
  );
}
