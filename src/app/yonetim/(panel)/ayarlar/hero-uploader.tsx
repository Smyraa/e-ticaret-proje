"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { checkImageFile, IMAGE_ACCEPT, MAX_MB } from "@/lib/images";

// Ana sayfa görseli yükleme: dosya seçilince hemen yüklenir; sonuç ekranda yazılır, bitince sayfa yenilenir.
export function HeroUploader({ hasImage }: { hasImage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; error: boolean } | null>(null);

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // aynı dosyayı yeniden seçebilmek için
    if (!file) return;

    const problem = checkImageFile(file);
    if (problem) {
      setResult({ text: problem, error: true });
      return;
    }

    setBusy(true);
    setResult(null);
    try {
      const body = new FormData();
      body.append("dosya", file);
      const response = await fetch("/yonetim/ayarlar/gorsel", { method: "POST", body });
      const data: { ok?: boolean; error?: string } | null = await response.json().catch(() => null);
      if (response.ok && data?.ok) {
        setResult({ text: "Ana sayfa görseli değişti.", error: false });
        router.refresh();
      } else {
        setResult({ text: data?.error ?? `Yüklenemedi (HTTP ${response.status}).`, error: true });
      }
    } catch {
      setResult({ text: "Bağlantı kurulamadı.", error: true });
    }
    setBusy(false);
  }

  return (
    <div>
      <label htmlFor="ana-gorsel-sec" className="text-sm">
        {hasImage ? "Görseli değiştir" : "Görsel yükle"}
      </label>
      <input
        id="ana-gorsel-sec"
        type="file"
        accept={IMAGE_ACCEPT}
        disabled={busy}
        onChange={onChange}
        aria-describedby="ana-gorsel-ipucu"
        className="mt-2 block w-full text-sm file:mr-4 file:min-h-11 file:cursor-pointer file:border-0 file:bg-espresso file:px-6 file:text-xs file:font-semibold file:tracking-widest file:text-paper file:uppercase hover:file:bg-primary disabled:opacity-60 disabled:file:cursor-not-allowed"
      />
      <p id="ana-gorsel-ipucu" className="mt-1 text-xs text-muted">
        JPG, PNG veya WebP · en çok {MAX_MB} MB. Görsel ana sayfada dikey (4:5) kadraja ortadan kırpılarak sığdırılır.
      </p>
      <p role={result?.error ? "alert" : "status"} className={`mt-2 min-h-6 text-sm ${result?.error ? "font-semibold text-danger" : ""}`}>
        {busy ? "Yükleniyor…" : (result?.text ?? "")}
      </p>
    </div>
  );
}
