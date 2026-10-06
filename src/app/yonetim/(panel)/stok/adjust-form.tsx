"use client";

import { useActionState } from "react";
import type { StockAdjustState } from "./actions";

type Props = {
  id: string; // kutu kimlikleri için ürünün adresi
  name: string;
  action: (state: StockAdjustState, formData: FormData) => Promise<StockAdjustState>;
};

const control = "mt-1 w-full rounded-md border border-field bg-paper p-2.5 text-sm";

// Bir ürünün stoğuna ekleme/çıkarma formu. Sonuç (ya da hata) formun altında okunur.
export function AdjustForm({ id, name, action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-[auto_6rem_minmax(0,1fr)_auto] sm:items-end">
      <fieldset className="flex gap-2">
        <legend className="sr-only">{name}: işlem</legend>
        {[
          ["ekle", "Ekle"],
          ["cikar", "Çıkar"],
        ].map(([value, label]) => (
          <label
            key={value}
            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-field px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-soft"
          >
            <input type="radio" name="yon" value={value} defaultChecked={value === "ekle"} className="accent-primary" />
            {label}
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor={`adet-${id}`} className="text-xs text-muted">
          Adet
        </label>
        <input id={`adet-${id}`} name="adet" inputMode="numeric" required maxLength={5} defaultValue="1" className={control} />
      </div>
      <div>
        <label htmlFor={`aciklama-${id}`} className="text-xs text-muted">
          Açıklama (isteğe bağlı)
        </label>
        <input id={`aciklama-${id}`} name="aciklama" maxLength={120} placeholder="Örn. yeni üretim, sayım farkı" className={control} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 bg-espresso px-5 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60"
      >
        {pending ? "Kaydediliyor…" : "Kaydet"}
        <span className="sr-only">: {name}</span>
      </button>
      <p role="status" className={`text-sm sm:col-span-4 ${state?.error ? "font-semibold text-danger" : "text-muted"}`}>
        {state?.error ?? state?.message ?? ""}
      </p>
    </form>
  );
}
