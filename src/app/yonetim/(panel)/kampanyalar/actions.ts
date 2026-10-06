"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { readCouponForm, type CouponFormState } from "@/lib/coupon-model";
import { CouponCodeTakenError, createCoupon, getCoupon, setCouponActive, updateCoupon } from "@/lib/coupons";

const FAILED = "Kaydedilemedi. Veritabanına ulaşılamıyor olabilir; biraz sonra yeniden deneyin.";
const TAKEN = "Bu kodla başka bir kupon var.";

export async function createCouponAction(_state: CouponFormState, formData: FormData): Promise<CouponFormState> {
  await requireAdmin();
  const { values, errors, data } = readCouponForm(formData);
  if (!data) return { values, errors };
  try {
    await createCoupon(data);
  } catch (error) {
    if (error instanceof CouponCodeTakenError) return { values, errors: { code: TAKEN } };
    console.error("Kupon eklenemedi", error);
    return { values, message: FAILED };
  }
  revalidatePath("/yonetim/kampanyalar");
  redirect("/yonetim/kampanyalar?sonuc=eklendi");
}

// id sayfada bağlanır (bind) ama güvenilmez: kupon veritabanında aranır.
export async function saveCouponAction(id: string, _state: CouponFormState, formData: FormData): Promise<CouponFormState> {
  await requireAdmin();
  const existing = await getCoupon(String(id));
  const { values, errors, data } = readCouponForm(formData, existing ? "0000-00-00" : undefined); // var olanın geçmiş tarihi düzenlenebilir
  if (!existing) return { values, message: "Kupon bulunamadı; silinmiş olabilir." };
  if (!data) return { values, errors };
  try {
    await updateCoupon(existing.id, data);
  } catch (error) {
    if (error instanceof CouponCodeTakenError) return { values, errors: { code: TAKEN } };
    console.error("Kupon kaydedilemedi", error);
    return { values, message: FAILED };
  }
  revalidatePath("/yonetim/kampanyalar");
  return { values, saved: true };
}

export async function toggleCouponAction(formData: FormData): Promise<void> {
  await requireAdmin();
  await setCouponActive(String(formData.get("kupon") ?? ""), formData.get("etkin") === "evet");
  revalidatePath("/yonetim/kampanyalar");
  redirect("/yonetim/kampanyalar");
}
