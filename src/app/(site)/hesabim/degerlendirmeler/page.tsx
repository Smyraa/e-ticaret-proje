import Link from "next/link";
import { redirect } from "next/navigation";
import { Stars } from "@/components/stars";
import { getCustomer } from "@/lib/customer-auth";
import { pageMetadata } from "@/lib/metadata";
import { myReviews, REVIEW_STATUS_LABELS, reviewableProducts, type Review, type Reviewable } from "@/lib/reviews";
import { deleteReviewAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("Değerlendirmelerim", "Ürün yorumlarınız.", { noindex: true });

const linkButton =
  "inline-flex min-h-11 items-center border border-field px-6 text-xs font-semibold tracking-widest uppercase transition hover:border-primary hover:text-primary";

// Değerlendirmelerim: teslim edilen siparişlerdeki, henüz yorum yazılmamış ürünler ("Yorum yaz") ve yazılan yorumlar
// (durumu, onaydan önce düzenleme, silme).
export default async function MyReviewsPage({ searchParams }: PageProps<"/hesabim/degerlendirmeler">) {
  const notice = (await searchParams).yorum;
  const customer = await getCustomer();
  if (!customer) redirect("/giris?donus=/hesabim/degerlendirmeler");

  let reviews: Review[] = [];
  let reviewable: Reviewable[] = [];
  let failed = false;
  try {
    [reviews, reviewable] = await Promise.all([myReviews(customer.id), reviewableProducts(customer.id)]);
  } catch (error) {
    console.error("Yorumlar okunamadı", error);
    failed = true;
  }
  const toWrite = reviewable.filter((item) => !reviews.some((review) => review.slug === item.slug));

  return (
    <section aria-labelledby="yorumlar-baslik">
      <h1 id="yorumlar-baslik" className="font-display text-3xl sm:text-4xl">
        Değerlendirmelerim
      </h1>
      <p className="mt-2 text-sm text-muted">
        Teslim edilen siparişlerinizdeki ürünlere yorum yazabilirsiniz. Yorumlar onaydan sonra ürün sayfasında görünür.
      </p>
      {(notice === "kaydedildi" || notice === "silindi") && (
        <p role="status" className="mt-4 rounded-md bg-soft p-3 text-sm">
          {notice === "kaydedildi" ? "Yorumunuz kaydedildi; onaylanınca ürün sayfasında görünecek." : "Yorumunuz silindi."}
        </p>
      )}

      {failed && <p className="mt-6 rounded-md bg-soft p-4 text-sm text-muted">Yorumlar şu an yüklenemedi. Biraz sonra yeniden deneyin.</p>}

      {!failed && toWrite.length > 0 && (
        <>
          <h2 className="mt-8 text-xs font-semibold tracking-widest text-muted uppercase">Yorum bekleyen ürünler</h2>
          <ul className="mt-3 divide-y divide-gold/30 rounded-xl border border-gold/40 bg-paper/50 px-4">
            {toWrite.map((item) => (
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
        </>
      )}

      {!failed && reviews.length > 0 && (
        <>
          <h2 className="mt-8 text-xs font-semibold tracking-widest text-muted uppercase">Yorumlarım</h2>
          <ul className="mt-3 space-y-3">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-xl border border-gold/40 bg-paper/50 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/urun/${review.slug}`} className="font-semibold transition hover:text-primary">
                    {review.productName}
                  </Link>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                      review.status === "approved" ? "border-ink" : review.status === "rejected" ? "border-danger text-danger" : "border-field text-muted"
                    }`}
                  >
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
        </>
      )}

      {!failed && reviewable.length === 0 && reviews.length === 0 && (
        <p className="mt-6 rounded-xl border border-gold/40 bg-paper/50 p-6 text-sm text-muted">
          Henüz teslim edilmiş siparişiniz yok. Siparişiniz teslim edilince ürünlere buradan yorum yazabilirsiniz.
        </p>
      )}
    </section>
  );
}
