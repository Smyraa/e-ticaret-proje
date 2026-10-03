"use client";

import { useActionState, useRef } from "react";
import type { DeleteState } from "@/lib/product-form";

type Props = {
  // Sunucu eylemi. Sayfa (sunucu) verir; bu bileşende `.bind` edilmez (bkz. ImageManager'daki açıklama).
  action: (state: DeleteState, formData: FormData) => Promise<DeleteState>;
  confirmText: string; // onay penceresinde sorulan soru
  label: string;
};

// Silme düğmesi: önce tarayıcının onay penceresi çıkar; "Tamam" denirse forma onay yazılır ve gönderilir.
// Onay yazılmadan (JavaScript yok ya da sayfa yüklenmeden) gelen istek sunucuda reddedilir.
export function DeleteButton({ action, confirmText, label }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const confirmation = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction}>
      <input ref={confirmation} type="hidden" name="onay" defaultValue="" />
      <button
        type="submit"
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm(confirmText)) {
            event.preventDefault();
            return;
          }
          if (confirmation.current) confirmation.current.value = "evet";
        }}
        className="min-h-11 border border-danger px-8 text-xs font-semibold tracking-widest text-danger uppercase transition hover:bg-danger hover:text-paper disabled:opacity-60"
      >
        {pending ? "Siliniyor…" : label}
      </button>
      {state?.error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
