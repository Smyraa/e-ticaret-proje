"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const inputClass = "mt-2 w-full rounded-md border border-field bg-paper p-3 text-sm";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="eposta" className="text-sm">
          E-posta
        </label>
        <input
          id="eposta"
          name="eposta"
          type="email"
          required
          autoComplete="username"
          defaultValue={state?.email ?? ""}
          className={inputClass}
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
          autoComplete="current-password"
          className={inputClass}
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 w-full bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}
