import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NewOrderNotice } from "@/components/new-order-notice";
import { formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { pageMetadata } from "@/lib/metadata";
import { maskEmail, maskPhone, ORDER_STATUS_LABELS, type Order } from "@/lib/order-model";
import { getOrderByKey } from "@/lib/orders";
import { shippingLabel } from "@/lib/shipping";

export const dynamic = "force-dynamic";

// Gizli bağlantıyla açılan kişiye özel sayfa: canlıda da arama motorlarına kapalı kalır.
export const metadata = pageMetadata("Sipariş", "Siparişinizin durumu ve ayrıntıları.", { noindex: true });

// Sipariş sayfası: adresteki gizli anahtarı bilen kişi siparişini görür (üyelik yok). Anahtar tahmin edilemez uzunlukta
// rastgele bir metindir; telefon ve e-posta sayfada kısmen gizlenir. Sipariş anındaki bilgiler gösterilir (anlık kopya).
export default async function OrderPage({ params, searchParams }: PageProps<"/siparis/[key]">) {
  const { key } = await params;
  const { yeni } = await searchParams;
  const fresh = yeni === "1"; // sipariş az önce verildi

  let order: Order | null;
  try {
    order = await getOrderByKey(key);
  } catch (error) {
    console.error("Sipariş okunamadı", error);
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-4xl">Sipariş</h1>
        <p className="mt-6 rounded-md bg-soft p-4 text-sm text-muted">
          Sipariş bilgisi şu an yüklenemedi. Biraz sonra bu sayfayı yenileyin.
        </p>
      </div>
    );
  }
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-4xl">Sipariş</h1>
      <NewOrderNotice fresh={fresh} />
      <p className="mt-3 text-sm text-muted">
        Sipariş numaranız:{" "}
        <span className="font-semibold tracking-wider text-ink">{order.number}</span>
      </p>
      <p className="mt-4 inline-flex rounded-full bg-soft px-4 py-2 text-sm font-semibold">
        {ORDER_STATUS_LABELS[order.status]}
      </p>

      {order.status === "pending" && (
        <p className="mt-4 rounded-md bg-soft p-4 text-sm text-muted">
          Demo sürümü: ödeme alınmadı ve ödeme adımı henüz kurulmadı. Canlıda bu adımda ödeme kuruluşunun güvenli formu
          açılacak.
        </p>
      )}
      <p className="mt-4 text-sm text-muted">
        Bu sayfanın adresini kaydedin: siparişinizin durumunu buradan takip edebilirsiniz. Adresi yalnızca güvendiğiniz
        kişilerle paylaşın.
      </p>

      <section aria-labelledby="urunler-baslik" className="mt-10">
        <h2 id="urunler-baslik" className="font-display text-2xl">
          Ürünler
        </h2>
        <ul className="mt-4 divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.slug} className="flex gap-3 py-3">
              <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-sand to-soft">
                {item.image && (
                  <Image src={mediaUrl(item.image)} alt="" fill sizes="56px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.name}</p>
                <p className="text-xs text-muted">
                  {item.qty} × {formatPrice(item.price)}
                  {item.sample && " · Örnek ürün"}
                </p>
              </div>
              <p className="text-sm">{formatPrice(item.price * item.qty)}</p>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Ara toplam</dt>
            <dd>{formatPrice(order.subtotal)}</dd>
          </div>
          {order.gift && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Hediye paketi</dt>
              <dd>Ücretsiz</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Kargo</dt>
            <dd>{shippingLabel(order.shippingFee)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
            <dt className="font-semibold">Toplam</dt>
            <dd className="font-display text-2xl">{formatPrice(order.total)}</dd>
          </div>
        </dl>
        {order.gift && order.giftNote && (
          <p className="mt-3 text-xs break-words whitespace-pre-line text-muted">Not kartı: {order.giftNote}</p>
        )}
      </section>

      <section aria-labelledby="teslimat-baslik" className="mt-10">
        <h2 id="teslimat-baslik" className="font-display text-2xl">
          Teslimat
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-muted">Alıcı</dt>
            <dd>{order.customer.name}</dd>
          </div>
          <div>
            <dt className="text-muted">Adres</dt>
            <dd className="whitespace-pre-line">{order.address.line}</dd>
            <dd>
              {order.address.district} / {order.address.city} · {order.address.postalCode}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Telefon</dt>
            <dd>{maskPhone(order.customer.phone)}</dd>
          </div>
          <div>
            <dt className="text-muted">E-posta</dt>
            <dd>{maskEmail(order.customer.email)}</dd>
          </div>
          {order.note && (
            <div>
              <dt className="text-muted">Sipariş notunuz</dt>
              <dd className="break-words whitespace-pre-line">{order.note}</dd>
            </div>
          )}
        </dl>
      </section>

      <Link
        href="/koleksiyon"
        className="mt-10 inline-flex min-h-11 items-center border border-espresso px-8 text-xs font-semibold tracking-widest uppercase transition hover:border-primary hover:text-primary"
      >
        Alışverişe devam et
      </Link>
    </div>
  );
}
