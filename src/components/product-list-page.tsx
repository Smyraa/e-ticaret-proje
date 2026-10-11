import Link from "next/link";
import type { ReactNode } from "react";
import type { Product } from "@/lib/products";
import { ProductCard } from "./product-card";

type Props = {
  title: string;
  intro?: ReactNode;
  products: Product[];
  failed?: boolean;
  empty: string; // ürün yoksa gösterilen yazı
  filters?: ReactNode; // süzme formu (kategori sayfası)
  clearHref?: string; // süzme etkinse "Filtreleri temizle" bağlantısı
};

// Kategori ve vitrin sayfalarının ortak düzeni: başlık, açıklama ve ürün ızgarası (sade, açık zemin; desen yok).
export function ProductListPage({ title, intro, products, failed, empty, filters, clearHref }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/koleksiyon"
        className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase transition hover:text-primary"
      >
        ← Tüm koleksiyon
      </Link>
      <h1 className="mt-4 font-display text-4xl">{title}</h1>
      {intro && <div className="mt-3 max-w-2xl text-sm text-muted">{intro}</div>}
      {filters}

      {failed ? (
        <p className="mt-8 rounded-md bg-soft p-4 text-sm text-muted">Ürünler şu an yüklenemedi. Biraz sonra yeniden deneyin.</p>
      ) : products.length === 0 ? (
        <p className="mt-8 rounded-md bg-soft p-4 text-sm text-muted">
          {clearHref ? "Seçtiğiniz filtrelere uygun ürün yok. " : empty}
          {clearHref && (
            <Link href={clearHref} className="underline transition hover:text-primary">
              Filtreleri temizle
            </Link>
          )}
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted">
            {products.length} ürün
            {clearHref && (
              <>
                {" · "}
                <Link href={clearHref} className="underline transition hover:text-primary">
                  Filtreleri temizle
                </Link>
              </>
            )}
          </p>
          <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product, index) => (
              <li key={product.slug} className="reveal">
                <ProductCard product={product} eager={index < 4} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
