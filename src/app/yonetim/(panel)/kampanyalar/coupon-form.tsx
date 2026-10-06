"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { COUPON_LIMITS, type CouponFormState, type CouponFormValues } from "@/lib/coupon-model";
import { Check, Field } from "../form-fields";

type Props = {
  action: (state: CouponFormState, formData: FormData) => Promise<CouponFormState>;
  initial: CouponFormValues;
  submitLabel: string;
  used?: number; // düzenlemede: şimdiye kadarki kullanım
};

// Kupon ekleme / düzenleme formu. Doğrulama sunucuda; hata varsa yazılanlar korunur ve ilk hatalı kutuya gidilir.
export function CouponForm({ action, initial, submitLabel, used }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const [type, setType] = useState(values.type);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.errors) formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} noValidate className="mt-8 space-y-6">
      <Field
        prefix="kupon"
        name="code"
        label="Kupon kodu"
        required
        maxLength={COUPON_LIMITS.codeMax}
        value={values.code}
        error={errors.code}
        hint={`Müşterinin sepette yazacağı kod. ${COUPON_LIMITS.codeMin}–${COUPON_LIMITS.codeMax} karakter: harf (A–Z), rakam ve tire; küçük harf büyüğe çevrilir. Örn. BAHAR10`}
      />

      <fieldset aria-describedby={errors.type ? "kupon-type-hata" : undefined}>
        <legend className="text-sm">İndirim türü</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {[
            ["percent", "Yüzde (%)"],
            ["fixed", "Sabit tutar (TL)"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-field bg-paper px-4 text-sm has-[:checked]:border-primary has-[:checked]:bg-soft"
            >
              <input
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
                className="accent-primary"
              />
              {label}
            </label>
          ))}
        </div>
        {errors.type && (
          <p id="kupon-type-hata" className="mt-1 text-sm font-semibold text-danger">
            {errors.type}
          </p>
        )}
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          prefix="kupon"
          name="amount"
          label={type === "fixed" ? "İndirim tutarı (TL)" : "İndirim yüzdesi (%)"}
          required
          inputMode="numeric"
          maxLength={9}
          value={values.amount}
          error={errors.amount}
          hint={
            type === "fixed"
              ? "Tam lira. Sepet tutarını aşamaz (toplam eksiye düşmez); kargoya uygulanmaz."
              : `1–${COUPON_LIMITS.percentMax}. Ürün ara toplamına uygulanır, tam liraya aşağı yuvarlanır; kargoya uygulanmaz.`
          }
        />
        <Field
          prefix="kupon"
          name="endsOn"
          type="date"
          label="Son geçerlilik günü"
          required
          value={values.endsOn}
          error={errors.endsOn}
          hint="Kupon bu günün sonuna (Türkiye saatiyle 23.59) kadar geçerli."
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          prefix="kupon"
          name="usageLimit"
          label="Toplam kullanım sınırı"
          inputMode="numeric"
          maxLength={7}
          value={values.usageLimit}
          error={errors.usageLimit}
          hint={`Kupon toplam kaç siparişte kullanılabilir. Sınırsız için boş bırakın.${used !== undefined ? ` Şimdiye kadar: ${used}.` : ""}`}
        />
        <Field
          prefix="kupon"
          name="minSubtotal"
          label="En az sepet tutarı (TL)"
          inputMode="numeric"
          maxLength={10}
          value={values.minSubtotal}
          error={errors.minSubtotal}
          hint="Kupon bu tutar ve üzeri sepetlerde geçerli. Yoksa boş bırakın."
        />
      </div>

      <Check
        prefix="kupon"
        name="onePerCustomer"
        label="Müşteri başına tek kullanım"
        hint="Aynı müşteri (hesabıyla ya da misafirse e-posta adresiyle) bu kuponu bir kez kullanabilir."
        checked={values.onePerCustomer}
      />
      <Check
        prefix="kupon"
        name="allowGuests"
        label="Misafirler de kullanabilsin"
        hint="İşaretli değilse yalnız giriş yapmış müşteriler kullanabilir."
        checked={values.allowGuests}
      />
      <Check
        prefix="kupon"
        name="active"
        label="Etkin"
        hint="İşaretli değilse kupon kabul edilmez (bilgileri saklanır)."
        checked={values.active}
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60"
        >
          {pending ? "Kaydediliyor…" : submitLabel}
        </button>
        <Link
          href="/yonetim/kampanyalar"
          className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase underline transition hover:text-primary"
        >
          Kampanyalara dön
        </Link>
      </div>
      <p role="status" className="min-h-6 text-sm">
        {state?.saved ? "Kupon kaydedildi." : ""}
      </p>
      {state?.message && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
