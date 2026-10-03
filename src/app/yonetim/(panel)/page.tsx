import { requireAdmin } from "@/lib/auth";

// Yönetim ana sayfası: ürün yönetimi (C-3 ...) sonraki adımlarda eklenir.
export default async function AdminHomePage() {
  const admin = await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl">Yönetim paneli</h1>
      <p className="mt-4 text-muted">
        Hoş geldiniz, <span className="text-ink">{admin.email}</span>.
      </p>
      <p className="mt-6 rounded-md bg-paper p-4 text-sm text-muted">
        Giriş çalışıyor. Ürün listesi ve ürün ekleme/düzenleme sonraki adımlarda buraya eklenecek.
      </p>
    </div>
  );
}
