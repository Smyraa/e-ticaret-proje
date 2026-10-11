"use client";

import { usePathname } from "next/navigation";
import { placeholderNumberNote, usesPlaceholder, whatsappLink } from "@/lib/whatsapp";
import { ChatIcon } from "./chat-icon";

// Her mağaza sayfasının sağ alt köşesindeki "WhatsApp'tan sor" düğmesi (numara Site ayarlarından; yoksa yer tutucu ve
// demo notu, ürün sayfasındaki düğmeyle aynı kural). Fareyle üzerine gelince yazısı açılır. Ödeme sayfasında gösterilmez
// (telefonda ödeme düğmesinin üstüne binmesin).
export function WhatsAppFloat({ whatsapp }: { whatsapp: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/odeme")) return null;
  const placeholder = usesPlaceholder(whatsapp);

  return (
    <a
      href={whatsappLink(whatsapp, "Merhaba, TAURA Tesbihçilik sitesinden yazıyorum.")}
      target="_blank"
      rel="noopener noreferrer"
      title={placeholder ? placeholderNumberNote : undefined}
      className="group fixed right-4 bottom-4 z-30 flex h-14 items-center gap-0 rounded-full border border-gold-light/70 bg-espresso/90 px-4 text-gold-light shadow-xl shadow-black/40 backdrop-blur-md transition-all duration-300 hover:gap-2 hover:bg-bordo hover:text-paper sm:right-6 sm:bottom-6 [&:focus-visible]:outline-gold-light"
    >
      <ChatIcon size={24} />
      <span className="max-w-0 overflow-hidden text-xs font-semibold tracking-widest whitespace-nowrap uppercase transition-all duration-300 group-hover:max-w-40 group-focus-visible:max-w-40">
        WhatsApp&apos;tan sor
      </span>
      <span className="sr-only">
        {" "}
        (yeni sekmede açılır){placeholder ? `. ${placeholderNumberNote}` : ""}
      </span>
    </a>
  );
}
