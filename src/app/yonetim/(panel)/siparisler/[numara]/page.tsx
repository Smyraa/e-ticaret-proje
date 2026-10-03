import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { ADMIN_LIMITS } from "@/lib/order-admin-form";
import { ORDER_NUMBER_PATTERN } from "@/lib/order-ids";
import { ORDER_STATUS_LABELS } from "@/lib/order-model";
import { availableCommands, HOLDS_STOCK } from "@/lib/order-status";
import { getOrderForAdmin } from "@/lib/orders-admin";
import { formatPhone } from "@/lib/phone";
import { shippingLabel } from "@/lib/shipping";
import { siteUrl } from "@/lib/site";
import { whatsappLink } from "@/lib/whatsapp";
import { changeOrder, saveOrderNote } from "../actions";
import { StatusBadge } from "../status-badge";
import { CopyButton } from "../copy-button";
import { NoteForm } from "../note-form";
import { OrderActions } from "../order-actions";

export const metadata: Metadata = { title: "Sipariş · Yönetim · TAURA" };

const CARRIERS = ["Yurtiçi Kargo", "Aras Kargo", "MNG Kargo", "PTT Kargo", "Sürat Kargo", "UPS", "Elden"];

const linkClass = "underline transition hover:text-primary";
const labelClass = "text-xs tracking-widest text-muted uppercase";

