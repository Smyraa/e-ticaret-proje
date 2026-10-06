"use client";

import { useEffect, useState, useTransition } from "react";
import { previewCoupon, type CouponPreview } from "@/app/(site)/sepet/actions";
import { setCoupon } from "@/lib/cart";

type Line = { slug: string; qty: number };

// Sepette kayıtlı kuponun güncel durumu: kod ya da sepet değişince sunucuda yeniden denetlenir (indirim yalnız sunucuda
// hesaplanır). null: kupon yok ya da henüz denetlenmedi.
export function useCouponPreview(code: string | undefined, lines: Line[]): CouponPreview | null {
  const [result, setResult] = useState<{ key: string; preview: CouponPreview } | null>(null);
  const key = code ? `${code}|${JSON.stringify(lines)}` : "";
  useEffect(() => {
    if (!code) return;
    let active = true;
    previewCoupon(code, lines)
      .then((preview) => {
        if (active) setResult({ key, preview });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
    // key, kod ve satırları birlikte temsil eder
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return code && result?.key === key ? result.preview : null;
}

// Sepetteki kupon kutusu: kod yazılıp "Uygula"; geçerliyse sepete kaydedilir. Uygulanmış kupon "Kaldır" ile çıkar.
export function CouponBox({ code, preview, lines }: { code?: string; preview: CouponPreview | null; lines: Line[] }) {
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function apply() {
    setMessage("");
    startTransition(async () => {
      const result = await previewCoupon(input, lines);
      if (result.ok) {
        setCoupon(result.code);
        setInput("");
      } else setMessage(result.message);
    });
  }

  if (code) {
    return (
      <div className="mt-6 border-t border-line pt-6 text-sm">
        <p className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Kupon: <span className="font-semibold tracking-wider">{code}</span>
            {preview?.ok && <span className="text-muted"> · {preview.label}</span>}
          </span>
          <button
            type="button"
            onClick={() => setCoupon(null)}
            className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase underline transition hover:text-primary"
          >
            Kaldır<span className="sr-only">: {code} kuponu</span>
          </button>
        </p>
        {preview && !preview.ok && (
          <p role="alert" className="mt-1 font-semibold text-danger">
            {preview.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 border-t border-line pt-6">
      <label htmlFor="kupon-kodu" className="text-sm">
        Kupon kodu
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="kupon-kodu"
          value={input}
          onChange={(event) => setInput(event.target.value.toLocaleUpperCase("tr").replace(/\s/g, "").slice(0, 20))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && input) {
              event.preventDefault();
              apply();
            }
          }}
          maxLength={20}
          autoComplete="off"
          aria-describedby={message ? "kupon-iletisi" : undefined}
          aria-invalid={message ? true : undefined}
          className={`min-w-0 flex-1 rounded-md border bg-paper p-3 text-sm tracking-wider uppercase ${message ? "border-danger" : "border-field"}`}
        />
        <button
          type="button"
          onClick={apply}
          disabled={pending || input.length < 3}
          className="min-h-11 shrink-0 border border-espresso px-5 text-xs font-semibold tracking-widest uppercase transition hover:border-primary hover:text-primary disabled:opacity-50"
        >
          {pending ? "…" : "Uygula"}
        </button>
      </div>
      <p id="kupon-iletisi" role="status" className={`mt-1 min-h-5 text-sm ${message ? "font-semibold text-danger" : ""}`}>
        {message}
      </p>
    </div>
  );
}
