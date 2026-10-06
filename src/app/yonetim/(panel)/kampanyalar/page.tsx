import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { couponLabel, dayOf, type Coupon } from "@/lib/coupon-model";
import { listCoupons } from "@/lib/coupons";
import { toggleCouponAction } from "./actions";

export const metadata: Metadata = { title: "Kampanyalar · Yönetim · TAURA" };

// Listede gösterilen durum: durduruldu, süresi doldu, hakkı bitti ya da etkin.
function couponState(coupon: Coupon): string {
  if (!coupon.active) return "Durduruldu";
  if (coupon.endsAt.getTime() < Date.now()) return "Süresi doldu";
  if (coupon.usageLimit !== null && coupon.used >= coupon.usageLimit) return "Hakkı bitti";
  return "Etkin";
}

const dateText = (date: Date) =>
  new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }).format(date);

// Kampanyalar: indirim kuponları. Müşteri kodu sepette yazar; indirim sunucuda hesaplanır, kullanım sipariş verilince ayrılır,
// ödeme alınınca kesinleşir, sipariş iptal edilir ya da ödeme olmazsa geri döner.
export default async function CampaignsPage({ searchParams }: PageProps<"/yonetim/kampanyalar">) {
  await requireAdmin();
  const { sonuc } = await searchParams;
  const coupons = await listCoupons();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Kampanyalar</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            İndirim kuponları. Müşteri kodu sepette yazar. Kullanım sipariş verilince ayrılır, ödeme alınınca kesinleşir;
            sipariş iptal edilir ya da kartla ödeme olmazsa geri döner.
          </p>
        </div>
        <Link
          href="/yonetim/kampanyalar/yeni"
          className="inline-flex min-h-11 items-center bg-espresso px-6 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
        >
          Yeni kupon
        </Link>
      </div>

      {sonuc === "eklendi" && (
        <p role="status" className="mt-6 rounded-md bg-paper p-3 text-sm shadow-sm">
          Kupon eklendi.
        </p>
      )}

      {coupons.length === 0 ? (
        <p className="mt-8 rounded-md bg-paper p-4 text-sm text-muted">Henüz kupon yok.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {coupons.map((coupon) => {
            const state = couponState(coupon);
            const live = state === "Etkin";
            return (
              <li key={coupon.id} className="rounded-lg bg-paper p-4 shadow-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                  <div className="min-w-0">
                    <p className="font-semibold tracking-wider">
                      <Link href={`/yonetim/kampanyalar/${coupon.id}`} className="transition hover:text-primary hover:underline">
                        {coupon.code}
                      </Link>
                      <span
                        className={`ml-3 rounded-full border px-2 py-0.5 text-xs font-semibold tracking-normal ${live ? "border-bordo text-bordo" : "border-field text-muted"}`}
                      >
                        {state}
                      </span>
                    </p>
                    <p className="mt-1 text-sm">
                      {couponLabel(coupon)} · son gün {dateText(coupon.endsAt)} ({dayOf(coupon.endsAt)})
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Kullanım {coupon.used}
                      {coupon.usageLimit !== null ? ` / ${coupon.usageLimit}` : " (sınırsız)"}
                      {coupon.minSubtotal > 0 && ` · en az ${coupon.minSubtotal.toLocaleString("tr-TR")} TL sepet`}
                      {coupon.onePerCustomer && " · müşteri başına tek kullanım"}
                      {coupon.allowGuests ? " · misafirler kullanabilir" : " · yalnız üyeler"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4">
                    <Link
                      href={`/yonetim/kampanyalar/${coupon.id}`}
                      className="inline-flex min-h-11 items-center text-xs tracking-widest uppercase underline transition hover:text-primary"
                    >
                      Düzenle<span className="sr-only">: {coupon.code}</span>
                    </Link>
                    <form action={toggleCouponAction}>
                      <input type="hidden" name="kupon" value={coupon.id} />
                      <input type="hidden" name="etkin" value={coupon.active ? "hayir" : "evet"} />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase underline transition hover:text-primary"
                      >
                        {coupon.active ? "Durdur" : "Etkinleştir"}
                        <span className="sr-only">: {coupon.code}</span>
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
