"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { decideReview, deleteReviewByAdmin } from "@/lib/reviews";

const TABS = new Set(["bekleyen", "yayinda", "yayimlanmadi"]);

// Yorumu onayla / reddet / sil. Yorum kimliği formdan gelir (güvenilmez): biçimi lib'de denetlenir.
export async function reviewDecisionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("yorum") ?? "");
  const decision = formData.get("karar");
  const tab = String(formData.get("sekme") ?? "bekleyen");
  let done = false;
  if (decision === "onayla") done = await decideReview(id, "approved");
  else if (decision === "reddet") done = await decideReview(id, "rejected");
  else if (decision === "sil") done = await deleteReviewByAdmin(id);
  revalidatePath("/", "layout"); // ürün sayfalarındaki yorumlar değişir
  const result = done ? String(decision) : "degismedi";
  redirect(`/yonetim/yorumlar?durum=${TABS.has(tab) ? tab : "bekleyen"}&sonuc=${encodeURIComponent(result)}`);
}
