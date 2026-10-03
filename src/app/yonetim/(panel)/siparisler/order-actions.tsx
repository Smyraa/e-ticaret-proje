"use client";

import { useActionState, useEffect, useRef } from "react";
import type { OrderActionState } from "@/lib/order-admin-form";
import type { OrderShipment } from "@/lib/order-model";
import type { OrderCommand } from "@/lib/order-status";

type Props = {
  // Sunucu eylemi. Sayfa (sunucu) verir; sipariş numarası orada bağlanır, bu bileşende `.bind` edilmez.
  action: (state: OrderActionState, formData: FormData) => Promise<OrderActionState>;
  commands: OrderCommand[]; // bu sipariş için şu an geçerli işlemler (sunucu hesaplar)
  shipped: boolean; // sipariş zaten kargoda: form kargo bilgisini düzeltir
  shipment?: OrderShipment;
  carriers: string[]; // kargo firması önerileri
};

type Tone = "primary" | "plain" | "danger";
type ButtonSpec = { label: string; tone: Tone; confirm?: string };

const BUTTONS: Partial<Record<OrderCommand, ButtonSpec>> = {
  paid: { label: "Ödendi olarak işaretle", tone: "primary", confirm: "Sipariş ödendi olarak işaretlensin mi? Ürünlerin stoğu düşer." },
  preparing: { label: "Hazırlanıyor", tone: "plain" },
  deliver: { label: "Teslim edildi", tone: "primary", confirm: "Sipariş teslim edildi olarak işaretlensin mi?" },
  back: {
    label: "Bir önceki adıma al",
    tone: "plain",
    confirm: "Sipariş bir önceki duruma alınsın mı? (Ödeme işareti geri alınırsa düşülen stok iade edilir.)",
  },
  "stock-deduct": { label: "Stoğu şimdi düş", tone: "plain", confirm: "Ürünlerin stoğu şimdi düşülsün mü?" },
  "stock-return": { label: "Stoğu şimdi iade et", tone: "plain", confirm: "Düşülmüş stok şimdi iade edilsin mi?" },
  cancel: {
    label: "Siparişi iptal et",
    tone: "danger",
    confirm: "Sipariş iptal edilsin mi? Stok düşülmüşse iade edilir. İptal geri alınamaz.",
  },
};

// Görünme sırası: ilerletenler, geri alma, onarım, en sonda iptal.
const ORDER: OrderCommand[] = ["paid", "preparing", "deliver", "back", "stock-deduct", "stock-return", "cancel"];

const TONE_CLASS: Record<Tone, string> = {
  primary: "bg-espresso text-paper hover:bg-primary",
  plain: "border border-espresso hover:border-primary hover:text-primary",
  danger: "border border-danger text-danger hover:bg-danger hover:text-paper",
};

const inputClass = "mt-2 w-full rounded-md border bg-paper p-3 text-sm";

// İşlem sonucu: başarı iletisi (role=status) ya da hata (role=alert) ve varsa stok sorunlarının listesi.
function Result({ state }: { state: OrderActionState }) {
  return (
    <>
      {state?.message && (
        <p role="status" className="my-4 rounded-md bg-soft p-3 text-sm">
          {state.message}
        </p>
      )}
      {state?.error && (
        <div role="alert" className="my-4 text-sm font-semibold text-danger">
          <p>{state.error}</p>
          {state.problems && state.problems.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 font-normal">
              {state.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

// Sipariş işlem düğmeleri ve kargoya verme formu. Her düğme aynı eylemi kendi "islem" değeriyle çağırır; onay gerektirenlerde
// önce tarayıcının onay penceresi çıkar, "Tamam" denirse forma onay yazılır (JavaScript yoksa sunucu işlemi reddeder).
// İki form tek bir sonuç alanını paylaşır ve sonuç formların dışında gösterilir: iptal gibi son duruma geçen işlemlerde
// formlar kaybolsa bile "iptal edildi, stok iade edildi" iletisi ekranda kalır.
export function OrderActions({ action, commands, shipped, shipment, carriers }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const confirmation = useRef<HTMLInputElement>(null);
  const shipForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.errors) shipForm.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);

  const buttons = ORDER.filter((command) => commands.includes(command));
  const canShip = commands.includes("ship");
  const errors = state?.errors ?? {};

  return (
    <div>
      <Result state={state} />

      {buttons.length > 0 && (
        <form action={formAction}>
          <input ref={confirmation} type="hidden" name="onay" defaultValue="" />
          <div className="flex flex-wrap gap-3">
            {buttons.map((command) => {
              const spec = BUTTONS[command]!;
              return (
                <button
                  key={command}
                  type="submit"
                  name="islem"
                  value={command}
                  disabled={pending}
                  onClick={(event) => {
                    if (spec.confirm && !window.confirm(spec.confirm)) {
                      event.preventDefault();
                      return;
                    }
                    if (confirmation.current) confirmation.current.value = spec.confirm ? "evet" : "";
                  }}
                  className={`min-h-11 px-5 text-xs font-semibold tracking-widest uppercase transition disabled:opacity-60 ${TONE_CLASS[spec.tone]}`}
                >
                  {spec.label}
                </button>
              );
            })}
          </div>
        </form>
      )}

      {canShip && (
        <form ref={shipForm} action={formAction} noValidate className={buttons.length > 0 ? "mt-8 border-t border-line pt-6" : "mt-4"}>
          <input type="hidden" name="islem" value="ship" />
          <h3 className="text-sm font-semibold">{shipped ? "Kargo bilgisi" : "Kargoya ver"}</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="kargo-firmasi" className="text-sm">
                Kargo firması
              </label>
              <input
                id="kargo-firmasi"
                name="kargo-firmasi"
                list="kargo-firmalari"
                autoComplete="off"
                maxLength={40}
                defaultValue={state?.values?.carrier ?? shipment?.carrier ?? ""}
                aria-invalid={errors.carrier ? true : undefined}
                aria-describedby={errors.carrier ? "kargo-firmasi-hata" : undefined}
                className={`${inputClass} ${errors.carrier ? "border-danger" : "border-field"}`}
              />
              <datalist id="kargo-firmalari">
                {carriers.map((carrier) => (
                  <option key={carrier} value={carrier} />
                ))}
              </datalist>
              {errors.carrier && (
                <p id="kargo-firmasi-hata" className="mt-1 text-sm font-semibold text-danger">
                  {errors.carrier}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="takip-no" className="text-sm">
                Takip numarası <span className="text-muted">(varsa)</span>
              </label>
              <input
                id="takip-no"
                name="takip-no"
                autoComplete="off"
                maxLength={60}
                defaultValue={state?.values?.trackingNumber ?? shipment?.trackingNumber ?? ""}
                aria-invalid={errors.trackingNumber ? true : undefined}
                aria-describedby={errors.trackingNumber ? "takip-no-hata" : undefined}
                className={`${inputClass} ${errors.trackingNumber ? "border-danger" : "border-field"}`}
              />
              {errors.trackingNumber && (
                <p id="takip-no-hata" className="mt-1 text-sm font-semibold text-danger">
                  {errors.trackingNumber}
                </p>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-4 min-h-11 bg-espresso px-6 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60"
          >
            {pending ? "Kaydediliyor…" : shipped ? "Kargo bilgisini güncelle" : "Kargoya verildi olarak işaretle"}
          </button>
        </form>
      )}

      {buttons.length === 0 && !canShip && <p className="text-sm text-muted">Bu sipariş için yapılacak işlem yok.</p>}
    </div>
  );
}
