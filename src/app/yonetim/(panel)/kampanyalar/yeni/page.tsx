import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { EMPTY_COUPON } from "@/lib/coupon-model";
import { createCouponAction } from "../actions";
import { CouponForm } from "../coupon-form";

export const metadata: Metadata = { title: "Yeni kupon · Yönetim · TAURA" };

export default async function NewCouponPage() {
  await requireAdmin();
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href="/yonetim/kampanyalar"
        className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase transition hover:text-primary"
      >
        ← Kampanyalara dön
      </Link>
      <h1 className="mt-4 font-display text-4xl">Yeni kupon</h1>
      <CouponForm action={createCouponAction} initial={EMPTY_COUPON} submitLabel="Kuponu ekle" />
    </div>
  );
}
