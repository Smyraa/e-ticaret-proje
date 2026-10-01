import type { Metadata } from "next";
import { ChatIcon } from "@/components/chat-icon";
import { StaticPage } from "@/components/static-page";
import { placeholderNumberNote, usesPlaceholderNumber, whatsappLink } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "İletişim · TAURA Tesbihçilik",
};

const details = [
  ["E-posta", "Henüz belirlenmedi"],
  ["Adres", "Henüz belirlenmedi"],
  ["Çalışma saatleri", "Henüz belirlenmedi"],
];

export default function ContactPage() {
  return (
    <StaticPage title="İletişim">
      <p>
        Sorularınız için aşağıdaki yollarla bize ulaşabilirsiniz. İletişim bilgileri henüz
        belirlenmedi; belirlendiğinde bu sayfada yazılacak.
      </p>

      <div>
        <a
          href={whatsappLink("Merhaba, bilgi almak istiyorum.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 border border-line px-5 text-xs font-semibold tracking-widest text-ink uppercase transition hover:border-primary hover:text-primary"
        >
          <ChatIcon />
          WhatsApp ile yazın
          <span className="sr-only"> (yeni sekmede açılır)</span>
        </a>
        {usesPlaceholderNumber && <p className="mt-2 text-xs">{placeholderNumberNote}</p>}
      </div>

      <dl className="divide-y divide-line border-y border-line text-sm">
        {details.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-6 py-3">
            <dt>{label}</dt>
            <dd className="text-right text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </StaticPage>
  );
}
