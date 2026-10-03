import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getProducts } from "@/lib/products";

// Yönetim ana sayfası: ürünlerin kısa özeti ve ürün listesine geçiş.
export default async function AdminHomePage() {
  const admin = await requireAdmin();
  const products = await getProducts();

  const inStock = products.filter((product) => product.stock > 0).length;
  const samples = products.filter((product) => product.sample).length;
  const stats = [
    { label: "Toplam ürün", value: products.length },
    { label: "Stokta", value: inStock },
    { label: "Tükenen", value: products.length - inStock },
    { label: "Örnek ürün", value: samples },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="font-display text-4xl">Yönetim paneli</h1>
      <p className="mt-3 text-muted">
        Hoş geldiniz, <span className="text-ink">{admin.email}</span>.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-paper p-5 shadow-sm">
            <dt className="text-[11px] tracking-widest text-muted uppercase">{label}</dt>
            <dd className="mt-2 font-display text-4xl">{value}</dd>
          </div>
        ))}
      </dl>

      {samples > 0 && (
        <p className="mt-6 max-w-2xl text-sm text-muted">
          Sitede {samples} örnek ürün var. Bunlar demo içindir; gerçek ürünler eklenince canlıya çıkmadan önce
          kaldırılmalıdır.
        </p>
      )}

      <Link
        href="/yonetim/urunler"
        className="mt-8 inline-flex min-h-11 items-center bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
      >
        Ürünleri gör
      </Link>
    </div>
  );
}
