"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { oneLine } from "@/lib/form-text";
import { adjustStock, STOCK_ADJUST_MAX, STOCK_REASON_MAX } from "@/lib/stock-admin";

export type StockAdjustState = { message?: string; error?: string } | undefined;

// Stok ekle / çıkar. slug sayfada bağlanır (bind) ama güvenilmez: ürün veritabanında aranır.
export async function adjustStockAction(
  slug: string,
  _state: StockAdjustState,
  formData: FormData,
): Promise<StockAdjustState> {
  const admin = await requireAdmin();
  if (typeof slug !== "string" || slug === "") return { error: "Ürün bulunamadı." };

  const direction = formData.get("yon");
  if (direction !== "ekle" && direction !== "cikar") return { error: "Ekle ya da çıkar seçin." };
  const text = oneLine(formData.get("adet"));
  const amount = /^\d{1,5}$/.test(text) ? Number(text) : NaN;
  if (!Number.isInteger(amount) || amount < 1 || amount > STOCK_ADJUST_MAX) {
    return { error: `Adedi 1 ile ${STOCK_ADJUST_MAX.toLocaleString("tr-TR")} arasında bir tam sayı olarak yazın.` };
  }
  const reason = oneLine(formData.get("aciklama"));
  if ([...reason].length > STOCK_REASON_MAX) return { error: `Açıklama en çok ${STOCK_REASON_MAX} karakter olabilir.` };

  let result;
  try {
    result = await adjustStock(slug, direction === "ekle" ? amount : -amount, admin.email, reason);
  } catch (error) {
    console.error("Stok güncellenemedi", error);
    return { error: "Stok şu an güncellenemedi. Biraz sonra yeniden deneyin." };
  }
  if (!result.ok) return { error: result.error };

  revalidatePath("/", "layout"); // stok mağaza sayfalarında da görünür
  return { message: `${direction === "ekle" ? `${amount} adet eklendi` : `${amount} adet çıkarıldı`}; stok şimdi ${result.stock}.` };
}
