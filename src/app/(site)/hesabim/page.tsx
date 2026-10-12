import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer-auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { pageMetadata } from "@/lib/metadata";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/order-model";
import { listOrdersForCustomer, type CustomerOrderSummary } from "@/lib/orders";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("Siparişlerim", "Sipariş geçmişiniz.", { noindex: true });

// Durum etiketinin rengi: bekleyen soluk, süren işler gold, kargoda bordo, teslim edilen koyu, iptal kırmızı.
const STATUS_STYLE: Record<OrderStatus, string> = {
  pending: "border-field text-muted",
  paid: "border-gold bg-gold/15 text-ink",
  preparing: "border-gold bg-gold/15 text-ink",
  shipped: "border-bordo bg-bordo/10 text-bordo",
  delivered: "border-ink bg-ink text-paper",
  cancelled: "border-danger text-danger",
};

// Siparişlerim (hesap alanının ilk bölümü): hesaptayken verilen siparişler, yeniden eskiye. Misafir siparişleri bağlanmaz
// (kullanıcı kararı, 2026-10-06). Her siparişte ürünlerin küçük görselleri, durum ve toplam; "Detayı gör" sipariş sayfasını açar.
export default async function OrdersPage() {
  const customer = await getCustomer();
  if (!customer) redirect("/giris?donus=/hesabim");

  let orders: CustomerOrderSummary[] = [];
  let failed = false;
  try {
    orders = await listOrdersForCustomer(customer.id);
  } catch (error) {
    console.error("Müşteri siparişleri okunamadı", error);
    failed = true;
  }

  return (
    <section aria-labelledby="siparisler-baslik">
      <h1 id="siparisler-baslik" className="font-display text-3xl sm:text-4xl">
        Siparişlerim
      </h1>
      <p className="mt-2 text-sm text-muted">
        {orders.length > 0 ? `${orders.length} sipariş` : "Giriş yapmışken verdiğiniz siparişler burada görünür."}
      </p>

      {failed && (
        <p className="mt-6 rounded-md bg-soft p-4 text-sm text-muted">Siparişler şu an yüklenemedi. Biraz sonra bu sayfayı yenileyin.</p>
      )}

      {!failed && orders.length === 0 && (
        <div className="mt-6 rounded-xl border border-gold/40 bg-paper/50 p-6 text-sm text-muted">
          <p>Henüz siparişiniz yok.</p>
          <Link
            href="/koleksiyon"
            className="mt-4 inline-flex min-h-11 items-center bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
          >
            Koleksiyona göz at
          </Link>
        </div>
      )}

      {orders.length > 0 && (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => (
            <li key={order.number} className="rounded-xl border border-gold/40 bg-paper/50 p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold tracking-wider">{order.number}</p>
                  <p className="text-xs text-muted">{formatDateTime(order.createdAt)}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[order.status]}`}>
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
              </div>

              <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Siparişteki ürünler">
                {order.items.map((item) => (
                  <li key={item.slug} className="flex items-center gap-2" title={`${item.name} × ${item.qty}`}>
                    <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md bg-sand">
                      {item.image && <Image src={mediaUrl(item.image)} alt="" fill sizes="44px" className="object-cover" />}
                    </span>
                    <span className="sr-only">
                      {item.name} × {item.qty}
                    </span>
                  </li>
                ))}
                {order.lineCount > order.items.length && (
                  <li className="text-xs text-muted">+{order.lineCount - order.items.length} ürün daha</li>
                )}
              </ul>
              <p className="mt-2 line-clamp-1 text-sm text-muted" aria-hidden="true">
                {order.items.map((item) => item.name).join(", ")}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gold/30 pt-3">
                <p className="text-sm">
                  {order.itemCount} ürün · <span className="font-display text-xl">{formatPrice(order.total)}</span>
                </p>
                <Link
                  href={`/siparis/${order.trackKey}`}
                  className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold tracking-widest uppercase transition hover:text-primary"
                >
                  Detayı gör<span className="sr-only">: {order.number}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
