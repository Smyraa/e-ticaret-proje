"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AccountFormState } from "@/app/(site)/hesabim/actions";

const inputClass = "mt-2 w-full rounded-md border bg-paper p-3 text-sm";

type Props = {
  mode: "giris" | "kayit";
  returnTo: string; // giriş/kayıttan sonra dönülecek sayfa
  passwordMin?: number; // kayıtta parolanın en az uzunluğu (sunucudaki kuralla aynı; sayfa verir)
  action: (state: AccountFormState, formData: FormData) => Promise<AccountFormState>;
};

// Müşteri giriş ve kayıt formu (aynı görünüm; kayıtta ad alanı ve parola kuralı da var).
export function AccountForm({ mode, returnTo, passwordMin, action }: Props) {
  const [state, formAction, pending] = useActionState<AccountFormState, FormData>(action, undefined);
  const signup = mode === "kayit";
  const border = (field: "ad" | "eposta" | "parola") => (state?.field === field ? "border-danger" : "border-field");
  const invalid = (field: "ad" | "eposta" | "parola") => (state?.field === field ? true : undefined);
  const query = returnTo === "/hesabim" ? "" : `?donus=${encodeURIComponent(returnTo)}`;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="donus" value={returnTo} />

      {signup && (
        <div>
          <label htmlFor="ad" className="text-sm">
            Ad soyad
          </label>
          <input
            id="ad"
            name="ad"
            required
            maxLength={80}
            autoComplete="name"
            defaultValue={state?.name ?? ""}
            aria-invalid={invalid("ad")}
            className={`${inputClass} ${border("ad")}`}
          />
        </div>
      )}

      <div>
        <label htmlFor="eposta" className="text-sm">
          E-posta
        </label>
        <input
          id="eposta"
          name="eposta"
          type="email"
          required
          maxLength={120}
          autoComplete={signup ? "email" : "username"}
          defaultValue={state?.email ?? ""}
          aria-invalid={invalid("eposta")}
          className={`${inputClass} ${border("eposta")}`}
        />
      </div>

      <div>
        <label htmlFor="parola" className="text-sm">
          Parola
        </label>
        <input
          id="parola"
          name="parola"
          type="password"
          required
          maxLength={128}
          minLength={signup ? passwordMin : undefined}
          autoComplete={signup ? "new-password" : "current-password"}
          aria-invalid={invalid("parola")}
          aria-describedby={signup ? "parola-kurali" : undefined}
          className={`${inputClass} ${border("parola")}`}
        />
        {signup && (
          <p id="parola-kurali" className="mt-1 text-xs text-muted">
            En az {passwordMin} karakter.
          </p>
        )}
      </div>

      {state?.message && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.message}
        </p>
      )}

      {signup && (
        <p className="text-xs text-muted">
          Hesap açarak{" "}
          <Link href="/gizlilik" className="underline underline-offset-2 hover:text-primary">
            gizlilik ve kişisel verilerin korunması
          </Link>{" "}
          metnini okuduğunuzu kabul edersiniz.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60"
      >
        {signup ? (pending ? "Hesap açılıyor…" : "Hesap aç") : pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>

      <p className="text-center text-sm text-muted">
        {signup ? "Hesabınız var mı? " : "Hesabınız yok mu? "}
        <Link
          href={`${signup ? "/giris" : "/kayit"}${query}`}
          className="font-semibold text-ink underline underline-offset-2 hover:text-primary"
        >
          {signup ? "Giriş yapın" : "Hesap açın"}
        </Link>
      </p>
    </form>
  );
}
