import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Giriş · Yönetim · TAURA" };

export default async function AdminLoginPage() {
  // Zaten giriş yapılmışsa forma gerek yok. Veritabanı kapalıysa form yine açılır (eylem hatayı gösterir).
  const admin = await getAdmin().catch(() => null);
  if (admin) redirect("/yonetim");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <div className="text-center">
        <p className="font-display text-3xl tracking-[0.16em]">TAURA</p>
        <p className="text-[11px] tracking-[0.3em] text-muted uppercase">Yönetim</p>
      </div>

      <div className="mt-10 rounded-lg bg-paper p-6 shadow-sm">
        <h1 className="font-display text-2xl">Yönetici girişi</h1>
        <p className="mt-2 text-sm text-muted">Bu alan yalnızca site yöneticisi içindir.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>

      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center justify-center text-xs tracking-widest text-muted uppercase transition hover:text-primary"
      >
        ← Siteye dön
      </Link>
    </div>
  );
}
