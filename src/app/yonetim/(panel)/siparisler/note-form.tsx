"use client";

import { useActionState } from "react";
import type { OrderActionState } from "@/lib/order-admin-form";

type Props = {
  // Sunucu eylemi. Sayfa (sunucu) verir; sipariş numarası orada bağlanır, bu bileşende `.bind` edilmez.
  action: (state: OrderActionState, formData: FormData) => Promise<OrderActionState>;
  initial: string; // kayıtlı not
  max: number;
};

// Yönetici notu: yalnız yönetim görür (müşteri sayfasında yok).
export function NoteForm({ action, initial, max }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="mt-3">
      <label htmlFor="yonetici-notu" className="sr-only">
        Yönetici notu
      </label>
      <textarea
        id="yonetici-notu"
        name="not"
        rows={4}
        maxLength={max}
        defaultValue={initial}
        aria-describedby="yonetici-notu-ipucu"
        className="w-full rounded-md border border-field bg-paper p-3 text-sm"
      />
      <p id="yonetici-notu-ipucu" className="mt-1 text-xs text-muted">
        Yalnız yönetim görür; en çok {max} karakter. Boş bırakıp kaydederseniz not silinir.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 min-h-11 border border-espresso px-6 text-xs font-semibold tracking-widest uppercase transition hover:border-primary hover:text-primary disabled:opacity-60"
      >
        {pending ? "Kaydediliyor…" : "Notu kaydet"}
      </button>
      {state?.message && (
        <p role="status" className="mt-3 text-sm">
          {state.message}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
