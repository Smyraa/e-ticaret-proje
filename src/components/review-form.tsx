"use client";

import { useActionState, useState } from "react";
import type { ReviewFormState } from "@/app/(site)/hesabim/actions";
import { StarIcon } from "./stars";

type Props = {
  action: (state: ReviewFormState, formData: FormData) => Promise<ReviewFormState>;
  rating: number | null; // düzenlenen yorumun puanı
  text: string;
  max: number;
  min: number;
};

const LABELS = ["", "Hiç beğenmedim", "Beğenmedim", "İdare eder", "Beğendim", "Çok beğendim"];

// Yorum formu: 1–5 yıldız (radyo düğmeleri; klavyeyle ok tuşlarıyla seçilir) ve metin. Doğrulama sunucuda yapılır.
export function ReviewForm({ action, rating, text, max, min }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [selected, setSelected] = useState(state?.rating ? Number(state.rating) : (rating ?? 0));
  const [length, setLength] = useState([...(state?.text ?? text)].length);

  return (
    <form action={formAction} className="space-y-6">
      <fieldset aria-describedby={state?.field === "puan" ? "yorum-hata" : undefined}>
        <legend className="text-sm">Puanınız</legend>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer rounded p-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary">
              <input
                type="radio"
                name="puan"
                value={n}
                checked={selected === n}
                onChange={() => setSelected(n)}
                className="sr-only"
                aria-label={`${n} yıldız: ${LABELS[n]}`}
              />
              <StarIcon fill={selected >= n ? 1 : 0} size={30} />
            </label>
          ))}
          <span className="ml-2 text-sm text-muted" aria-live="polite">
            {selected > 0 ? LABELS[selected] : "Seçilmedi"}
          </span>
        </div>
      </fieldset>

      <div>
        <label htmlFor="yorum-metin" className="text-sm">
          Yorumunuz
        </label>
        <textarea
          id="yorum-metin"
          name="metin"
          rows={6}
          required
          maxLength={max}
          defaultValue={state?.text ?? text}
          onChange={(event) => setLength([...event.currentTarget.value].length)}
          aria-invalid={state?.field === "metin" || undefined}
          aria-describedby={`yorum-sayac${state?.field === "metin" ? " yorum-hata" : ""}`}
          className={`mt-2 w-full resize-y rounded-md border bg-paper p-3 text-sm ${state?.field === "metin" ? "border-danger" : "border-field"}`}
        />
        <p id="yorum-sayac" className="mt-1 text-xs text-muted">
          {length} / {max} karakter (en az {min})
        </p>
      </div>

      {state?.error && (
        <p id="yorum-hata" role="alert" className="text-sm font-semibold text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60"
      >
        {pending ? "Gönderiliyor…" : "Yorumu gönder"}
      </button>
      <p className="text-xs text-muted">Yorumunuz yönetim onayından sonra ürün sayfasında görünür.</p>
    </form>
  );
}
