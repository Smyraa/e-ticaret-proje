"use client";

import { useActionState, useState } from "react";
import type { AddressFormState } from "@/app/(site)/hesabim/actions";
import { Field, PlaceFields, submitKeepingValues } from "./form-field";

type Props = {
  action: (state: AddressFormState, formData: FormData) => Promise<AddressFormState>;
  defaultName: string;
};

// "Hesabım" → "Yeni adres ekle". Kaydedilince form kapanır ve boşalır.
export function AddressBookForm({ action, defaultName }: Props) {
  const [state, formAction, pending] = useActionState(action, { saved: 0 });
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(0); // açıldığı andaki kayıt sayısı; kayıt artınca form kapanır
  const shown = open && state.saved === openedAt;
  const values = state.values;
  const errors = state.errors ?? {};

  if (!shown) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setOpenedAt(state.saved);
        }}
        className="inline-flex min-h-11 items-center border border-line px-6 text-xs font-semibold tracking-widest uppercase transition hover:border-primary hover:text-primary"
      >
        + Yeni adres ekle
      </button>
    );
  }

  return (
    <form action={formAction} onSubmit={submitKeepingValues(formAction)} noValidate className="rounded-md border border-line p-4 sm:p-6">
      <h3 className="font-display text-xl">Yeni adres</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field
          label="Adres başlığı"
          name="adres-basligi"
          value={values?.title ?? ""}
          optional
          maxLength={30}
          placeholder="Ev, İş…"
          className="sm:col-span-2"
        />
        <Field
          label="Alıcının adı soyadı"
          name="ad-soyad"
          error={errors.name}
          value={values?.name ?? defaultName}
          autoComplete="name"
          maxLength={80}
        />
        <Field
          label="Telefon"
          name="telefon"
          error={errors.phone}
          value={values?.phone ?? ""}
          type="tel"
          autoComplete="tel-national"
          inputMode="tel"
          placeholder="0555 111 22 33"
          mask="phone"
        />
        <Field
          label="Adres"
          name="adres"
          error={errors.address}
          value={values?.address ?? ""}
          multiline
          maxLength={300}
          autoComplete="street-address"
          className="sm:col-span-2"
        />
        <PlaceFields
          city={values?.city ?? ""}
          district={values?.district ?? ""}
          postalCode={values?.postalCode ?? ""}
          errors={errors}
        />
      </div>

      {state.message && (
        <p role="alert" className="mt-4 text-sm font-semibold text-danger">
          {state.message}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60"
        >
          {pending ? "Kaydediliyor…" : "Adresi kaydet"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 px-4 text-xs tracking-widest text-muted uppercase transition hover:text-primary"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}
