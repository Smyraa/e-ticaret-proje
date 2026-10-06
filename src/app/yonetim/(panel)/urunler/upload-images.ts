import { checkImageFile, IMAGE_LIMITS } from "@/lib/images";

// Ürün görsellerini tarayıcıdan sırayla, dosya başına bir istekle yükler (yol: /yonetim/urunler/<ürün>/gorseller; her dosya
// sunucuda ayrıca doğrulanır). Görseller bölümü ve yeni ürün formu ortak kullanır.

export type Upload = { name: string; state: "waiting" | "working" | "done" | "error"; message?: string };

export const UPLOAD_STATE_TEXT: Record<Upload["state"], string> = {
  waiting: "Sırada",
  working: "Yükleniyor…",
  done: "Eklendi",
  error: "Eklenemedi",
};

// free: üründe kalan boş yer. onChange her durum değişiminde güncel listeyi verir.
export async function uploadImages(
  slug: string,
  files: File[],
  free: number,
  onChange: (uploads: Upload[]) => void,
): Promise<{ added: number; failed: number }> {
  const items: Upload[] = files.map((file) => ({ name: file.name, state: "waiting" }));
  onChange([...items]);
  const update = (index: number, patch: Partial<Upload>) => {
    items[index] = { ...items[index], ...patch };
    onChange([...items]);
  };

  let added = 0;
  for (const [index, file] of files.entries()) {
    update(index, { state: "working" });
    const problem = checkImageFile(file) ?? (free <= 0 ? `Bir ürüne en çok ${IMAGE_LIMITS.maxCount} görsel eklenebilir.` : null);
    if (problem) {
      update(index, { state: "error", message: problem });
      continue;
    }
    try {
      const body = new FormData();
      body.append("dosya", file);
      const response = await fetch(`/yonetim/urunler/${encodeURIComponent(slug)}/gorseller`, { method: "POST", body });
      const data: { ok?: boolean; error?: string } | null = await response.json().catch(() => null);
      if (response.ok && data?.ok) {
        update(index, { state: "done" });
        free -= 1;
        added += 1;
      } else {
        update(index, { state: "error", message: data?.error ?? `Yüklenemedi (HTTP ${response.status}).` });
      }
    } catch {
      update(index, { state: "error", message: "Bağlantı kurulamadı." });
    }
  }
  return { added, failed: files.length - added };
}

// Yükleme özetinin cümlesi.
export function uploadSummary(added: number, failed: number): string {
  if (added === 0) return "Hiçbir görsel eklenemedi.";
  return failed === 0 ? `${added} görsel eklendi.` : `${added} görsel eklendi, ${failed} dosya eklenemedi.`;
}
