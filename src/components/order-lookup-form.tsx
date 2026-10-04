"use client";

import { useActionState, useEffect, useRef } from "react";
import type { LookupErrors, LookupField, LookupState } from "@/lib/order-lookup-form";

const inputClass = "mt-2 w-full rounded-md border bg-paper p-3 text-sm";

type FieldProps = {
  label: string;
  name: string; // formdaki alan adı (ve kutunun kimliği)
  field: LookupField; // hata iletisinin anahtarı
  errors: LookupErrors;
  value: string; // kutuda başlangıçta görünen değer (hata sonrası müşterinin yazdığı)
  hint?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "email";
  placeholder?: string;
  autoCapitalize?: "characters"; // telefonda klavye büyük harfle başlasın
  spellCheck?: boolean;
  className?: string;
};

// Etiket + kutu + (varsa) ipucu + hata iletisi. İpucu ve hata kutuya aria-describedby ile bağlanır.
function Field({ label, name, field, errors, value, hint, className = "", ...input }: FieldProps) {
  const error = errors[field];
  const hintId = `${name}-ipucu`;
  const errorId = `${name}-hata`;
  const described = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ");

  return (
    <div>
      <label htmlFor={name} className="text-sm">
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={value}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={described || undefined}
        className={`${inputClass} ${error ? "border-danger" : "border-field"} ${className}`}
        {...input}
      />
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type Props = {
  // Sunucu eylemi (sipariş sorgulama). Sayfa (sunucu) verir; bu bileşende `.bind` edilmez.
  action: (state: LookupState, formData: FormData) => Promise<LookupState>;
};

// Sipariş sorgulama formu: sipariş numarası + sipariş verirken yazılan e-posta. Doğruysa sunucu müşteriyi sipariş
// sayfasına yönlendirir; yanlışsa her durumda aynı genel ileti çıkar.
export function OrderLookupForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state?.errors ?? {};

  useEffect(() => {
    if (state?.errors && Object.keys(state.errors).length > 0) {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="mt-8 space-y-5">
      <Field
        label="Sipariş numarası"
        name="siparis-no"
        field="number"
        errors={errors}
        value={state?.values?.number ?? ""}
        hint="Örnek: TA-7KQ2-X9DM"
        placeholder="TA-7KQ2-X9DM"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="tracking-wider uppercase placeholder:normal-case"
      />
      <Field
        label="E-posta"
        name="eposta"
        field="email"
        errors={errors}
        value={state?.values?.email ?? ""}
        hint="Sipariş verirken yazdığınız e-posta adresi"
        type="email"
        autoComplete="email"
        inputMode="email"
      />

      {state?.message && (
        <p role="alert" className="rounded-md bg-soft p-3 text-sm font-semibold text-danger">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60"
      >
        {pending ? "Aranıyor…" : "Siparişi göster"}
      </button>
    </form>
  );
}
