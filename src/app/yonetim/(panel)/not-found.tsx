import Link from "next/link";

// Yönetim sayfalarında notFound() çağrılınca (ör. silinmiş bir ürünün düzenleme adresi) gösterilir.
export default function AdminNotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl">Bulunamadı</h1>
      <p className="mt-4 text-muted">Aradığınız ürün yok ya da silinmiş olabilir.</p>
      <Link
        href="/yonetim/urunler"
        className="mt-8 inline-flex min-h-11 items-center bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
      >
        Ürünlere dön
      </Link>
    </div>
  );
}
