import Link from "next/link";
import type { ReactNode } from "react";

// Ana sayfadaki güven şeridi: dört kısa söz, her biri ilgili sayfaya gider. Yazılar sitenin gerçekten yaptığını söyler
// (kart bilgisi ödeme kuruluşunda kalır, 14 gün cayma hakkı yasal, sipariş numarayla sorgulanır).
const items: { href: string; title: string; text: string; icon: ReactNode }[] = [
  {
    href: "/atolye",
    title: "El işçiliği",
    text: "Her tesbih atölyemizde özenle hazırlanır",
    icon: <path d="M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z" />,
  },
  {
    href: "/sss",
    title: "Güvenli ödeme",
    text: "Kart bilgileriniz bizde saklanmaz",
    icon: (
      <>
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
  },
  {
    href: "/kargo-ve-iade",
    title: "Kargo ve iade",
    text: "14 gün içinde cayma hakkı",
    icon: (
      <>
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
        <circle cx="7" cy="18" r="1.6" />
        <circle cx="17" cy="18" r="1.6" />
      </>
    ),
  },
  {
    href: "/siparis",
    title: "Sipariş takibi",
    text: "Numaranızla siparişinizi sorgulayın",
    icon: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-4.5-4.5" />
      </>
    ),
  },
];

export function TrustStrip() {
  return (
    <section aria-label="Neden TAURA" className="reveal pt-6 sm:pt-10">
      <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-2 px-3 sm:gap-3 sm:px-6 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.title}>
            <Link
              href={item.href}
              className="group flex h-full flex-col items-start gap-2 rounded-xl border border-gold-light/40 bg-espresso/60 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4 backdrop-blur-[3px] transition duration-300 [text-shadow:0_1px_3px_rgb(0_0_0/0.85)] hover:border-gold-light hover:bg-espresso/70 motion-safe:hover:-translate-y-1"
            >
              <span className="inline-flex h-10 w-10 shrink-0 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-gold-light/60 text-gold-light transition duration-300 group-hover:bg-gold-light/15">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {item.icon}
                </svg>
              </span>
              <span>
                <span className="block font-display text-base leading-tight sm:text-lg">{item.title}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-paper/80 sm:text-xs">{item.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
