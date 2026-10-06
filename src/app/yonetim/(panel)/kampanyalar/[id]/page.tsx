import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { couponValues } from "@/lib/coupon-model";
import { getCoupon } from "@/lib/coupons";
import { saveCouponAction } from "../actions";
import { CouponForm } from "../coupon-form";

export const metadata: Metadata = { title: "Kuponu düzenle · Yönetim · TAURA" };

export default async function EditCouponPage({ params }: PageProps<"/yonetim/kampanyalar/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const coupon = await getCoupon(id);
  if (!coupon) notFound();
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href="/yonetim/kampanyalar"
        className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase transition hover:text-primary"
      >
        ← Kampanyalara dön
      </Link>
      <h1 className="mt-4 font-display text-4xl">Kuponu düzenle</h1>
      <p className="mt-3 text-sm text-muted">{coupon.code}</p>
      <CouponForm
        action={saveCouponAction.bind(null, coupon.id)}
        initial={couponValues(coupon)}
        submitLabel="Kaydet"
        used={coupon.used}
      />
    </div>
  );
}
