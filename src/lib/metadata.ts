import type { Metadata } from "next";

export const SITE_NAME = "TAURA Tesbihçilik";

type Options = {
  noindex?: boolean; // sepet, ödeme gibi kişiye özel sayfalar canlıda da arama motorlarına kapalı kalır
};

// Sayfa başlığı ve açıklaması; paylaşım (Open Graph) bilgileri de aynı metinlerden üretilir.
export function pageMetadata(title: string, description: string, options: Options = {}): Metadata {
  const fullTitle = `${title} · ${SITE_NAME}`;
  return {
    title: fullTitle,
    description,
    openGraph: {
      title: fullTitle,
      description,
      siteName: SITE_NAME,
      locale: "tr_TR",
      type: "website",
    },
    ...(options.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
