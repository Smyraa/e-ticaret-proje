import type { Metadata } from "next";
import Link from "next/link";
import { EB_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const display = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin", "latin-ext"],
});

const body = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "TAURA Tesbihçilik",
  description: "TAURA Tesbihçilik örnek mağaza (demo sürümü).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper font-body text-ink">
        <div className="bg-espresso px-4 py-2 text-center text-xs tracking-widest text-paper uppercase">
          Demo sürümü · Ürünler ve fiyatlar örnek içeriktir
        </div>

        <header className="border-b border-line py-6 text-center">
          <Link href="/" className="inline-block">
            <p className="font-display text-3xl tracking-[0.22em]">TAURA</p>
            <p className="-mt-1 text-[11px] tracking-[0.38em] text-muted uppercase">
              Tesbihçilik
            </p>
          </Link>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-line py-8 text-center text-sm text-muted">
          TAURA Tesbihçilik · Demo sürümü. Bu sayfadaki tüm ürün ve fiyatlar örnek içeriktir.
        </footer>
      </body>
    </html>
  );
}
