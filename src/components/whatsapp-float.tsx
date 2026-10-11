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
      className={`group fixed right-3 z-30 h-12 items-center gap-0 rounded-full border border-gold-light/70 bg-espresso/90 px-3 sm:h-14 sm:px-4 text-gold-light shadow-xl shadow-black/40 backdrop-blur-md transition-all duration-300 hover:gap-2 hover:bg-bordo hover:text-paper sm:right-6 [&:focus-visible]:outline-gold-light ${
        // Telefonda alt gezinme çubuğunun üstünde durur; ürün sayfasında telefonda gizlidir (sayfanın kendi "WhatsApp ile sor"
        // düğmesi ve sabit satın alma şeridi var, üst üste binmesin).
        pathname.startsWith("/urun/")
          ? "hidden bottom-6 lg:flex"
          : "flex bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-6"
      }`}
    >
      <ChatIcon size={22} />
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
