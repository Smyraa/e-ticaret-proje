"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { checkImageFile } from "@/lib/images";
import type { ProductFormState, ProductFormValues } from "@/lib/product-form";
import { Check, Field } from "../form-fields";
import { NewImagePicker } from "./new-image-picker";
import { uploadImages, type Upload } from "./upload-images";

type Props = {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  initial: ProductFormValues; // boş form ya da var olan ürünün değerleri
  materials: string[]; // kayıtlı malzemeler: yazarken öneri olarak çıkar
  submitLabel: string;
  showSample?: boolean; // yalnız örnek ürünlerde: "Örnek ürün" işaretini kaldırma kutusu
  pickImages?: boolean; // yeni ürün formunda: fotoğraf seçici (ürün kaydedilince yüklenir)
};

// Ürün ekleme ve düzenleme formu (ikisinde de aynı). Doğrulama sunucuda yapılır; hata varsa yazılanlar korunur,
// ilk hatalı kutuya odaklanılır.
export function ProductForm({ action, initial, materials, submitLabel, showSample, pickImages }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, undefined);
  const [files, setFiles] = useState<File[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const started = useRef<string | null>(null);
  const uploadable = files.filter((file) => !checkImageFile(file));
  const uploading = Boolean(state?.created);
  const formRef = useRef<HTMLFormElement>(null);
  // Kaydedildi iletisi, kaydın ardından forma yeniden dokunulana kadar görünür.
  const [editedAfter, setEditedAfter] = useState<ProductFormState>(undefined);

  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const hasErrors = Object.keys(errors).length > 0;
  const savedVisible = state?.saved === true && editedAfter !== state;

  useEffect(() => {
    if (state?.errors) formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);

  // Ürün kaydedildi: seçilen (uygun) fotoğraflar sırayla yüklenir, sonra düzenleme sayfasına geçilir. Yüklenemeyen
  // fotoğraf olursa ürün yine kayıtlıdır; düzenleme sayfası kaç tanesinin eklenemediğini söyler.
  useEffect(() => {
    const slug = state?.created;
    if (!slug || started.current === slug) return;
    started.current = slug;
    void (async () => {
      const { failed } = await uploadImages(slug, uploadable, uploadable.length, setUploads);
      const skipped = files.length - uploadable.length;
      router.push(`/yonetim/urunler/${slug}?eklendi=1${failed + skipped > 0 ? `&eklenemedi=${failed + skipped}` : ""}`);
    })();
  }, [state, files, uploadable, router]);

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      onChange={() => setEditedAfter(state)}
      className="mt-8 space-y-6"
    >
      {pickImages && <input type="hidden" name="gorsel-sayisi" value={uploadable.length} />}

      <Field prefix="urun" name="name" label="Ürün adı" required value={values.name} error={errors.name} />

      <div>
        <Field
          prefix="urun"
          name="material"
          label="Malzeme"
          required
          list="urun-malzemeler"
          value={values.material}
          error={errors.material}
          hint="Örn. Damla kehribar. Yazarken kayıtlı malzemeler önerilir; yenisini de yazabilirsiniz."
        />
        <datalist id="urun-malzemeler">
          {materials.map((material) => (
            <option key={material} value={material} />
          ))}
        </datalist>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          prefix="urun"
          name="size"
          label="Ölçü"
          value={values.size}
          error={errors.size}
          hint="Örn. 8 mm tane · 33 tane"
        />
        <Field
          prefix="urun"
          name="weight"
          label="Ağırlık"
          value={values.weight}
          error={errors.weight}
          hint="Örn. 42 g"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          prefix="urun"
          name="price"
          label="Fiyat (TL)"
          required
          inputMode="numeric"
          value={values.price}
          error={errors.price}
          hint="Tam lira, kuruşsuz. Örn. 3500"
        />
        <Field
          prefix="urun"
          name="stock"
          label="Stok (adet)"
          required
          inputMode="numeric"
          value={values.stock}
          error={errors.stock}
          hint="Stokta kaç tane var? Yoksa 0 yazın."
        />
      </div>

      <Field
        prefix="urun"
        name="craft"
        label="İşçilik"
        value={values.craft}
        error={errors.craft}
        hint="Kısa tutun; ürün sayfasında “İşçilik” satırında görünür."
      />

      <Field
        prefix="urun"
        name="story"
        label="Hikâye"
        multiline
        value={values.story}
        error={errors.story}
        hint="Ürünü anlatan birkaç cümle. Boş satır bırakarak paragraf ayırabilirsiniz."
      />

      <Check
        prefix="urun"
        name="published"
        label="Yayında (sitede görünsün)"
        hint="İşaretli değilse ürün taslak olarak kalır ve sitede görünmez."
        checked={values.published}
      />

      {showSample && (
        <Check
          prefix="urun"
          name="sample"
          label="Örnek ürün"
          hint="Demo içeriğidir; sitede “Örnek” etiketiyle görünür. Gerçek bir ürüne çevirmek için işareti kaldırın."
          checked={values.sample}
        />
      )}

      {pickImages && (
        <NewImagePicker
          files={files}
          onChange={setFiles}
          uploads={uploads.length > 0 ? mapUploads(files, uploads) : []}
          disabled={pending || uploading}
        />
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
        <button
          type="submit"
          disabled={pending || uploading}
          className="min-h-11 bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60"
        >
          {uploading ? "Fotoğraflar yükleniyor…" : pending ? "Kaydediliyor…" : submitLabel}
        </button>
        <Link
          href="/yonetim/urunler"
          className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase underline transition hover:text-primary"
        >
          Ürünlere dön
        </Link>
      </div>

      <p role="status" className="min-h-6 text-sm">
        {savedVisible ? "Değişiklikler kaydedildi." : ""}
      </p>
      {hasErrors && (
        <p role="alert" className="text-sm font-semibold text-danger">
          Formda düzeltilmesi gereken alanlar var. İlk hatalı alana gidildi.
        </p>
      )}
      {state?.message && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}

// Yükleme listesi yalnız uygun dosyaları içerir; seçici ise tüm seçilen dosyaları gösterir. Uygun olmayan dosyaların
// satırında yükleme durumu yoktur (zaten "yüklenmez" yazar).
function mapUploads(files: File[], uploads: Upload[]): Upload[] {
  let next = 0;
  return files.map((file) => (checkImageFile(file) ? { name: file.name, state: "error" as const } : uploads[next++]));
}
