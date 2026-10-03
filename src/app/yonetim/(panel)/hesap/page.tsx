import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { PASSWORD_MIN_LENGTH } from "@/lib/password";
import { changeAdminPassword } from "./actions";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Hesap · Yönetim · TAURA" };

// Yönetici hesabı: giriş yapılan hesabın parolasını değiştirme.
export default async function AccountPage() {
  const admin = await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="font-display text-4xl">Hesap</h1>

      <h2 className="mt-10 font-display text-2xl">Parolayı değiştir</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Güvenlik için mevcut parola sorulur. Parola değişince diğer cihazlardaki ve tarayıcılardaki oturumlar kapanır,
        yeniden giriş yapmaları gerekir; bu tarayıcıda oturumunuz açık kalır.
      </p>

      <PasswordForm action={changeAdminPassword} email={admin.email} minLength={PASSWORD_MIN_LENGTH} />
    </div>
  );
}
