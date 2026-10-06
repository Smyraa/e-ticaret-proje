import Link from "next/link";
import { redirect } from "next/navigation";
import { ReviewForm } from "@/components/review-form";
import { getCustomer } from "@/lib/customer-auth";
import { pageMetadata } from "@/lib/metadata";
import { myReviewFor, REVIEW_STATUS_LABELS, REVIEW_TEXT_MAX, REVIEW_TEXT_MIN, reviewableProducts } from "@/lib/reviews";
import { saveReviewAction } from "../../actions";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("Yorum yaz", "Teslim aldığınız ürünü değerlendirin.", { noindex: true });

// Teslim edilmiş siparişteki bir ürün için yorum yazma / bekleyen yorumu düzenleme sayfası.
export default async function ReviewPage({ params }: PageProps<"/hesabim/yorum/[slug]">) {
  const { slug } = await params;
  const customer = await getCustomer();
  if (!customer) redirect(`/giris?donus=/hesabim/yorum/${encodeURIComponent(slug)}`);

  const [allowed, existing] = await Promise.all([
    reviewableProducts(customer.id).then((items) => items.find((item) => item.slug === slug) ?? null),
    myReviewFor(customer.id, slug),
  ]);

  const back = (
    <Link
      href="/hesabim#yorumlar-baslik"
      className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase transition hover:text-primary"
    >
      ← Hesabıma dön
    </Link>
  );

  if (!allowed) {
    return (
      <div className="mx-auto max-w-xl px-6 py-10">
        {back}
        <h1 className="mt-4 font-display text-4xl">Yorum yaz</h1>
        <p className="mt-6 rounded-md bg-soft p-4 text-sm">
          Bu ürüne yorum yazabilmek için ürünü içeren siparişinizin teslim edilmiş olması gerekir.
        </p>
      </div>
    );
  }

  const locked = existing && existing.status !== "pending";
  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      {back}
      <h1 className="mt-4 font-display text-4xl">{existing ? "Yorumunuzu düzenleyin" : "Yorum yaz"}</h1>
      <p className="mt-3 text-sm text-muted">
        <Link href={`/urun/${allowed.slug}`} className="font-semibold text-ink underline transition hover:text-primary">
          {allowed.name}
        </Link>{" "}
        · Sipariş {allowed.orderNumber}
      </p>

      {locked ? (
        <p className="mt-6 rounded-md bg-soft p-4 text-sm">
          Bu ürün için yorumunuz “{REVIEW_STATUS_LABELS[existing.status]}” durumunda olduğu için düzenlenemez. İsterseniz
          Hesabım sayfasından silebilirsiniz.
        </p>
      ) : (
        <div className="mt-8">
          <ReviewForm
            action={saveReviewAction.bind(null, allowed.slug)}
            rating={existing?.rating ?? null}
            text={existing?.text ?? ""}
            max={REVIEW_TEXT_MAX}
            min={REVIEW_TEXT_MIN}
          />
        </div>
      )}
    </div>
  );
}
