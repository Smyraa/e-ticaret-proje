"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { ProductImage } from "@/components/product-image";
import { useCart } from "@/lib/cart";
import { cartLines, linesSubtotal } from "@/lib/cart-lines";
import { formatPrice } from "@/lib/format";
import type { CheckoutErrors, CheckoutField, CheckoutState } from "@/lib/order-form";
import type { Product } from "@/lib/products";
import { shippingLabel } from "@/lib/shipping";
import { useReady } from "@/lib/use-ready";

const inputClass = "mt-2 w-full rounded-md border bg-paper p-3 text-sm";

type FieldProps = {
  label: string;
  name: string; // formdaki alan adı (ve kutunun kimliği)
  field: CheckoutField; // hata iletisinin anahtarı
  errors: CheckoutErrors;
  value: string; // kutuda başlangıçta görünen değer (hata sonrası müşterinin yazdığı)
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  multiline?: boolean;
  rows?: number;
  optional?: boolean;
  className?: string;
};

// Etiket + kutu + hata iletisi. Hata kutuya aria-describedby ile bağlanır.
function Field({ label, name, field, errors, value, multiline, rows = 3, optional, className = "", ...input }: FieldProps) {
  const error = errors[field];
  const errorId = `${name}-hata`;
  const shared = {
    id: name,
    name,
    defaultValue: value,
    required: !optional,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
    className: `${inputClass} ${error ? "border-danger" : "border-field"}${multiline ? " resize-y" : ""}`,
  };

  return (
    <div className={className}>
      <label htmlFor={name} className="text-sm">
        {label}
        {optional && <span className="text-muted"> (isteğe bağlı)</span>}
      </label>
      {multiline ? <textarea {...shared} rows={rows} /> : <input {...shared} {...input} />}
      {error && (
        <p id={errorId} className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type Props = {
  products: Product[];
  shippingFee: number;
  paymentNote: string; // "Ödeme" bölümünde müşteriye söylenen (ödeme ayarına göre sunucu belirler)
  submitLabel: string; // gönder düğmesinin yazısı
  defaults?: { name: string; email: string }; // giriş yapmış müşterinin adı ve e-postası (form ilk açılınca)
  // Sunucu eylemi (sipariş verme). Sayfa (sunucu) verir; bu bileşende `.bind` edilmez.
  action: (state: CheckoutState, formData: FormData) => Promise<CheckoutState>;
};

// Ödeme sayfası: iletişim + teslimat formu ve sipariş özeti. Gönder düğmesi siparişi sunucuda kaydeder; kartla ödeme açıksa
// müşteriyi ödeme kuruluşunun sayfasına, değilse sipariş sayfasına götürür. Kart alanı hiç yok: kart bilgisini yalnız ödeme
// kuruluşunun kendi güvenli sayfası alır. Sepet tarayıcıda durur, bu yüzden form sunucuda çizilir ama sepet hazır olana kadar
// gizli kalır (gizli alanlar sunucuda çizilen biçimle gelir; sepet içeriği tarayıcıda forma yazılır).
export function CheckoutView({ products, shippingFee, paymentNote, submitLabel, defaults, action }: Props) {
  const cart = useCart();
  const ready = useReady();
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.errors && Object.keys(state.errors).length > 0) {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    }
  }, [state]);

  const lines = cartLines(cart, products);
  const payable = lines.filter((line) => line.qty > 0);
  const visible = ready && payable.length > 0;

  const subtotal = linesSubtotal(payable);
  const note = cart.note.trim();
  const values = state?.values;
  const errors = state?.errors ?? {};
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      {!ready && <p className="mt-8 text-sm text-muted">Yükleniyor…</p>}

      {ready && payable.length === 0 && (
        <div className="mt-8 rounded-md bg-soft p-6 text-sm text-muted">
          <p>Sepetinizde siparişe uygun ürün yok. Ödeme için stokta olan bir ürün eklemelisiniz.</p>
          <Link
            href="/koleksiyon"
            className="mt-4 inline-flex min-h-11 items-center bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
          >
            Koleksiyona git
          </Link>
        </div>
      )}

      <div className={visible ? "mt-8 grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-start" : "hidden"}>
        <form id="odeme-formu" ref={formRef} action={formAction} noValidate className="space-y-10">
          <input
            type="hidden"
            name="sepet"
            value={JSON.stringify(payable.map(({ product, qty }) => ({ slug: product.slug, qty })))}
          />
          {cart.gift && <input type="hidden" name="hediye" value="evet" />}
          {cart.gift && <input type="hidden" name="hediye-notu" value={note} />}

          <section aria-labelledby="iletisim-baslik">
            <h2 id="iletisim-baslik" className="font-display text-2xl">
              İletişim
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Ad soyad"
                name="ad-soyad"
                field="name"
                errors={errors}
                value={values?.name ?? defaults?.name ?? ""}
                autoComplete="name"
                className="sm:col-span-2"
              />
              <Field
                label="Telefon"
                name="telefon"
                field="phone"
                errors={errors}
                value={values?.phone ?? ""}
                type="tel"
                autoComplete="tel"
                inputMode="tel"
              />
              <Field
                label="E-posta"
                name="eposta"
                field="email"
                errors={errors}
                value={values?.email ?? defaults?.email ?? ""}
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
              <Field
                label="Adres"
                name="adres"
                field="address"
                errors={errors}
                value={values?.address ?? ""}
                multiline
                autoComplete="street-address"
                className="sm:col-span-2"
              />
              <Field
                label="İl"
                name="il"
                field="city"
                errors={errors}
                value={values?.city ?? ""}
                autoComplete="address-level1"
              />
              <Field
                label="İlçe"
                name="ilce"
                field="district"
                errors={errors}
                value={values?.district ?? ""}
                autoComplete="address-level2"
              />
              <Field
                label="Posta kodu"
                name="posta-kodu"
                field="postalCode"
                errors={errors}
                value={values?.postalCode ?? ""}
                autoComplete="postal-code"
                inputMode="numeric"
              />
              <Field
                label="Sipariş notu"
                name="siparis-notu"
                field="note"
                errors={errors}
                value={values?.note ?? ""}
                multiline
                rows={2}
                optional
                className="sm:col-span-2"
              />
            </div>
          </section>

          <section aria-labelledby="odeme-baslik">
            <h2 id="odeme-baslik" className="font-display text-2xl">
              Ödeme
            </h2>
            <p className="mt-4 rounded-md border border-dashed border-line p-4 text-sm text-muted">{paymentNote}</p>
          </section>

          <div>
            <div className="flex items-start gap-3">
              <input
                id="onay"
                name="onay"
                type="checkbox"
                value="evet"
                required
                defaultChecked={values?.consent ?? false}
                aria-invalid={errors.consent ? true : undefined}
                aria-describedby={errors.consent ? "onay-hata" : undefined}
                className="mt-0.5 size-6 shrink-0 accent-primary"
              />
              <label htmlFor="onay" className="text-sm">
                <Link
                  href="/mesafeli-satis"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline transition hover:text-primary"
                >
                  Ön bilgilendirme ve mesafeli satış sözleşmesini
                  <span className="sr-only"> (yeni sekmede açılır)</span>
                </Link>{" "}
                okudum, kabul ediyorum.
              </label>
            </div>
            {errors.consent && (
              <p id="onay-hata" className="mt-1 text-sm font-semibold text-danger">
                {errors.consent}
              </p>
            )}
            <p className="mt-3 text-xs text-muted">
              Bilgileriniz siparişinizi işlemek için kullanılır. Ayrıntı için{" "}
              <Link href="/gizlilik" className="underline transition hover:text-primary">
                Gizlilik ve KVKK
              </Link>{" "}
              sayfasına bakın.
            </p>
          </div>
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
          {lines.length > payable.length && <p className="text-xs text-muted">Tükenen ürünler siparişe eklenmez.</p>}

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
              <dd>{shippingLabel(shippingFee)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
              <dt className="font-semibold">Toplam</dt>
              <dd className="font-display text-2xl">{formatPrice(subtotal + shippingFee)}</dd>
            </div>
          </dl>
          {cart.gift && note && <p className="mt-3 text-xs break-words text-muted">Not kartı: {note}</p>}

          {state?.message && (
            <p role="alert" className="mt-6 rounded-md bg-paper p-3 text-sm font-semibold text-danger">
              {state.message}{" "}
              <Link href="/sepet" className="underline transition hover:text-primary">
                Sepeti düzenle
              </Link>
            </p>
          )}
          {hasErrors && (
            <p role="alert" className="mt-6 text-sm font-semibold text-danger">
              Formda düzeltilmesi gereken alanlar var. İlk hatalı alana gidildi.
            </p>
          )}

          <button
            type="submit"
            form="odeme-formu"
            disabled={pending}
            className="mt-6 min-h-11 w-full bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60"
          >
            {pending ? "Sipariş oluşturuluyor…" : submitLabel}
          </button>
        </aside>
      </div>
    </>
  );
}
