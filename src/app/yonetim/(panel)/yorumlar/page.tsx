import type { Metadata } from "next";
import Link from "next/link";
import { Stars } from "@/components/stars";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { countPendingReviews, listReviewsForAdmin, type ReviewStatus } from "@/lib/reviews";
import { reviewDecisionAction } from "./actions";

export const metadata: Metadata = { title: "Yorumlar · Yönetim · TAURA" };

const TABS: { key: string; status: ReviewStatus; label: string }[] = [
  { key: "bekleyen", status: "pending", label: "Onay bekleyen" },
  { key: "yayinda", status: "approved", label: "Yayında" },
  { key: "yayimlanmadi", status: "rejected", label: "Yayımlanmadı" },
];

const RESULTS: Record<string, string> = {
  onayla: "Yorum onaylandı; ürün sayfasında görünüyor.",
  reddet: "Yorum yayımlanmadı olarak işaretlendi; ürün sayfasında görünmez.",
  sil: "Yorum silindi.",
  degismedi: "Yorum bu arada değişmiş ya da silinmiş; liste yenilendi.",
};

const button =
  "inline-flex min-h-11 items-center px-4 text-xs font-semibold tracking-widest uppercase transition disabled:opacity-60";

// Yorumlar: müşterilerin yazdığı yorumlar yönetim onayıyla yayımlanır. Bekleyenler eskiden yeniye sıralanır.
export default async function ReviewsPage({ searchParams }: PageProps<"/yonetim/yorumlar">) {
  await requireAdmin();
  const { durum, sonuc } = await searchParams;
  const tab = TABS.find((item) => item.key === durum) ?? TABS[0];
  const [reviews, pending] = await Promise.all([listReviewsForAdmin(tab.status), countPendingReviews()]);
  const result = typeof sonuc === "string" ? RESULTS[sonuc] : undefined;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="font-display text-4xl">Yorumlar</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        Yalnız ürünü teslim almış müşteriler yorum yazabilir. Yorumlar siz onaylayınca ürün sayfasında görünür; müşteri
        kendi yorumunun durumunu Hesabım sayfasında görür.
      </p>

      <nav aria-label="Yorum durumu" className="mt-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/yonetim/yorumlar?durum=${item.key}`}
            aria-current={item.key === tab.key ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition ${
              item.key === tab.key ? "border-bordo bg-bordo text-paper" : "border-field hover:border-primary hover:text-primary"
            }`}
          >
            {item.label}
            {item.status === "pending" && pending > 0 ? ` (${pending})` : ""}
          </Link>
        ))}
      </nav>

      {result && (
        <p role="status" className="mt-4 rounded-md bg-paper p-3 text-sm shadow-sm">
          {result}
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="mt-6 rounded-md bg-paper p-4 text-sm text-muted">Bu durumda yorum yok.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-lg bg-paper p-5 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/urun/${review.slug}`} target="_blank" className="font-semibold transition hover:text-primary">
                  {review.productName}
                  <span className="sr-only"> (yeni sekmede açılır)</span>
                </Link>
                <span className="text-xs text-muted">{formatDateTime(review.createdAt)}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <Stars rating={review.rating} />
                <span>{review.authorName}</span>
                <span className="text-muted">
                  · Sipariş{" "}
                  <Link href={`/yonetim/siparisler/${review.orderNumber}`} className="underline hover:text-primary">
                    {review.orderNumber}
                  </Link>
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed break-words whitespace-pre-line">{review.text}</p>

              <form action={reviewDecisionAction} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="yorum" value={review.id} />
                <input type="hidden" name="sekme" value={tab.key} />
                {review.status !== "approved" && (
                  <button type="submit" name="karar" value="onayla" className={`${button} bg-espresso text-paper hover:bg-primary`}>
                    Onayla<span className="sr-only">: {review.productName}, {review.authorName}</span>
                  </button>
                )}
                {review.status !== "rejected" && (
                  <button type="submit" name="karar" value="reddet" className={`${button} border border-field hover:border-primary hover:text-primary`}>
                    Yayımlama<span className="sr-only">: {review.productName}, {review.authorName}</span>
                  </button>
                )}
                <button type="submit" name="karar" value="sil" className={`${button} text-danger underline`}>
                  Sil<span className="sr-only">: {review.productName}, {review.authorName}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
