"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";

type Props = {
  id: string; // başlık kimliği (bölüm buna bağlanır)
  title: string;
  href: string; // "Tümünü gör"
  accent?: boolean; // Kampanyalar: marka vurgusu
  children: ReactNode; // <li> öğeleri (ürün kartları)
};

// Yatay kaydırmalı ürün vitrini. Dokunmatikte parmakla, klavyede kaydırma alanına odaklanıp ok tuşlarıyla (tarayıcı kaydırır),
// geniş ekranda ayrıca "önceki/sonraki" düğmeleriyle kaydırılır. Kenardaki kartın yarım görünmesi kaydırılabileceğini belli eder.
export function ProductRail({ id, title, href, accent, children }: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const scroll = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({ left: direction * list.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section aria-labelledby={id} className="py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 id={id} className="font-display text-3xl">
            {accent && <span aria-hidden="true" className="mr-3 inline-block h-6 w-1 translate-y-0.5 rounded-full bg-bordo" />}
            {title}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scroll(-1)}
              aria-label={`${title}: önceki ürünler`}
              className="hidden h-11 w-11 items-center justify-center rounded-full border border-field transition hover:border-primary hover:text-primary md:inline-flex"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scroll(1)}
              aria-label={`${title}: sonraki ürünler`}
              className="hidden h-11 w-11 items-center justify-center rounded-full border border-field transition hover:border-primary hover:text-primary md:inline-flex"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <Link
              href={href}
              className="ml-2 inline-flex min-h-11 items-center text-xs font-semibold tracking-widest text-ink uppercase underline decoration-gold decoration-2 underline-offset-8 transition hover:text-primary"
            >
              Tümünü gör<span className="sr-only">: {title}</span>
            </Link>
          </div>
        </div>
        <ul
          ref={listRef}
          tabIndex={0}
          aria-label={`${title} (yatay kaydırılır)`}
          className="-mx-6 mt-6 flex snap-x snap-mandatory scroll-px-6 gap-5 overflow-x-auto scroll-smooth px-6 pb-4 [scrollbar-width:thin] focus-visible:outline-offset-[-2px]"
        >
          {children}
        </ul>
      </div>
    </section>
  );
}
