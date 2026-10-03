import type { Metadata } from "next";
import { ProductImage } from "@/components/product-image";
import { requireAdmin } from "@/lib/auth";
import { formatPrice, stockText } from "@/lib/format";
import { getProducts } from "@/lib/products";

export const metadata: Metadata = { title: "Ürünler · Yönetim · TAURA" };

// Ürün listesi (yalnızca görüntüleme). Ekleme ve düzenleme sonraki adımda eklenir.
export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await getProducts();

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="font-display text-4xl">Ürünler</h1>
      <p className="mt-3 text-sm text-muted">Toplam {products.length} ürün.</p>

      {products.length === 0 ? (
        <p className="mt-8 rounded-lg bg-paper p-6 text-sm text-muted">Henüz ürün yok.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-lg bg-paper shadow-sm">
          {products.map((product) => (
            <li key={product.slug} className="flex gap-4 p-4">
              {/* Süs görseli: ürün adı hemen yanında yazıyor, ekran okuyucu iki kez okumasın. */}
              <div aria-hidden="true" className="w-14 shrink-0 self-start">
                <ProductImage product={product} sizes="56px" className="rounded-md" badge={false} />
              </div>

              <div className="min-w-0 flex-1 md:flex md:items-center md:gap-4">
                <div className="min-w-0 md:flex-1">
                  <p className="text-sm font-semibold">
                    {product.name}
                    {product.sample && (
                      <span className="ml-2 rounded-sm bg-espresso px-2 py-1 align-middle text-[10px] font-normal tracking-wider text-paper uppercase">
                        Örnek
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] tracking-widest text-muted uppercase">{product.material}</p>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-0 md:mt-0 md:shrink-0">
                  <p className="font-display text-xl md:w-24 md:text-right">{formatPrice(product.price)}</p>
                  <p
                    className={`text-xs md:w-28 ${product.stock > 0 ? "text-muted" : "font-semibold text-danger"}`}
                  >
                    {stockText(product.stock)}
                  </p>
                  <a
                    href={`/urun/${product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase underline transition hover:text-primary"
                  >
                    Sitede gör
                    <span className="sr-only">
                      : {product.name} (yeni sekmede açılır)
                    </span>
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
