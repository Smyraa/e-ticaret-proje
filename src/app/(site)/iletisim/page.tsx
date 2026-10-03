import type { ReactNode } from "react";
import { ChatIcon } from "@/components/chat-icon";
import { StaticPage } from "@/components/static-page";
import { pageMetadata } from "@/lib/metadata";
import { formatPhone } from "@/lib/phone";
import { getSiteSettings } from "@/lib/settings";
import { placeholderNumberNote, usesPlaceholder, whatsappLink } from "@/lib/whatsapp";

export const metadata = pageMetadata(
  "İletişim",
  "TAURA Tesbihçilik ile iletişim yolları (örnek içerik).",
);

const linkClass = "underline transition hover:text-primary";

// İletişim bilgileri yönetim panelindeki Site ayarlarından gelir; boş bırakılanlar hiç gösterilmez.
export default async function ContactPage() {
  const { whatsapp, phone, email, address, hours } = await getSiteSettings();

  const details: { label: string; content: ReactNode }[] = [];
  if (phone) {
    details.push({
      label: "Telefon",
      content: (
        <a href={`tel:+${phone}`} className={linkClass}>
          {formatPhone(phone)}
        </a>
      ),
    });
  }
  if (email) {
    details.push({
      label: "E-posta",
      content: (
        <a href={`mailto:${email}`} className={`${linkClass} break-all`}>
          {email}
        </a>
      ),
    });
  }
  if (address) details.push({ label: "Adres", content: <span className="whitespace-pre-line">{address}</span> });
  if (hours) details.push({ label: "Çalışma saatleri", content: hours });

  return (
    <StaticPage title="İletişim">
      <p>
        Sorularınız için aşağıdaki yollarla bize ulaşabilirsiniz.
        {details.length === 0 && " Diğer iletişim bilgileri henüz belirlenmedi; belirlendiğinde bu sayfada yazılacak."}
      </p>

      <div>
        <a
          href={whatsappLink(whatsapp, "Merhaba, bilgi almak istiyorum.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 border border-line px-5 text-xs font-semibold tracking-widest text-ink uppercase transition hover:border-primary hover:text-primary"
        >
          <ChatIcon />
          WhatsApp ile yazın
          <span className="sr-only"> (yeni sekmede açılır)</span>
        </a>
        {usesPlaceholder(whatsapp) && <p className="mt-2 text-xs">{placeholderNumberNote}</p>}
      </div>

      {details.length > 0 && (
        <dl className="divide-y divide-line border-y border-line text-sm">
          {details.map(({ label, content }) => (
            <div key={label} className="flex justify-between gap-6 py-3">
              <dt>{label}</dt>
              <dd className="text-right text-ink">{content}</dd>
            </div>
          ))}
        </dl>
      )}
    </StaticPage>
  );
}
