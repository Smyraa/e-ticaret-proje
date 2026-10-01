"use client";

import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { NOTE_MAX, removeFromCart, setGift, setNote, setQuantity, useCart } from "@/lib/cart";
import { cartLines, linesSubtotal } from "@/lib/cart-lines";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/products";
import { shippingNote } from "@/lib/shipping";
import { useReady } from "@/lib/use-ready";

const stepButton =
  "flex h-11 w-11 items-center justify-center rounded-full border border-line text-lg transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink";

// Sunucu tüm ürünleri verir (sayıları az); sepette hangilerinin kaç adet olduğunu tarayıcı bilir.
export function CartView({ products }: { products: Product[] }) {
  const cart = useCart();
  const ready = useReady();

  if (!ready) {
    return <p className="mt-8 text-sm text-muted">Yükleniyor…</p>;
  }

  const lines = cartLines(cart, products);

  if (lines.length === 0) {
    return (
      <div className="mt-8 rounded-md bg-soft p-6 text-sm text-muted">
        <p>Sepetiniz boş. Beğendiğiniz ürünleri ürün sayfasından sepete ekleyebilirsiniz.</p>
        <Link
          href="/koleksiyon"
          className="mt-4 inline-block bg-espresso px-8 py-3 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
        >
          Koleksiyona git
        </Link>
      </div>
    );
  }

  const subtotal = linesSubtotal(lines);
  const canCheckout = lines.some((line) => line.qty > 0); // en az bir ürün alınabiliyorsa ödemeye geçilir

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
      <ul className="divide-y divide-line border-y border-line">
        {lines.map(({ product, requested, qty }) => (
          <li key={product.slug} className="flex gap-4 py-5">
            <Link
              href={`/urun/${product.slug}`}
              className="w-20 shrink-0 sm:w-24"
              aria-hidden="true"
              tabIndex={-1}
            >
              <ProductImage product={product} sizes="96px" className="rounded-md" badge={false} />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-[11px] tracking-widest text-muted uppercase">{product.material}</p>
              <Link
                href={`/urun/${product.slug}`}
                className="mt-1 font-semibold transition hover:text-primary"
              >
                {product.name}
              </Link>
              <p className="mt-1 text-sm text-muted">{formatPrice(product.price)}</p>

              {product.stock <= 0 ? (
                <p className="mt-3 text-sm text-muted">Bu ürün tükendi.</p>
              ) : (
                <div className="mt-3 flex items-center">
                  <button
                    type="button"
                    className={stepButton}
                    aria-label={`Adedi azalt: ${product.name}`}
                    disabled={qty <= 1}
                    onClick={() => setQuantity(product.slug, qty - 1, product.stock)}
                  >
                    −
                  </button>
                  <output className="w-10 text-center">{qty}</output>
                  <button
                    type="button"
                    className={stepButton}
                    aria-label={`Adedi artır: ${product.name}`}
                    disabled={qty >= product.stock}
                    onClick={() => setQuantity(product.slug, qty + 1, product.stock)}
                  >
                    +
                  </button>
                </div>
              )}
              {product.stock > 0 && requested > product.stock && (
                <p className="mt-2 text-xs text-muted">Stokta yalnızca {product.stock} adet kaldı.</p>
              )}

              <div className="mt-auto flex items-center justify-between gap-4 pt-3">
                <button
                  type="button"
                  onClick={() => removeFromCart(product.slug)}
                  className="-ml-2 px-2 py-2 text-xs tracking-widest text-muted uppercase underline transition hover:text-primary"
                  aria-label={`Sepetten kaldır: ${product.name}`}
                >
                  Kaldır
                </button>
                {qty > 0 && <p className="font-display text-xl">{formatPrice(product.price * qty)}</p>}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="rounded-lg bg-soft p-6">
        <h2 className="font-display text-2xl">Sipariş özeti</h2>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Ara toplam</dt>
            <dd className="font-semibold">{formatPrice(subtotal)}</dd>
          </div>
          {cart.gift && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Hediye paketi</dt>
              <dd>Ücretsiz</dd>
            </div>
          )}
        </dl>
        <p className="mt-2 text-xs text-muted">{shippingNote}</p>

        <div className="mt-6 border-t border-line pt-6">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={cart.gift}
              onChange={(event) => setGift(event.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
            />
            <span>
              <span className="font-semibold">Hediye paketi</span>{" "}
              <span className="text-muted">(ücretsiz, tüm sipariş için)</span>
            </span>
          </label>

          {cart.gift && (
            <div className="mt-4">
              <label htmlFor="hediye-notu" className="text-sm">
                Not kartı mesajı <span className="text-muted">(isteğe bağlı)</span>
              </label>
              <textarea
                id="hediye-notu"
                rows={3}
                maxLength={NOTE_MAX}
                value={cart.note}
                onChange={(event) => setNote(event.target.value)}
                className="mt-2 w-full resize-y rounded-md border border-line bg-paper p-3 text-sm"
              />
              <p className="mt-1 text-right text-xs text-muted">
                {cart.note.length}/{NOTE_MAX}
              </p>
            </div>
          )}
        </div>

        {canCheckout ? (
          <Link
            href="/odeme"
            className="mt-6 flex min-h-11 w-full items-center justify-center bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
          >
            Ödemeye geç
          </Link>
        ) : (
          <>
            <button
              type="button"
              disabled
              className="mt-6 min-h-11 w-full bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ödemeye geç
            </button>
            <p className="mt-3 text-xs text-muted">Sipariş vermek için sepette stokta olan bir ürün olmalı.</p>
          </>
        )}
      </aside>
    </div>
  );
}
