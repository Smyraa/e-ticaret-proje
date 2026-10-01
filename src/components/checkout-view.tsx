"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ProductImage } from "@/components/product-image";
import { useCart } from "@/lib/cart";
import { cartLines, linesSubtotal } from "@/lib/cart-lines";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/products";
import { SHIPPING_FEE, shippingLabel } from "@/lib/shipping";
import { useReady } from "@/lib/use-ready";

const inputClass = "mt-2 w-full rounded-md border border-field bg-paper p-3 text-sm";

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  minLength?: number;
  pattern?: string;
  title?: string;
  className?: string;
};

// Zorunlu tek satırlık alan. Kontrolü tarayıcının kendi doğrulaması yapar.
function Field({ label, name, className = "", ...input }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={name} className="text-sm">
        {label}
      </label>
      <input id={name} name={name} required className={inputClass} {...input} />
    </div>
  );
}

// Ödeme sayfasının arayüzü. Hiçbir şey kaydedilmez ve gönderilmez: alanlar yalnızca tarayıcıdaki form içinde durur,
// "Siparişi tamamla" yalnızca demo bildirimi gösterir. Kart alanı yok: canlıda kart bilgisini ödeme kuruluşunun
// kendi güvenli formu alacak.
export function CheckoutView({ products }: { products: Product[] }) {
  const cart = useCart();
  const ready = useReady();
  const [submitted, setSubmitted] = useState(false);

  if (!ready) {
    return <p className="mt-8 text-sm text-muted">Yükleniyor…</p>;
  }

  const lines = cartLines(cart, products);
  const payable = lines.filter((line) => line.qty > 0);

  if (payable.length === 0) {
    return (
      <div className="mt-8 rounded-md bg-soft p-6 text-sm text-muted">
        <p>Sepetinizde siparişe uygun ürün yok. Ödeme için stokta olan bir ürün eklemelisiniz.</p>
        <Link
          href="/koleksiyon"
          className="mt-4 inline-flex min-h-11 items-center bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
        >
          Koleksiyona git
        </Link>
      </div>
    );
  }

  const subtotal = linesSubtotal(payable);
  const note = cart.note.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // zorunlu alanlar dolduysa buraya gelinir; sayfa yenilenmez
    setSubmitted(true);
  }

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-start">
      <form id="odeme-formu" onSubmit={handleSubmit} className="space-y-10">
        <section aria-labelledby="iletisim-baslik">
          <h2 id="iletisim-baslik" className="font-display text-2xl">
            İletişim
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Ad soyad" name="ad-soyad" autoComplete="name" className="sm:col-span-2" />
            <Field
              label="Telefon"
              name="telefon"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              minLength={10}
            />
            <Field
              label="E-posta"
              name="eposta"
              type="email"
              autoComplete="email"
              inputMode="email"
            />
          </div>
        </section>

        <section aria-labelledby="teslimat-baslik">
          <h2 id="teslimat-baslik" className="font-display text-2xl">
            Teslimat adresi
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="adres" className="text-sm">
                Adres
              </label>
              <textarea
                id="adres"
                name="adres"
                rows={3}
                required
                autoComplete="street-address"
                className={`${inputClass} resize-y`}
              />
            </div>
            <Field label="İl" name="il" autoComplete="address-level1" />
            <Field label="İlçe" name="ilce" autoComplete="address-level2" />
            <Field
              label="Posta kodu"
              name="posta-kodu"
              autoComplete="postal-code"
              inputMode="numeric"
              pattern="[0-9]{5}"
              title="5 haneli posta kodu"
            />
            <div className="sm:col-span-2">
              <label htmlFor="siparis-notu" className="text-sm">
                Sipariş notu <span className="text-muted">(isteğe bağlı)</span>
              </label>
              <textarea
                id="siparis-notu"
                name="siparis-notu"
                rows={2}
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="odeme-baslik">
          <h2 id="odeme-baslik" className="font-display text-2xl">
            Ödeme
          </h2>
          <p className="mt-4 rounded-md border border-dashed border-line p-4 text-sm text-muted">
            Ödeme adımı henüz hazır değil. Canlıda ödeme kuruluşunun güvenli formu burada açılacak;
            kart bilgisi bu sitede hiç girilmez.
          </p>
        </section>
      </form>

      <aside className="rounded-lg bg-soft p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-2xl">Sipariş özeti</h2>
          <Link
            href="/sepet"
            className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase underline transition hover:text-primary"
          >
            Sepeti düzenle
          </Link>
        </div>

        <ul className="mt-4 divide-y divide-line">
          {payable.map(({ product, qty }) => (
            <li key={product.slug} className="flex gap-3 py-3">
              <div className="w-14 shrink-0">
                <ProductImage product={product} sizes="56px" className="rounded-md" badge={false} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{product.name}</p>
                <p className="text-xs text-muted">
                  {qty} × {formatPrice(product.price)}
                </p>
              </div>
              <p className="text-sm">{formatPrice(product.price * qty)}</p>
            </li>
          ))}
        </ul>
        {lines.length > payable.length && (
          <p className="text-xs text-muted">Tükenen ürünler siparişe eklenmez.</p>
        )}

        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Ara toplam</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          {cart.gift && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Hediye paketi</dt>
              <dd>Ücretsiz</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Kargo</dt>
            <dd>{shippingLabel}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
            <dt className="font-semibold">Toplam</dt>
            <dd className="font-display text-2xl">{formatPrice(subtotal + SHIPPING_FEE)}</dd>
          </div>
        </dl>
        {cart.gift && note && (
          <p className="mt-3 text-xs break-words text-muted">Not kartı: {note}</p>
        )}

        {/* Ekran okuyucular bildirimi duysun diye bu alan her zaman sayfada durur. */}
        <div role="status">
          {submitted && (
            <p className="mt-6 rounded-md bg-paper p-3 text-sm">
              Demo: sipariş oluşturulmadı, ödeme alınmadı.
            </p>
          )}
        </div>

        <button
          type="submit"
          form="odeme-formu"
          className="mt-6 min-h-11 w-full bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
        >
          Siparişi tamamla
        </button>
      </aside>
    </div>
  );
}
