import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { countByStatus } from "@/lib/orders-admin";
import { listPaymentsNeedingAttention } from "@/lib/payments";
import { getAllProducts } from "@/lib/products-admin";

// Yönetim ana sayfası: ürünlerin ve siparişlerin kısa özeti, ürün ve sipariş listelerine geçiş.
export default async function AdminHomePage() {
  const admin = await requireAdmin();
  const [products, orderCounts, attention] = await Promise.all([
    getAllProducts(),
    countByStatus(),
    listPaymentsNeedingAttention(),
  ]);

  const published = products.filter((product) => product.published).length;
  const soldOut = products.filter((product) => product.stock === 0).length;
  const samples = products.filter((product) => product.sample).length;
  const stats = [
    { label: "Yayında", value: published },
    { label: "Taslak", value: products.length - published },
    { label: "Tükenen", value: soldOut },
    { label: "Örnek ürün", value: samples },
  ];
  // Hazırlanacak: ödemesi alınmış, henüz kargoya verilmemiş siparişler (yapılacak iş).
  const orderStats = [
    { label: "Ödeme bekleyen", value: orderCounts.pending },
    { label: "Hazırlanacak", value: orderCounts.paid + orderCounts.preparing },
    { label: "Kargoda", value: orderCounts.shipped },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="font-display text-4xl">Genel Bakış</h1>
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
          kaldırılmalıdır. Ürünler sayfasından tek seferde silebilirsiniz.
        </p>
      )}

      <h2 className="mt-10 font-display text-2xl">Siparişler</h2>
      <dl className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {orderStats.map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-paper p-5 shadow-sm">
            <dt className="text-[11px] tracking-widest text-muted uppercase">{label}</dt>
            <dd className="mt-2 font-display text-4xl">{value}</dd>
          </div>
        ))}
      </dl>

      {attention.length > 0 && (
        <section aria-labelledby="odeme-uyari-baslik" className="mt-8 rounded-md border border-danger p-4">
          <h3 id="odeme-uyari-baslik" className="text-sm font-semibold text-danger">
            İlgilenmeniz gereken ödemeler
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {attention.map((item) => (
              <li key={item.orderNumber}>
                <Link
                  href={`/yonetim/siparisler/${item.orderNumber}`}
                  className="underline transition hover:text-primary"
                >
                  {item.orderNumber}
                </Link>{" "}
                <span className="text-muted">({formatPrice(item.amount)})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/yonetim/siparisler"
          className="inline-flex min-h-11 items-center bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
        >
          Siparişleri gör
        </Link>
        <Link
          href="/yonetim/urunler"
          className="inline-flex min-h-11 items-center border border-espresso px-8 text-xs font-semibold tracking-widest uppercase transition hover:border-primary hover:text-primary"
        >
          Ürünleri gör
        </Link>
        <Link
          href="/yonetim/urunler/yeni"
          className="inline-flex min-h-11 items-center border border-espresso px-8 text-xs font-semibold tracking-widest uppercase transition hover:border-primary hover:text-primary"
        >
          Yeni ürün
        </Link>
      </div>
    </div>
  );
}
