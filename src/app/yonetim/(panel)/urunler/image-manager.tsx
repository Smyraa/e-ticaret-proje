"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { IMAGE_ACCEPT, IMAGE_LIMITS, IMAGE_TYPES, MAX_MB, type ImageActionState } from "@/lib/images";
import { mediaUrl } from "@/lib/media";
type Props = {
  slug: string;
  images: string[]; // dosya adları; ilki ana görsel
  // Liste işlemlerinin sunucu eylemi. Sayfa (sunucu) bağlar ve buraya verir: eylem bu bileşende `.bind` edilirse her
  // çizimde yeni bir işlev olur ve JavaScript'siz gönderimde sunucu çizimi sonsuz döngüye girer.
  action: (state: ImageActionState, formData: FormData) => Promise<ImageActionState>;
};

type Upload = { name: string; state: "waiting" | "working" | "done" | "error"; message?: string };

const STATE_TEXT: Record<Upload["state"], string> = {
  waiting: "Sırada",
  working: "Yükleniyor…",
  done: "Eklendi",
  error: "Eklenemedi",
};

const linkButton =
  "inline-flex min-h-11 items-center text-[11px] tracking-wider uppercase underline transition hover:text-primary disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40 md:text-xs md:tracking-widest";

// Tarayıcıda yapılan ön denetim (hızlı geri bildirim için); asıl denetim sunucuda yapılır.
function precheck(file: File): string | null {
  if (file.type && !IMAGE_TYPES.includes(file.type)) {
    return "Yalnız JPG, PNG veya WebP yüklenebilir. HEIC ise fotoğrafı JPG olarak kaydedip yükleyin.";
  }
  if (file.size > IMAGE_LIMITS.maxBytes) return `Dosya ${MAX_MB} MB'tan büyük.`;
  if (file.size === 0) return "Dosya boş.";
  return null;
}

