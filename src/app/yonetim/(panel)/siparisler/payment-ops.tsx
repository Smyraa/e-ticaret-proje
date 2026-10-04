"use client";

import { useActionState, useRef } from "react";
import type { OrderActionState } from "@/lib/order-admin-form";

export type PaymentOp = "check" | "refund" | "apply";

type Props = {
  // Sunucu eylemi. Sayfa (sunucu) verir; sipariş numarası ve ödeme kimliği orada bağlanır, bu bileşende `.bind` edilmez.
  action: (state: OrderActionState, formData: FormData) => Promise<OrderActionState>;
  ops: PaymentOp[];
};

const OPS: Record<PaymentOp, { label: string; confirm?: string; danger?: boolean }> = {
  check: { label: "Bekleyen ödemeyi kontrol et" },
  apply: { label: "Siparişe işle", confirm: "Ödeme siparişe işlensin mi? Sipariş “ödendi” olur ve ürünlerin stoğu düşer." },
  refund: {
    label: "Ödemeyi iade et",
    confirm: "Ödeme müşterinin kartına iade edilsin mi? Bu işlem geri alınamaz.",
    danger: true,
  },
};

// Ödeme işlem düğmeleri (kontrol, siparişe işleme, iade). Onay gerektirenlerde önce tarayıcının onay penceresi çıkar, "Tamam"
// denirse forma onay yazılır (JavaScript yoksa sunucu işlemi reddeder). Sonuç düğmelerin üstünde gösterilir.
// Bileşen düğme kalmasa bile (iade edilince düğme kalkar) sayfada durur: sonuç iletisi ekrandan kaybolmasın.
export function PaymentOps({ action, ops }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const confirmation = useRef<HTMLInputElement>(null);

  return (
    <div className={ops.length > 0 || state ? "mt-3" : undefined}>
      {state?.message && (
        <p role="status" className="mb-3 rounded-md bg-soft p-3 text-sm">
          {state.message}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="mb-3 text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}
      {ops.length > 0 && (
        <form action={formAction}>
          <input ref={confirmation} type="hidden" name="onay" defaultValue="" />
          <div className="flex flex-wrap gap-3">
            {ops.map((op) => {
              const spec = OPS[op];
              return (
                <button
                  key={op}
                  type="submit"
                  name="islem"
                  value={op}
                  disabled={pending}
                  onClick={(event) => {
                    if (spec.confirm && !window.confirm(spec.confirm)) {
                      event.preventDefault();
                      return;
                    }
                    if (confirmation.current) confirmation.current.value = spec.confirm ? "evet" : "";
                  }}
                  className={`min-h-11 px-5 text-xs font-semibold tracking-widest uppercase transition disabled:opacity-60 ${
                    spec.danger
                      ? "border border-danger text-danger hover:bg-danger hover:text-paper"
                      : "border border-espresso hover:border-primary hover:text-primary"
                  }`}
                >
                  {spec.label}
                </button>
              );
            })}
          </div>
        </form>
      )}
    </div>
  );
}
