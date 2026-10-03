"use server";

import { changePassword, requireAdmin } from "@/lib/auth";

// Form durumu: hata iletisi ve hatanın ait olduğu kutu; başarıda changed.
export type PasswordFormState =
  | { changed?: boolean; error?: string; field?: "mevcut" | "yeni" | "tekrar" | null }
  | undefined;

export async function changeAdminPassword(
  _state: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const admin = await requireAdmin();
  const current = String(formData.get("mevcut") ?? "");
  const next = String(formData.get("yeni") ?? "");
  const again = String(formData.get("tekrar") ?? "");

  if (!current) return { error: "Mevcut parolayı yazın.", field: "mevcut" };
  if (!next) return { error: "Yeni parolayı yazın.", field: "yeni" };
  if (next !== again) return { error: "Yeni parolalar aynı değil.", field: "tekrar" };

  try {
    const result = await changePassword(admin, current, next);
    if (!result.ok) return { error: result.message, field: result.field };
  } catch (error) {
    console.error("Parola değiştirilemedi", error);
    return { error: "Şu an kaydedilemedi. Biraz sonra yeniden deneyin.", field: null };
  }
  return { changed: true };
}
