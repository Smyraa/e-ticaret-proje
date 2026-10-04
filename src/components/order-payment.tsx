"use client";

import { useActionState } from "react";
import type { PayState } from "@/lib/payment-model";

type Action = (state: PayState, formData: FormData) => Promise<PayState>;

type Props = {
  // Sunucu eylemleri. Sipariş sayfası (sunucu) verir; sipariş anahtarı orada bağlanır, bu bileşende `.bind` edilmez.
  startAction: Action;
  checkAction: Action;
  canCheck: boolean; // bekleyen bir ödeme oturumu var: "Ödememi kontrol et" gösterilir
  startLabel: string;
};

const primary =
  "min-h-11 bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60";
const plain =
  "min-h-11 border border-espresso px-8 text-xs font-semibold tracking-widest uppercase transition hover:border-primary hover:text-primary disabled:opacity-60";

// Sipariş sayfasındaki ödeme düğmeleri: "Kartla öde" (ödeme sayfasına gider) ve "Ödememi kontrol et".
export function OrderPayment({ startAction, checkAction, canCheck, startLabel }: Props) {
  const [startState, startForm, starting] = useActionState(startAction, undefined);
  const [checkState, checkForm, checking] = useActionState(checkAction, undefined);

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap gap-3">
        <form action={startForm}>
          <button type="submit" disabled={starting} className={primary}>
            {starting ? "Ödeme sayfası açılıyor…" : startLabel}
          </button>
        </form>
        {canCheck && (
          <form action={checkForm}>
            <button type="submit" disabled={checking} className={plain}>
              {checking ? "Kontrol ediliyor…" : "Ödememi kontrol et"}
            </button>
          </form>
        )}
      </div>
      {startState?.error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {startState.error}
        </p>
      )}
      {checkState?.error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {checkState.error}
        </p>
      )}
      {checkState?.message && (
        <p role="status" className="rounded-md bg-soft p-3 text-sm">
          {checkState.message}
        </p>
      )}
    </div>
  );
}
