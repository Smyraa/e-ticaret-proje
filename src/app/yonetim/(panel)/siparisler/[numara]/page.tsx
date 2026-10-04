import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { listMailsForOrder, mailSetup } from "@/lib/mail";
import { describeMailSetup, MAIL_KIND_LABELS, MAIL_STATUS_LABELS } from "@/lib/mail-model";
import { mediaUrl } from "@/lib/media";
import { ADMIN_LIMITS } from "@/lib/order-admin-form";
import { ORDER_NUMBER_PATTERN } from "@/lib/order-ids";
import { ORDER_STATUS_LABELS } from "@/lib/order-model";
import { availableCommands, HOLDS_STOCK } from "@/lib/order-status";
import { getOrderForAdmin } from "@/lib/orders-admin";
import { paymentSetup } from "@/lib/payment-config";
import {
  canRefund,
  describePaymentSetup,
  isCheckable,
  PAYMENT_STATUS_LABELS,
  paymentConcern,
  PROVIDER_LABELS,
} from "@/lib/payment-model";
import { listPaymentsForOrder } from "@/lib/payments";
import { formatPhone } from "@/lib/phone";
import { shippingLabel } from "@/lib/shipping";
import { siteUrl } from "@/lib/site";
import { orderMessage, whatsappLink } from "@/lib/whatsapp";
import { changeOrder, paymentOperation, saveOrderNote } from "../actions";
import { StatusBadge } from "../status-badge";
import { CopyButton } from "../copy-button";
import { NoteForm } from "../note-form";
import { OrderActions } from "../order-actions";
import { PaymentOps, type PaymentOp } from "../payment-ops";

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
  const whatsapp = whatsappLink(order.customer.phone, orderMessage(firstName, order.number, trackUrl));
  const history = order.history ?? [];
  const mails = await listMailsForOrder(order.number);
  const mailNote = describeMailSetup(mailSetup());
  const payments = await listPaymentsForOrder(order.number);
  const paymentNote = describePaymentSetup(paymentSetup());
  const cardPaid = payments.some((payment) => payment.status === "paid"); // kartla ödeme alınmış
  const concerns = payments.flatMap((payment) => {
    const text = paymentConcern(payment);
    return text ? [{ id: payment.id, text }] : [];
  });

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
          {cardPaid
            ? "Kartla ödeme alındı ama ürünlerin stoğu düşülemedi (stok yetmemiş olabilir). Stoğu güncelleyip İşlemler bölümündeki “Stoğu şimdi düş” düğmesini kullanın ya da siparişi iptal edin; iptal, kartla alınan ödemeyi de müşteriye iade eder."
            : "Bu sipariş ödenmiş görünüyor ama ürünlerin stoğu düşülmemiş. İşlemler bölümündeki “Stoğu şimdi düş” düğmesini kullanın."}
        </p>
      )}
      {concerns.map((concern) => (
        <p
          key={concern.id}
          role="alert"
          className="mt-6 rounded-md border border-danger p-4 text-sm font-semibold text-danger"
        >
          Ödeme: {concern.text}
        </p>
      ))}
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
        <div className="min-w-0 space-y-10">
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

          <section aria-labelledby="kart-odeme-baslik">
            <h2 id="kart-odeme-baslik" className="font-display text-2xl">
              Kartla ödemeler
            </h2>
            {paymentNote && <p className="mt-3 rounded-md bg-soft p-3 text-sm text-muted">{paymentNote}</p>}
            {payments.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Bu sipariş için kartla ödeme denemesi yok.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {payments.map((payment) => {
                  const concern = paymentConcern(payment);
                  const ops: PaymentOp[] = [];
                  if (canRefund(payment, order.status)) ops.push("refund");
                  if (payment.status === "paid" && !payment.applied && payment.attention !== "amount-mismatch") ops.push("apply");
                  return (
                    <li key={payment.id} className="rounded-lg bg-paper p-4 text-sm shadow-sm">
                      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-semibold">{PROVIDER_LABELS[payment.provider]}</span>
                        <span className={concern ? "font-semibold text-danger" : "text-muted"}>
                          {PAYMENT_STATUS_LABELS[payment.status]}
                        </span>
                        <span>{formatPrice(payment.amount)}</span>
                        <span className="text-muted">{formatDateTime(payment.createdAt)}</span>
                      </p>
                      <dl className="mt-1 space-y-1 text-xs text-muted">
                        {payment.paidAt && (
                          <div>
                            <dt className="inline">Ödeme alındı: </dt>
                            <dd className="inline">{formatDateTime(payment.paidAt)}</dd>
                          </div>
                        )}
                        {payment.refundedAt && (
                          <div>
                            <dt className="inline">İade edildi: </dt>
                            <dd className="inline">{formatDateTime(payment.refundedAt)}</dd>
                          </div>
                        )}
                        {payment.providerPaymentId && (
                          <div className="break-all">
                            <dt className="inline">Kuruluş ödeme no: </dt>
                            <dd className="inline">{payment.providerPaymentId}</dd>
                          </div>
                        )}
                        {payment.failure && (
                          <div>
                            <dt className="inline">Neden: </dt>
                            <dd className="inline">{payment.failure}</dd>
                          </div>
                        )}
                      </dl>
                      {concern && <p className="mt-2 text-xs font-semibold text-danger">{concern}</p>}
                      <PaymentOps action={paymentOperation.bind(null, order.number, payment.id)} ops={ops} />
                    </li>
                  );
                })}
              </ul>
            )}
            {payments.length > 0 && (
              <PaymentOps
                action={paymentOperation.bind(null, order.number, "")}
                ops={payments.some((payment) => isCheckable(payment)) ? ["check"] : []}
              />
            )}
          </section>

          <section aria-labelledby="eposta-baslik">
            <h2 id="eposta-baslik" className="font-display text-2xl">
              E-postalar
            </h2>
            {mailNote && <p className="mt-3 rounded-md bg-soft p-3 text-sm text-muted">{mailNote}</p>}
            {mails.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Bu sipariş için e-posta kaydı yok.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {mails.map((mail) => (
                  <li key={mail.id} className="rounded-lg bg-paper p-4 text-sm shadow-sm">
                    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-semibold">{MAIL_KIND_LABELS[mail.kind]}</span>
                      <span className={mail.status === "failed" ? "font-semibold text-danger" : "text-muted"}>
                        {MAIL_STATUS_LABELS[mail.status]}
                      </span>
                      <span className="text-muted">{formatDateTime(mail.createdAt)}</span>
                    </p>
                    <p className="mt-1 text-xs break-all text-muted">
                      Alıcı: {mail.to || "—"}
                      {mail.replyTo && ` · Yanıt adresi: ${mail.replyTo}`}
                    </p>
                    <p className="mt-1 text-xs break-words text-muted">Konu: {mail.subject}</p>
                    {mail.error && <p className="mt-1 text-xs font-semibold text-danger">{mail.error}</p>}
                    {mail.text && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs underline">İçeriği göster</summary>
                        <pre className="mt-2 font-sans text-xs break-words whitespace-pre-wrap">{mail.text}</pre>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
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
