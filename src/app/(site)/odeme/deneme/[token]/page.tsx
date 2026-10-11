import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { pageMetadata } from "@/lib/metadata";
import { paymentSetup } from "@/lib/payment-config";
import { getFakeSession } from "@/lib/payment-fake";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("Deneme ödemesi", "Gerçek olmayan deneme ödeme sayfası.", { noindex: true });

const button =
  "min-h-11 w-full px-8 text-xs font-semibold tracking-widest uppercase transition disabled:opacity-60";

// Deneme ödeme sayfası: GERÇEK BİR ÖDEME SAYFASI DEĞİLDİR. Gerçek bir ödeme kuruluşunun sayfasının yerine geçer; yalnız
// yerelde ödeme akışını hesapsız denemek için vardır ve ödeme ayarı "fake" değilse (ya da adres yerel değilse) yoktur.
export default async function FakePaymentPage({ params }: PageProps<"/odeme/deneme/[token]">) {
  if (paymentSetup().mode !== "fake") notFound();
  const { token } = await params;
  const session = await getFakeSession(token);
  if (!session) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="font-display text-4xl">Deneme ödeme sayfası</h1>
      <p className="mt-4 rounded-md border border-dashed border-line p-4 text-sm text-muted">
        Bu sayfa gerçek bir ödeme sayfası değildir. Yalnızca ödeme akışını denemek içindir: kart bilgisi istemez, para
        çekmez.
      </p>

      <dl className="mt-8 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Sipariş numarası</dt>
          <dd className="font-semibold tracking-wider">{session.orderNumber}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="font-semibold">Ödenecek tutar</dt>
          <dd className="font-display text-2xl">{formatPrice(session.amount)}</dd>
        </div>
      </dl>

      {session.decision === null ? (
        <form method="post" action={`/odeme/deneme/${token}/karar`} className="mt-8 space-y-3">
          <input type="hidden" name="token" value={token} />
          <button type="submit" name="karar" value="approve" className={`${button} bg-espresso text-paper hover:bg-primary`}>
            Ödemeyi onayla
          </button>
          <button
            type="submit"
            name="karar"
            value="decline"
            className={`${button} border border-espresso hover:border-primary hover:text-primary`}
          >
            Kartı reddet
          </button>
          <button
            type="submit"
            name="karar"
            value="cancel"
            className={`${button} border border-line text-muted hover:border-primary hover:text-primary`}
          >
            Vazgeç
          </button>
        </form>
      ) : (
        <form method="post" action="/odeme/geri-donus" className="mt-8 space-y-3">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm text-muted">Bu deneme ödemesi için karar verildi. Siteye dönerek sonucu görebilirsiniz.</p>
          <button type="submit" className={`${button} bg-espresso text-paper hover:bg-primary`}>
            Siteye dön
          </button>
        </form>
      )}
    </div>
  );
}
