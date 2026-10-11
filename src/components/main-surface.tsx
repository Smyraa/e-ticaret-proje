"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Halı zemini her mağaza sayfasının arkasındadır. Ana sayfa kendi saydam panellerini çizer; diğer sayfaların içeriği
// (formlar, sepet, ödeme, metinler) okunaklı kalsın diye krem zeminli (hafif saydam), gold çerçeveli tek bir panelde durur.
// Geniş ekranda panel büyük olduğundan daha saydam ve daha az bulanık (yoksa halı hiç seçilmiyordu).
export function MainSurface({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") return children;
  return (
    <div className="px-2 py-4 sm:px-6 sm:py-10">
      {/* overflow-clip: köşeler yuvarlak kalır ama yapışkan (sticky) öğeler çalışmaya devam eder */}
      <div className="mx-auto max-w-6xl overflow-clip rounded-2xl bg-cream/80 text-ink backdrop-blur-md lg:bg-cream/75 lg:backdrop-blur-[6px] shadow-2xl shadow-black/50 ring-1 ring-gold/70">
        {children}
      </div>
    </div>
  );
}
