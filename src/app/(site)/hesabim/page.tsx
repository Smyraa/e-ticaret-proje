import Link from "next/link";
import { redirect } from "next/navigation";
import { AddressBookForm } from "@/components/address-book-form";
import { Stars } from "@/components/stars";
import { addressLabel } from "@/lib/address-label";
import { listAddresses, type SavedAddress } from "@/lib/customer-addresses";
import { getCustomer } from "@/lib/customer-auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { ORDER_STATUS_LABELS } from "@/lib/order-model";
import { listOrdersForCustomer, type CustomerOrderSummary } from "@/lib/orders";
import { formatPhone } from "@/lib/phone";
import { myReviews, REVIEW_STATUS_LABELS, reviewableProducts, type Review, type Reviewable } from "@/lib/reviews";
import { deleteAddressAction, deleteReviewAction, logout, saveAddressAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("Hesabım", "Siparişleriniz ve hesap bilgileriniz.", { noindex: true });

const linkButton =
  "inline-flex min-h-11 items-center border border-line px-6 text-xs font-semibold tracking-widest uppercase transition hover:border-primary hover:text-primary";

// Hesap sayfası: yalnızca giriş yapmış müşteri görür. Hesaptayken verilen siparişler listelenir (misafir siparişleri
// bağlanmaz; kullanıcı kararı, 2026-10-06).
export default async function AccountPage({ searchParams }: PageProps<"/hesabim">) {
  const notice = (await searchParams).yorum;
  const customer = await getCustomer();
  if (!customer) redirect("/giris?donus=/hesabim");

  let orders: CustomerOrderSummary[] = [];
  let addresses: SavedAddress[] = [];
  let reviews: Review[] = [];
  let reviewable: Reviewable[] = [];
  let failed = false;
  try {
    [orders, addresses, reviews, reviewable] = await Promise.all([
      listOrdersForCustomer(customer.id),
      listAddresses(customer.id),
      myReviews(customer.id),
      reviewableProducts(customer.id),
    ]);
  } catch (error) {
    console.error("Müşteri siparişleri ya da adresleri okunamadı", error);
    failed = true;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-4xl">Hesabım</h1>
      <p className="mt-3 text-sm text-muted">
        <span className="font-semibold text-ink">{customer.name}</span> · {customer.email}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/favoriler" className={linkButton}>
          Favorilerim
        </Link>
        <Link href="/sepet" className={linkButton}>
          Sepetim
        </Link>
        <Link href="/hesabim/profil" className={linkButton}>
          Profil ve güvenlik
        </Link>
        <form action={logout}>
          <button type="submit" className={linkButton}>
            Çıkış yap
          </button>
        </form>
      </div>

      <section aria-labelledby="siparisler-baslik" className="mt-12">
        <h2 id="siparisler-baslik" className="font-display text-2xl">
          Siparişlerim
        </h2>

        {failed && (
          <p className="mt-4 rounded-md bg-soft p-4 text-sm text-muted">
            Siparişler şu an yüklenemedi. Biraz sonra bu sayfayı yenileyin.
          </p>
        )}

        {!failed && orders.length === 0 && (
          <p className="mt-4 rounded-md bg-soft p-4 text-sm text-muted">
            Henüz siparişiniz yok. Giriş yapmışken verdiğiniz siparişler burada görünür.
          </p>
        )}

        {orders.length > 0 && (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {orders.map((order) => (
              <li key={order.number}>
                <Link
                  href={`/siparis/${order.trackKey}`}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 transition hover:text-primary"
                >
                  <span>
                    <span className="block font-semibold tracking-wider">{order.number}</span>
                    <span className="block text-sm text-muted">
                      {formatDateTime(order.createdAt)} · {order.itemCount} ürün
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold">{formatPrice(order.total)}</span>
                    <span className="block text-sm text-muted">{ORDER_STATUS_LABELS[order.status]}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="yorumlar-baslik" className="mt-12">
        <h2 id="yorumlar-baslik" className="font-display text-2xl">
          Değerlendirmelerim
        </h2>
        <p className="mt-2 text-sm text-muted">
          Teslim edilen siparişlerinizdeki ürünlere yorum yazabilirsiniz. Yorumlar onaydan sonra ürün sayfasında görünür.
        </p>
        {(notice === "kaydedildi" || notice === "silindi") && (
          <p role="status" className="mt-3 rounded-md bg-soft p-3 text-sm">
            {notice === "kaydedildi" ? "Yorumunuz kaydedildi; onaylanınca ürün sayfasında görünecek." : "Yorumunuz silindi."}
          </p>
        )}

        {!failed && reviewable.some((item) => !reviews.some((review) => review.slug === item.slug)) && (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {reviewable
              .filter((item) => !reviews.some((review) => review.slug === item.slug))
              .map((item) => (
                <li key={item.slug} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="text-sm">
                    <span className="font-semibold">{item.name}</span>
                    <span className="block text-muted">Sipariş {item.orderNumber} · teslim edildi</span>
                  </span>
                  <Link href={`/hesabim/yorum/${item.slug}`} className={linkButton}>
                    Yorum yaz<span className="sr-only">: {item.name}</span>
                  </Link>
                </li>
              ))}
          </ul>
        )}

        {!failed && reviews.length > 0 && (
          <ul className="mt-4 space-y-3">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-md border border-line p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/urun/${review.slug}`} className="font-semibold transition hover:text-primary">
                    {review.productName}
                  </Link>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${review.status === "approved" ? "border-ink" : review.status === "rejected" ? "border-danger text-danger" : "border-field text-muted"}`}>
                    {REVIEW_STATUS_LABELS[review.status]}
                  </span>
                </div>
                <div className="mt-2">
                  <Stars rating={review.rating} />
                </div>
                <p className="mt-2 break-words whitespace-pre-line">{review.text}</p>
                <div className="mt-2 flex flex-wrap gap-x-4">
                  {review.status === "pending" && (
                    <Link href={`/hesabim/yorum/${review.slug}`} className="inline-flex min-h-11 items-center text-xs tracking-widest uppercase underline transition hover:text-primary">
                      Düzenle<span className="sr-only">: {review.productName}</span>
                    </Link>
                  )}
                  <form action={deleteReviewAction}>
                    <input type="hidden" name="yorum" value={review.id} />
                    <button type="submit" className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase underline transition hover:text-danger">
                      Sil<span className="sr-only">: {review.productName} yorumu</span>
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!failed && reviewable.length === 0 && reviews.length === 0 && (
          <p className="mt-4 rounded-md bg-soft p-4 text-sm text-muted">Henüz teslim edilmiş siparişiniz yok.</p>
        )}
      </section>

      <section aria-labelledby="adresler-baslik" className="mt-12">
        <h2 id="adresler-baslik" className="font-display text-2xl">
          Adreslerim
        </h2>
        <p className="mt-2 text-sm text-muted">Ödeme sayfasında kayıtlı adreslerinizden birini seçebilirsiniz.</p>

        {!failed && addresses.length > 0 && (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {addresses.map((address) => (
              <li key={address.id} className="flex flex-col rounded-md border border-line p-4 text-sm">
                <p className="font-semibold">{addressLabel(address)}</p>
                <p className="mt-1 text-muted">
                  {address.name} · <span className="whitespace-nowrap">{formatPhone(address.phone)}</span>
                </p>
                <p className="break-words text-muted">{address.line}</p>
                <p className="text-muted">
                  {address.district} / {address.city} · {address.postalCode}
                </p>
                <form action={deleteAddressAction} className="mt-auto pt-2">
                  <input type="hidden" name="adres" value={address.id} />
                  <button
                    type="submit"
                    aria-label={`Adresi sil: ${addressLabel(address)}`}
                    className="-ml-2 inline-flex min-h-11 items-center px-2 text-xs tracking-widest text-muted uppercase underline transition hover:text-danger"
                  >
                    Sil
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {!failed && (
          <div className="mt-4">
            <AddressBookForm action={saveAddressAction} defaultName={customer.name} />
          </div>
        )}
      </section>
    </div>
  );
}
