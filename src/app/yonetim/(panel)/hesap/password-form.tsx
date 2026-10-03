"use client";

import { useActionState, useEffect, useRef } from "react";
import type { PasswordFormState } from "./actions";

type Props = {
  // Sunucu eylemi. Sayfa (sunucu) verir; bu bileşende `.bind` edilmez (bkz. ImageManager'daki açıklama).
  action: (state: PasswordFormState, formData: FormData) => Promise<PasswordFormState>;
  email: string; // hangi hesabın parolası değişiyor; parola yöneticisi de kaydı doğru eşlesin diye bundan yararlanır
  minLength: number;
};

const inputClass = "mt-2 w-full rounded-md border bg-paper p-3 text-sm";

function PasswordField({
  name,
  label,
  autoComplete,
  hint,
  error,
}: {
  name: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  error?: string;
}) {
  const id = `hesap-${name}`;
  const describedBy = [hint && `${id}-ipucu`, error && `${id}-hata`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputClass} ${error ? "border-danger" : "border-field"}`}
      />
      {hint && (
        <p id={`${id}-ipucu`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-hata`} className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

// Parola değiştirme formu. Doğrulama sunucuda yapılır; hatalı kutuya odaklanılır. Güvenlik gereği yazılan parolalar
// hata sonrasında da korunmaz (form her gönderimden sonra boşalır).
export function PasswordForm({ action, email, minLength }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.error) return;
    const name = state.field ?? "mevcut";
    formRef.current?.querySelector<HTMLElement>(`[name='${name}']`)?.focus();
  }, [state]);

  const errorFor = (name: "mevcut" | "yeni" | "tekrar") => (state?.field === name ? state.error : undefined);

  return (
    <form ref={formRef} action={formAction} noValidate className="mt-6 space-y-6">
      <div>
        <label htmlFor="hesap-eposta" className="text-sm">
          E-posta
        </label>
        <input
          id="hesap-eposta"
          type="email"
          readOnly
          autoComplete="username"
          defaultValue={email}
          className={`${inputClass} border-field bg-soft text-muted`}
        />
      </div>

      <PasswordField name="mevcut" label="Mevcut parola" autoComplete="current-password" error={errorFor("mevcut")} />
      <PasswordField
        name="yeni"
        label="Yeni parola"
        autoComplete="new-password"
        hint={`En az ${minLength} karakter.`}
        error={errorFor("yeni")}
      />
      <PasswordField name="tekrar" label="Yeni parola (tekrar)" autoComplete="new-password" error={errorFor("tekrar")} />

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60"
        >
          {pending ? "Kaydediliyor…" : "Parolayı değiştir"}
        </button>
      </div>

      <p role="status" className="min-h-6 text-sm">
        {state?.changed ? "Parola değiştirildi. Diğer cihazlardaki oturumlar kapatıldı; bu tarayıcıda açık kalmaya devam ediyorsunuz." : ""}
      </p>
      {state?.error && state.field == null && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
