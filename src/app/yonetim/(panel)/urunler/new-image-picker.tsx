"use client";

import { useEffect, useRef, type ChangeEvent } from "react";
import { checkImageFile, IMAGE_ACCEPT, IMAGE_LIMITS, MAX_MB } from "@/lib/images";
import { UPLOAD_STATE_TEXT, type Upload } from "./upload-images";

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  uploads: Upload[]; // ürün kaydedildikten sonra yükleme durumu
  disabled: boolean;
};

// Küçük önizleme: dosyanın geçici (blob:) adresi resme yazılır, satır kalkınca bellekten silinir.
function Thumb({ file }: { file: File }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  // Önizleme yerel blob: adresidir; next/image gerekmez.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} alt="" className="h-full w-full object-cover" />;
}

// Yeni ürün formundaki fotoğraf seçici. Dosyalar tarayıcıda bekler; ürün kaydedilince sırayla yüklenir (bkz. edit-form).
// Formda hata çıkarsa seçim kaybolmaz.
export function NewImagePicker({ files, onChange, uploads, disabled }: Props) {
  const free = IMAGE_LIMITS.maxCount - files.length;

  function add(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = ""; // aynı dosyayı yeniden seçebilmek için
    if (picked.length > 0) onChange([...files, ...picked].slice(0, IMAGE_LIMITS.maxCount));
  }

  return (
    <div className="rounded-lg bg-paper p-4 shadow-sm">
      <p className="text-sm font-semibold">Fotoğraflar</p>
      <p id="yeni-gorsel-ipucu" className="mt-1 text-xs text-muted">
        JPG, PNG veya WebP · dosya başına en çok {MAX_MB} MB · en çok {IMAGE_LIMITS.maxCount} fotoğraf. İlk fotoğraf ana
        görsel olur. Fotoğraflar ürün kaydedilince yüklenir; sonra sırasını düzenleme sayfasından değiştirebilirsiniz.
      </p>
      {/* Tarayıcının kendi kutusu gizli ("Dosya seçilmedi" yazısı seçim listede dururken yanıltıcıydı); etiket düğme gibi
          görünür, klavye odağı gizli kutudadır ve çerçevesi etikette gösterilir. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <input
          id="yeni-gorsel-sec"
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          disabled={disabled || free <= 0}
          onChange={add}
          aria-describedby="yeni-gorsel-ipucu yeni-gorsel-sayi"
          className="peer sr-only"
        />
        <label
          htmlFor="yeni-gorsel-sec"
          className="inline-flex min-h-11 cursor-pointer items-center bg-espresso px-6 text-xs font-semibold tracking-widest text-paper uppercase transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-60 hover:bg-primary"
        >
          {files.length > 0 ? "Fotoğraf ekle" : "Fotoğraf seç"}
        </label>
        <span id="yeni-gorsel-sayi" className="text-sm text-muted">
          {files.length > 0 ? `${files.length} dosya seçildi` : "Henüz fotoğraf seçilmedi"}
        </span>
      </div>

      {files.length > 0 && (
        <ul aria-label="Seçilen fotoğraflar" className="mt-4 divide-y divide-line">
          {files.map((file, index) => {
            const problem = checkImageFile(file);
            const upload = uploads[index];
            return (
              <li key={`${file.name}-${file.size}-${index}`} className="flex items-center gap-3 py-2 text-sm">
                <div className="aspect-[4/5] w-12 shrink-0 overflow-hidden rounded bg-soft">
                  {!problem && <Thumb file={file} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-all">
                    {index === 0 && <span className="font-semibold">Ana görsel · </span>}
                    {file.name}
                  </p>
                  {problem && <p className="text-danger">{problem} Bu dosya yüklenmez.</p>}
                  {upload && (
                    <p className={upload.state === "error" ? "text-danger" : "text-muted"}>
                      {UPLOAD_STATE_TEXT[upload.state]}
                      {upload.message ? ` — ${upload.message}` : ""}
                    </p>
                  )}
                </div>
                {uploads.length === 0 && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(files.filter((_, i) => i !== index))}
                    className="inline-flex min-h-11 items-center px-2 text-xs tracking-widest text-muted uppercase underline transition hover:text-danger disabled:opacity-40"
                  >
                    Çıkar<span className="sr-only">: {file.name}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {free <= 0 && <p className="mt-2 text-xs text-muted">Sınıra ulaşıldı; başka fotoğraf eklemek için birini çıkarın.</p>}
    </div>
  );
}
