"use client";

import { useActionState } from "react";
import type { ProfileState } from "@/app/(site)/hesabim/actions";

type Action = (state: ProfileState, formData: FormData) => Promise<ProfileState>;

const control = "mt-2 w-full rounded-md border bg-paper p-3 text-sm";
const button =
  "min-h-11 bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60";

function Result({ state, id }: { state: ProfileState; id: string }) {
  if (state?.error) {
    return (
      <p id={id} role="alert" className="text-sm font-semibold text-danger">
        {state.error}
      </p>
    );
  }
  return (
    <p id={id} role="status" className="min-h-5 text-sm">
      {state?.message ?? ""}
    </p>
  );
}

function PasswordInput({ id, name, label, autoComplete, invalid, describedBy }: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="password"
        required
        maxLength={128}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`${control} ${invalid ? "border-danger" : "border-field"}`}
      />
    </div>
  );
}

export function NameForm({ action, name }: { action: Action; name: string }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const invalid = state?.field === "ad";
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="profil-ad" className="text-sm">
          Ad soyad
        </label>
        <input
          id="profil-ad"
          name="ad"
          required
          maxLength={80}
          autoComplete="name"
          defaultValue={state?.name ?? name}
          aria-invalid={invalid || undefined}
          aria-describedby="profil-ad-sonuc"
          className={`${control} ${invalid ? "border-danger" : "border-field"}`}
        />
      </div>
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Kaydediliyor…" : "Adı kaydet"}
      </button>
      <Result state={state} id="profil-ad-sonuc" />
    </form>
  );
}

export function PasswordForm({ action, minLength }: { action: Action; minLength: number }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <PasswordInput
        id="mevcut-parola"
        name="mevcut-parola"
        label="Mevcut parola"
        autoComplete="current-password"
        invalid={state?.field === "parola"}
        describedBy="parola-sonuc"
      />
      <PasswordInput
        id="yeni-parola"
        name="yeni-parola"
        label={`Yeni parola (en az ${minLength} karakter)`}
        autoComplete="new-password"
        invalid={state?.field === "yeni"}
        describedBy="parola-sonuc"
      />
      <PasswordInput
        id="yeni-parola-tekrar"
        name="yeni-parola-tekrar"
        label="Yeni parola (tekrar)"
        autoComplete="new-password"
        invalid={state?.field === "yeni"}
        describedBy="parola-sonuc"
      />
      <button type="submit" disabled={pending} className={button}>
        {pending ? "Değiştiriliyor…" : "Parolayı değiştir"}
      </button>
      <Result state={state} id="parola-sonuc" />
    </form>
  );
}

export function DeleteAccountForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="onay"
          value="evet"
          required
          aria-invalid={state?.field === "onay" || undefined}
          aria-describedby="silme-sonuc"
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        Hesabımın, kayıtlı adreslerimin, favorilerimin ve sepetimin silineceğini anladım. Bu işlem geri alınamaz.
      </label>
      <PasswordInput
        id="silme-parola"
        name="parola"
        label="Parolanız"
        autoComplete="current-password"
        invalid={state?.field === "parola"}
        describedBy="silme-sonuc"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 border border-danger px-8 text-xs font-semibold tracking-widest text-danger uppercase transition hover:bg-danger hover:text-paper disabled:opacity-60"
      >
        {pending ? "Siliniyor…" : "Hesabımı sil"}
      </button>
      <Result state={state} id="silme-sonuc" />
    </form>
  );
}
