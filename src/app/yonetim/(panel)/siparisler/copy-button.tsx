"use client";

import { useState } from "react";

// Metni panoya kopyalar (sipariş sayfası bağlantısını müşteriye WhatsApp'tan göndermek için). Pano kullanılamazsa
// (güvenli olmayan bağlantı, izin yok) bağlantı yine ekranda seçilebilir durur ve kullanıcıya söylenir.
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [result, setResult] = useState<"done" | "failed" | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setResult("done");
    } catch {
      setResult("failed");
    }
    setTimeout(() => setResult(null), 3000);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="min-h-11 border border-espresso px-5 text-xs font-semibold tracking-widest uppercase transition hover:border-primary hover:text-primary"
      >
        {label}
      </button>
      <span role="status" className="text-sm">
        {result === "done" && "Kopyalandı."}
        {result === "failed" && "Kopyalanamadı; bağlantıyı elle seçip kopyalayın."}
      </span>
    </>
  );
}
