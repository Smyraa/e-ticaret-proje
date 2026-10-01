"use client";

import { useReady } from "@/lib/use-ready";
import { questionMessage, usesPlaceholderNumber, whatsappLink } from "@/lib/whatsapp";

type Props = {
  slug: string;
  name: string;
};

// Ürün sayfasındaki "WhatsApp ile sor" bağlantısı: WhatsApp açılır, ürün adı ve bağlantısı hazır yazılı gelir.
export function WhatsAppButton({ slug, name }: Props) {
  const ready = useReady();
  // Ürün bağlantısı sayfanın o anki adresinden üretilir: canlıya çıkınca alan adı kendiliğinden doğru olur.
  // Sunucu adresi bilmez; tarayıcı hazır olunca bağlantı mesaja eklenir.
  const productUrl = ready ? `${window.location.origin}/urun/${slug}` : "";

  return (
    <div className="mt-2">
      <a
        href={whatsappLink(questionMessage(name, productUrl))}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-2 border border-line px-5 text-xs font-semibold tracking-widest uppercase transition hover:border-primary hover:text-primary"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4V16A1.5 1.5 0 0 1 4 14.5v-9Z" />
        </svg>
        WhatsApp ile sor
        <span className="sr-only"> (yeni sekmede açılır)</span>
      </a>

      {usesPlaceholderNumber && (
        <p className="mt-2 text-xs text-muted">
          Demo sürümünde WhatsApp numarası henüz tanımlı değil; WhatsApp numaranın geçersiz olduğunu
          söyleyebilir.
        </p>
      )}
    </div>
  );
}
