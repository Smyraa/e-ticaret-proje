import type { Metadata } from "next";
import { EB_Garamond, Manrope } from "next/font/google";
import { SITE_NAME } from "@/lib/metadata";
import { indexingAllowed, siteUrl } from "@/lib/site";
import "./globals.css";

const display = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin", "latin-ext"],
});

const body = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});

const description = "TAURA Tesbihçilik tesbih koleksiyonu. Demo sürümü: ürünler ve fiyatlar örnek içeriktir.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: SITE_NAME,
  description,
  openGraph: { title: SITE_NAME, description, siteName: SITE_NAME, locale: "tr_TR", type: "website" },
  // Demo sürümü arama motorlarına kapalıdır; canlıya çıkarken SITE_INDEXING=on yapılır (src/lib/site.ts).
  robots: indexingAllowed ? { index: true, follow: true } : { index: false, follow: false },
};

// Ana düzen yalnızca sayfa kabuğunu (html, yazı tipleri, renkler) kurar. Mağaza çerçevesi (üst menü, alt bilgi)
// "(site)" grubunun düzeninde, yönetim çerçevesi "yonetim" klasöründe.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper font-body text-ink">{children}</body>
    </html>
  );
}