// Sipariş ayrıntısı ve işlemler. Müşterinin kişisel bilgileri (telefon, e-posta, adres) burada tam görünür.
export default async function AdminOrderPage({ params }: PageProps<"/yonetim/siparisler/[numara]">) {
  await requireAdmin();
  const { numara } = await params;
  if (!ORDER_NUMBER_PATTERN.test(numara)) notFound();
  const order = await getOrderForAdmin(numara);
  if (!order) notFound();

  const commands = availableCommands(order);
  const holdsStock = HOLDS_STOCK.includes(order.status);
  const trackUrl = `${siteUrl}/siparis/${order.trackKey}`;
  const firstName = order.customer.name.split(" ")[0];
  const whatsapp = whatsappLink(
    order.customer.phone,
    `Merhaba ${firstName}, ${order.number} numaralı siparişiniz hakkında yazıyorum. Siparişinizin durumunu buradan takip edebilirsiniz: ${trackUrl}`,
  );
  const history = order.history ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <Link
        href="/yonetim/siparisler"
        className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase transition hover:text-primary"
      >
        ← Siparişlere dön
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="font-display text-4xl tracking-wider">{order.number}</h1>
        <StatusBadge status={order.status} />
        {order.test && (
          <span className="rounded-sm bg-espresso px-2 py-1 text-[10px] tracking-wider text-paper uppercase">Test</span>
        )}
      </div>
      <p className="mt-3 text-sm text-muted">Sipariş zamanı: {formatDateTime(order.createdAt)}</p>
      {order.test && (
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Bu bir test siparişi (yalnız örnek ürünler). Siparişler listesinden tüm test siparişleri tek seferde silinebilir.
        </p>
      )}

      {holdsStock && !order.stockDeducted && (
        <p role="alert" className="mt-6 rounded-md border border-danger p-4 text-sm font-semibold text-danger">
          Bu sipariş ödenmiş görünüyor ama ürünlerin stoğu düşülmemiş. İşlemler bölümündeki “Stoğu şimdi düş” düğmesini
          kullanın.
        </p>
      )}
      {!holdsStock && order.stockDeducted && (
        <p role="alert" className="mt-6 rounded-md border border-danger p-4 text-sm font-semibold text-danger">
          Bu sipariş ödenmemiş ya da iptal edilmiş ama düşülen stok iade edilmemiş. İşlemler bölümündeki “Stoğu şimdi iade
          et” düğmesini kullanın.
        </p>
      )}

      <section aria-labelledby="islem-baslik" className="mt-8 rounded-lg bg-paper p-5 shadow-sm">
        <h2 id="islem-baslik" className="font-display text-2xl">
          İşlemler
        </h2>
        <p className="mt-2 text-sm text-muted">
          Durum: <span className="font-semibold text-ink">{ORDER_STATUS_LABELS[order.status]}</span>
          {" · "}
          {order.stockDeducted ? "Stok düşüldü" : "Stok düşülmedi"}
        </p>
        {order.shipment && (
          <p className="mt-1 text-sm text-muted">
            Kargo: <span className="text-ink">{order.shipment.carrier}</span>
            {order.shipment.trackingNumber && (
              <>
                {" · Takip no: "}
                <span className="break-all text-ink">{order.shipment.trackingNumber}</span>
              </>
            )}
          </p>
        )}
        <div className="mt-5 max-w-2xl">
          <OrderActions
            action={changeOrder.bind(null, order.number)}
            commands={commands}
            shipped={order.status === "shipped"}
            shipment={order.shipment}
            carriers={CARRIERS}
          />
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem] lg:items-start">
        <div className="space-y-10">
          <section aria-labelledby="urunler-baslik">
            <h2 id="urunler-baslik" className="font-display text-2xl">
              Ürünler
            </h2>
            <ul className="mt-4 divide-y divide-line rounded-lg bg-paper shadow-sm">
              {order.items.map((item) => (
                <li key={item.slug} className="flex gap-3 p-4">
                  <div className="relative aspect-[4/5] w-14 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-sand to-soft">
                    {item.image && <Image src={mediaUrl(item.image)} alt="" fill sizes="56px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-muted">
                      {item.material} · {item.qty} × {formatPrice(item.price)}
                      {item.sample && " · Örnek ürün"}
                    </p>
                  </div>
                  <p className="text-sm">{formatPrice(item.price * item.qty)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 text-sm">
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
            {order.gift && (
              <p className="mt-3 text-sm">
                <span className="font-semibold">Hediye paketi istendi.</span>
                {order.giftNote && (
                  <>
                    {" "}
                    Not kartı: <span className="break-words whitespace-pre-line">{order.giftNote}</span>
                  </>
                )}
              </p>
            )}
          </section>

          <section aria-labelledby="musteri-baslik">
            <h2 id="musteri-baslik" className="font-display text-2xl">
              Müşteri ve teslimat
            </h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className={labelClass}>Alıcı</dt>
                <dd className="mt-1">{order.customer.name}</dd>
              </div>
              <div>
                <dt className={labelClass}>Telefon</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <a href={`tel:+${order.customer.phone}`} className={linkClass}>
                    {formatPhone(order.customer.phone)}
                  </a>
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    WhatsApp’tan yaz
                    <span className="sr-only"> (yeni sekmede açılır)</span>
                  </a>
                </dd>
              </div>
              <div>
                <dt className={labelClass}>E-posta</dt>
                <dd className="mt-1 break-all">
                  <a href={`mailto:${order.customer.email}`} className={linkClass}>
                    {order.customer.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className={labelClass}>Adres</dt>
                <dd className="mt-1 whitespace-pre-line">{order.address.line}</dd>
                <dd>
                  {order.address.district} / {order.address.city} · {order.address.postalCode}
                </dd>
              </div>
              {order.note && (
                <div>
                  <dt className={labelClass}>Müşterinin sipariş notu</dt>
                  <dd className="mt-1 break-words whitespace-pre-line">{order.note}</dd>
                </div>
              )}
            </dl>
          </section>

          <section aria-labelledby="gecmis-baslik">
            <h2 id="gecmis-baslik" className="font-display text-2xl">
              Durum geçmişi
            </h2>
            {history.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Kayıt yok.</p>
            ) : (
              <ol className="mt-4 space-y-2 text-sm">
                {history.map((entry, index) => (
                  <li key={index} className="flex flex-wrap gap-x-3">
                    <span className="font-semibold">{ORDER_STATUS_LABELS[entry.status]}</span>
                    <span className="text-muted">{formatDateTime(entry.at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-8">
          <section aria-labelledby="baglanti-baslik" className="rounded-lg bg-paper p-5 shadow-sm">
            <h2 id="baglanti-baslik" className="font-display text-2xl">
              Müşteri sayfası
            </h2>
            <p className="mt-2 text-sm text-muted">
              Müşterinin siparişini takip ettiği, tahmin edilemez adresli sayfa. Adresi müşteriyle paylaşabilirsiniz.
            </p>
            <p className="mt-3 text-xs break-all">
              <a href={trackUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {trackUrl}
                <span className="sr-only"> (yeni sekmede açılır)</span>
              </a>
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <CopyButton text={trackUrl} label="Bağlantıyı kopyala" />
            </div>
          </section>

          <section aria-labelledby="not-baslik" className="rounded-lg bg-paper p-5 shadow-sm">
            <h2 id="not-baslik" className="font-display text-2xl">
              Not
            </h2>
            <NoteForm action={saveOrderNote.bind(null, order.number)} initial={order.adminNote ?? ""} max={ADMIN_LIMITS.note} />
          </section>
        </aside>
      </div>
    </div>
  );
}
