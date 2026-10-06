"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  addToShowcase,
  createCategory,
  deleteCategory,
  isShowcaseKey,
  moveCategory,
  moveInShowcase,
  removeFromShowcase,
  renameCategory,
} from "@/lib/catalog";
import { oneLine } from "@/lib/form-text";

// Site Görünümü sayfasının işlemleri. Hepsi işlemden sonra sayfaya, ilgili bölüme ve bir sonuç iletisiyle döner.
const back = (section: string, result: string) => redirect(`/yonetim/gorunum?sonuc=${encodeURIComponent(result)}#${section}`);

export async function categoryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const op = formData.get("islem");
  const id = String(formData.get("kategori") ?? "");
  const name = oneLine(formData.get("ad"));
  let result = "tamam";
  if (op === "ekle") {
    const created = await createCategory(name);
    if (!created.ok) result = created.message;
  } else if (op === "adlandir") {
    const renamed = await renameCategory(id, name);
    if (!renamed.ok) result = renamed.message;
  } else if (op === "yukari" || op === "asagi") {
    await moveCategory(id, op === "yukari" ? "up" : "down");
  } else if (op === "sil") {
    if (formData.get("onay") !== "evet") result = "Silmek için onay gerekli.";
    else await deleteCategory(id);
  } else result = "Bilinmeyen işlem.";
  revalidatePath("/", "layout");
  back("kategoriler-baslik", result);
}

export async function showcaseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const key = formData.get("vitrin");
  if (!isShowcaseKey(key)) back("vitrinler-baslik", "Vitrin bulunamadı.");
  const showcase = key as Parameters<typeof addToShowcase>[0];
  const op = formData.get("islem");
  const slug = oneLine(formData.get("urun")).slice(0, 100);
  let result = "tamam";
  if (!slug) result = "Bir ürün seçin.";
  else if (op === "ekle") {
    const added = await addToShowcase(showcase, slug);
    if (!added.ok) result = added.message;
  } else if (op === "cikar") await removeFromShowcase(showcase, slug);
  else if (op === "yukari" || op === "asagi") await moveInShowcase(showcase, slug, op === "yukari" ? "up" : "down");
  else result = "Bilinmeyen işlem.";
  revalidatePath("/", "layout");
  back(`vitrin-${showcase}`, result);
}