// Ürünün görselleri: sıralama (yukarı/aşağı/ana görsel yap), silme ve yükleme.
// Yükleme istekleri sırayla, dosya başına bir istek olarak gider (her biri ayrı doğrulanır).
export function ImageManager({ slug, images, action }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, undefined);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  // Yeni bir işlem başlayınca bir önceki işlemin iletisi (ve yükleme özeti) ekranda kalmasın.
  const [dismissed, setDismissed] = useState<ImageActionState>(undefined);
  const result = state !== dismissed ? state : undefined;
  // İşlemden sonra odağı kaybetmemek için: hangi görselin satırına dönülecek (silmede bölüm başlığına).
  const lastTarget = useRef<string | null>(null);

  const remaining = IMAGE_LIMITS.maxCount - images.length;
  const disabled = pending || busy;

  useEffect(() => {
    if (!state || !lastTarget.current) return;
    const target = lastTarget.current;
    lastTarget.current = null;
    const element = document.querySelector<HTMLElement>(target === "heading" ? "#gorseller-baslik" : `[data-satir="${target}"]`);
    element?.focus();
  }, [state]);

  // Liste düğmesine basılınca: odak dönüş hedefi kaydedilir, eski yükleme özeti temizlenir.
  function begin(target: string) {
    lastTarget.current = target;
    setUploads([]);
    setSummary("");
  }

  async function onFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ""; // aynı dosyayı yeniden seçebilmek için
    if (files.length === 0) return;

    setBusy(true);
    setDismissed(state);
    setSummary("");
    const items: Upload[] = files.map((file) => ({ name: file.name, state: "waiting" }));
    setUploads(items);
    const update = (index: number, patch: Partial<Upload>) => {
      items[index] = { ...items[index], ...patch };
      setUploads([...items]);
    };

    let free = remaining;
    let added = 0;
    for (const [index, file] of files.entries()) {
      update(index, { state: "working" });
      const problem = precheck(file) ?? (free <= 0 ? `Bir ürüne en çok ${IMAGE_LIMITS.maxCount} görsel eklenebilir.` : null);
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

    const failed = files.length - added;
    setSummary(
      added === 0
        ? "Hiçbir görsel eklenemedi."
        : failed === 0
          ? `${added} görsel eklendi.`
          : `${added} görsel eklendi, ${failed} dosya eklenemedi.`,
    );
    setBusy(false);
    router.refresh(); // yeni görseller listede görünsün
  }

  return (
    <section aria-labelledby="gorseller-baslik" className="mt-10">
      <h2 id="gorseller-baslik" tabIndex={-1} className="font-display text-2xl">
        Görseller
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        İlk görsel ana görseldir; kartlarda ve ürün sayfasının başında o görünür. Sitede görseller dikey (4:5) kadraja
        ortadan kırpılarak sığdırılır, ürünü ortalayın. Yüklenen fotoğraflardan konum, tarih gibi gizli bilgiler silinir ve
        en uzun kenar {IMAGE_LIMITS.maxEdge} pikseli aşmaz.
      </p>

      {images.length === 0 ? (
        <p className="mt-4 rounded-lg bg-paper p-4 text-sm text-muted">
          Henüz görsel yok. Sitede “Fotoğraf yakında” yazısı görünür.
        </p>
      ) : (
        <form action={formAction} className="mt-4">
          <ul className="divide-y divide-line rounded-lg bg-paper shadow-sm">
            {images.map((name, index) => {
              const label = index === 0 ? "Ana görsel" : `Görsel ${index + 1}`;
              return (
                <li key={name} className="flex gap-4 p-4">
                  <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-md bg-soft sm:w-20">
                    <Image src={mediaUrl(name)} alt="" fill sizes="80px" className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      data-satir={name}
                      tabIndex={-1}
                      className="py-1 text-sm font-semibold focus:outline-none focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      {label}
                      <span className="sr-only"> ({images.length} görselden {index + 1}.)</span>
                    </p>
                    <div className="flex flex-wrap gap-x-4">
                      <button
                        type="submit"
                        name="islem"
                        value={`yukari:${name}`}
                        disabled={disabled || index === 0}
                        onClick={() => begin(name)}
                        className={linkButton}
                      >
                        Yukarı<span className="sr-only"> al: {label}</span>
                      </button>
                      <button
                        type="submit"
                        name="islem"
                        value={`asagi:${name}`}
                        disabled={disabled || index === images.length - 1}
                        onClick={() => begin(name)}
                        className={linkButton}
                      >
                        Aşağı<span className="sr-only"> al: {label}</span>
                      </button>
                      {index > 0 && (
                        <button
                          type="submit"
                          name="islem"
                          value={`ana:${name}`}
                          disabled={disabled}
                          onClick={() => begin(name)}
                          className={linkButton}
                        >
                          Ana görsel yap<span className="sr-only">: {label}</span>
                        </button>
                      )}
                      <button
                        type="submit"
                        name="islem"
                        value={`sil:${name}`}
                        disabled={disabled}
                        onClick={(event) => {
                          if (!window.confirm("Bu görsel silinsin mi? Bu işlem geri alınamaz.")) {
                            event.preventDefault();
                            return;
                          }
                          begin("heading");
                        }}
                        className={`${linkButton} text-danger`}
                      >
                        Sil<span className="sr-only">: {label}</span>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </form>
      )}

      <p role="status" className="mt-3 min-h-6 text-sm">
        {result?.message ?? ""}
      </p>
      {result?.error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {result.error}
        </p>
      )}

      <div className="mt-4">
        <label htmlFor="gorsel-sec" className="text-sm">
          Görsel ekle
        </label>
        <input
          id="gorsel-sec"
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          disabled={disabled || remaining <= 0}
          onChange={onFiles}
          aria-describedby="gorsel-ipucu"
          className="mt-2 block w-full text-sm file:mr-4 file:min-h-11 file:cursor-pointer file:border-0 file:bg-espresso file:px-6 file:text-xs file:font-semibold file:tracking-widest file:text-paper file:uppercase hover:file:bg-primary disabled:opacity-60 disabled:file:cursor-not-allowed"
        />
        <p id="gorsel-ipucu" className="mt-1 text-xs text-muted">
          JPG, PNG veya WebP · dosya başına en çok {MAX_MB} MB · üründe en çok {IMAGE_LIMITS.maxCount} görsel
          {remaining > 0 ? ` (${remaining} tane daha eklenebilir)` : " (sınıra ulaşıldı; yenisini eklemek için birini silin)"}.
          Birden çok dosya seçebilirsiniz.
        </p>
      </div>

      {uploads.length > 0 && (
        <ul aria-label="Yükleme durumu" className="mt-3 space-y-1 text-sm">
          {uploads.map((upload, index) => (
            <li key={index} className={upload.state === "error" ? "text-danger" : "text-muted"}>
              <span className="break-all text-ink">{upload.name}</span>: {STATE_TEXT[upload.state]}
              {upload.message ? ` — ${upload.message}` : ""}
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="mt-2 min-h-6 text-sm font-semibold">
        {summary}
      </p>
    </section>
  );
}
