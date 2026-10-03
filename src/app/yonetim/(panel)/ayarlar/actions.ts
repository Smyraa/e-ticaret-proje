"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import type { DeleteState } from "@/lib/product-form";
import { clearHeroImage, writeSettings } from "@/lib/settings-admin";
import { readSettingsForm, settingsValues, type SettingsFormState } from "@/lib/settings-form";

// Site ayarlarını kaydeder. Yetki bu işlevin içinde denetlenir; girdiler güvenilmez kabul edilip yeniden doğrulanır.
export async function saveSettings(_state: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  await requireAdmin();

  const { values, errors, data } = readSettingsForm(formData);
  if (!data) return { values, errors };

  try {
    await writeSettings(data);
  } catch (error) {
    console.error("Ayarlar kaydedilemedi", error);
    return { values, message: "Kaydedilemedi. Veritabanına ulaşılamıyor olabilir; biraz sonra yeniden deneyin." };
  }

  revalidatePath("/", "layout"); // iletişim sayfası, alt bilgi, WhatsApp düğmeleri, sepet/ödeme: hepsi yeni değerleri okusun
  return { values: settingsValues(data), saved: true }; // telefonlar okunaklı biçimiyle forma döner
}

// Ana sayfa görselini kaldırır. "onay" alanı, tarayıcıdaki onay penceresinden SONRA forma yazılır (ürün silmedeki gibi).
export async function removeHeroImage(_state: DeleteState, formData: FormData): Promise<DeleteState> {
  await requireAdmin();
  if (formData.get("onay") !== "evet") return { error: "Kaldırma onaylanmadı. Sayfa tam yüklenince yeniden deneyin." };

  try {
    await clearHeroImage();
  } catch (error) {
    console.error("Ana sayfa görseli kaldırılamadı", error);
    return { error: "Kaldırılamadı. Veritabanına ulaşılamıyor olabilir; biraz sonra yeniden deneyin." };
  }

  revalidatePath("/", "layout");
  redirect("/yonetim/ayarlar?gorsel=kaldirildi");
}
