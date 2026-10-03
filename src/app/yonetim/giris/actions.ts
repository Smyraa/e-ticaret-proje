"use server";

import { redirect } from "next/navigation";
import { loginWithPassword } from "@/lib/auth";

// Form durumu: hata iletisi ve (hata sonrası alan boşalmasın diye) yazılan e-posta.
export type LoginState = { error?: string; email?: string } | undefined;

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("eposta") ?? "").trim().toLowerCase();
  const password = String(formData.get("parola") ?? "");
  if (!email || !password) return { error: "E-posta ve parolayı yazın.", email };

  let result;
  try {
    result = await loginWithPassword(email, password);
  } catch (error) {
    console.error("Giriş yapılamadı", error);
    return { error: "Şu an giriş yapılamıyor. Veritabanı çalışıyor mu?", email };
  }
  if (!result.ok) return { error: result.message, email };

  redirect("/yonetim");
}
