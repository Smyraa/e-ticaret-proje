"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import type { ProductField, ProductFormState, ProductFormValues } from "@/lib/product-form";

type Props = {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  initial: ProductFormValues; // boş form ya da var olan ürünün değerleri
  materials: string[]; // kayıtlı malzemeler: yazarken öneri olarak çıkar
  submitLabel: string;
  showSample?: boolean; // yalnız örnek ürünlerde: "Örnek ürün" işaretini kaldırma kutusu
};

type FieldProps = {
  name: ProductField;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  required?: boolean;
  multiline?: boolean;
  inputMode?: "numeric";
  list?: string;
};

const controlClass = "mt-2 w-full rounded-md border bg-paper p-3 text-sm";

// Etiket + giriş kutusu + ipucu + hata iletisi. Hata ve ipucu kutuya aria-describedby ile bağlanır.
function Field({ name, label, value, error, hint, required, multiline, inputMode, list }: FieldProps) {
  const id = `urun-${name}`;
  const describedBy = [hint && `${id}-ipucu`, error && `${id}-hata`].filter(Boolean).join(" ") || undefined;
  const shared = {
    id,
    name,
    defaultValue: value,
    autoComplete: "off",
    "aria-required": required || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: `${controlClass} ${error ? "border-danger" : "border-field"}`,
  };

  return (
    <div>
      <label htmlFor={id} className="text-sm">
        {label}
        {required && <span className="text-muted"> (zorunlu)</span>}
      </label>
      {multiline ? (
        <textarea {...shared} rows={7} />
      ) : (
        <input {...shared} type="text" inputMode={inputMode} list={list} />
      )}
      {hint && (
        <p id={`${id}-ipucu`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-hata`} className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Check({ name, label, hint, checked }: { name: string; label: string; hint: string; checked: boolean }) {
  const id = `urun-${name}`;
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={checked}
        aria-describedby={`${id}-ipucu`}
        className="mt-0.5 size-6 shrink-0 accent-primary"
      />
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-semibold">
          {label}
        </label>
        <p id={`${id}-ipucu`} className="text-xs text-muted">
          {hint}
        </p>
      </div>
    </div>
  );
}

// Ürün ekleme ve düzenleme formu (ikisinde de aynı). Doğrulama sunucuda yapılır; hata varsa yazılanlar korunur,
// ilk hatalı kutuya odaklanılır.
export function ProductForm({ action, initial, materials, submitLabel, showSample }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  // Kaydedildi iletisi, kaydın ardından forma yeniden dokunulana kadar görünür.
  const [editedAfter, setEditedAfter] = useState<ProductFormState>(undefined);

  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const hasErrors = Object.keys(errors).length > 0;
  const savedVisible = state?.saved === true && editedAfter !== state;

  useEffect(() => {
    if (state?.errors) formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      onChange={() => setEditedAfter(state)}
      className="mt-8 space-y-6"
    >
      <Field name="name" label="Ürün adı" required value={values.name} error={errors.name} />

      <div>
        <Field
          name="material"
          label="Malzeme"
          required
          list="urun-malzemeler"
          value={values.material}
          error={errors.material}
          hint="Örn. Damla kehribar. Yazarken kayıtlı malzemeler önerilir; yenisini de yazabilirsiniz."
        />
        <datalist id="urun-malzemeler">
          {materials.map((material) => (
            <option key={material} value={material} />
          ))}
        </datalist>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="size" label="Ölçü" value={values.size} error={errors.size} hint="Örn. 8 mm tane · 33 tane" />
        <Field name="weight" label="Ağırlık" value={values.weight} error={errors.weight} hint="Örn. 42 g" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          name="price"
          label="Fiyat (TL)"
          required
          inputMode="numeric"
          value={values.price}
          error={errors.price}
          hint="Tam lira, kuruşsuz. Örn. 3500"
        />
        <Field
          name="stock"
          label="Stok (adet)"
          required
          inputMode="numeric"
          value={values.stock}
          error={errors.stock}
          hint="Stokta kaç tane var? Yoksa 0 yazın."
        />
      </div>

      <Field
        name="craft"
        label="İşçilik"
        value={values.craft}
        error={errors.craft}
        hint="Kısa tutun; ürün sayfasında “İşçilik” satırında görünür."
      />

      <Field
        name="story"
        label="Hikâye"
        multiline
        value={values.story}
        error={errors.story}
        hint="Ürünü anlatan birkaç cümle. Boş satır bırakarak paragraf ayırabilirsiniz."
      />

      <Check
        name="published"
        label="Yayında (sitede görünsün)"
        hint="İşaretli değilse ürün taslak olarak kalır ve sitede görünmez."
        checked={values.published}
      />

      {showSample && (
        <Check
          name="sample"
          label="Örnek ürün"
          hint="Demo içeriğidir; sitede “Örnek” etiketiyle görünür. Gerçek bir ürüne çevirmek için işareti kaldırın."
          checked={values.sample}
        />
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60"
        >
          {pending ? "Kaydediliyor…" : submitLabel}
        </button>
        <Link
          href="/yonetim/urunler"
          className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase underline transition hover:text-primary"
        >
          Ürünlere dön
        </Link>
      </div>

      <p role="status" className="min-h-6 text-sm">
        {savedVisible ? "Değişiklikler kaydedildi." : ""}
      </p>
      {hasErrors && (
        <p role="alert" className="text-sm font-semibold text-danger">
          Formda düzeltilmesi gereken alanlar var. İlk hatalı alana gidildi.
        </p>
      )}
      {state?.message && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
