"use client";

import { useReady } from "@/lib/use-ready";
import {
  placeholderNumberNote,
  questionMessage,
  usesPlaceholderNumber,
  whatsappLink,
} from "@/lib/whatsapp";
import { ChatIcon } from "./chat-icon";

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
        <ChatIcon />
        WhatsApp ile sor
        <span className="sr-only"> (yeni sekmede açılır)</span>
      </a>

      {usesPlaceholderNumber && <p className="mt-2 text-xs text-muted">{placeholderNumberNote}</p>}
    </div>
  );
}
