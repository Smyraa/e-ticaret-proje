"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowBubble, GoldOrnament } from "./gold-ornament";

type Props = {
  id: string; // başlık kimliği (bölüm buna bağlanır)
  title: string;
  href: string; // "Tümünü gör"
  accent?: boolean; // Kampanyalar: marka vurgusu
  children: ReactNode; // <li> öğeleri (ürün kartları)
};

// Yatay kaydırmalı ürün vitrini. Dokunmatikte parmakla, klavyede kaydırma alanına odaklanıp ok tuşlarıyla (tarayıcı kaydırır),
// geniş ekranda ayrıca ürünlerin iki yanındaki "önceki/sonraki" düğmeleriyle kaydırılır (başta/sonda olan taraf söner). Kenardaki kartın yarım görünmesi kaydırılabileceğini belli eder.
// Ana sayfanın halı zemini üzerinde saydam (koyu cam) bir panelde durur; yazılar açık renk.
export function ProductRail({ id, title, href, accent, children }: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const updateEdges = () => {
    const list = listRef.current;
    if (!list) return;
    setEdges({
      start: list.scrollLeft <= 4,
      end: list.scrollLeft + list.clientWidth >= list.scrollWidth - 4,
    });
  };
  // Ekran boyu değişince (ve ilk çizimde) uçlar yeniden hesaplanır: az ürün varsa iki düğme de söner.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(list);
    return () => observer.disconnect();
  }, []);
  const scroll = (direction: 1 | -1) => {
    const list = listRef.current;
    if (!list) return;
    list.scrollBy({
      left: direction * list.clientWidth * 0.8,
      behavior: "smooth",
    });
  };

  const arrowButton =
    "absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gold-light/70 bg-espresso/75 text-gold-light shadow-lg shadow-black/40 backdrop-blur-sm transition duration-300 hover:border-gold-light hover:bg-gold-light hover:text-espresso disabled:pointer-events-none disabled:opacity-0 sm:inline-flex";

  return (
    <section aria-labelledby={id} className="reveal pt-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl bg-espresso/40 p-5 text-paper shadow-lg shadow-black/30 ring-1 ring-gold-light/50 backdrop-blur-[3px] [text-shadow:0_1px_3px_rgb(0_0_0/0.85)] sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id={id} className="font-display text-3xl">
                {accent && (
                  <span
                    aria-hidden="true"
                    className="mr-3 inline-block h-6 w-1 translate-y-0.5 rounded-full bg-gold-light"
                  />
                )}
                {title}
              </h2>
              <GoldOrnament className="mt-2" />
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={href}
                className="group inline-flex min-h-11 items-center gap-3 text-xs font-semibold tracking-widest uppercase transition hover:text-gold-light"
              >
                Tümünü gör<span className="sr-only">: {title}</span>
                <ArrowBubble />
              </Link>
            </div>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => scroll(-1)}
              disabled={edges.start}
              aria-label={`${title}: önceki ürünler`}
              className={`${arrowButton} left-0 -translate-x-1/2`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <ul
              ref={listRef}
              onScroll={updateEdges}
              tabIndex={0}
              aria-label={`${title} (yatay kaydırılır)`}
              className="-mx-5 mt-6 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto scroll-smooth px-5 pt-2 pb-4 [scrollbar-color:#dcbd6a80_transparent] [scrollbar-width:thin] focus-visible:outline-offset-[-2px] sm:-mx-8 sm:scroll-px-8 sm:px-8"
            >
              {children}
            </ul>
            <button
              type="button"
              onClick={() => scroll(1)}
              disabled={edges.end}
              aria-label={`${title}: sonraki ürünler`}
              className={`${arrowButton} right-0 translate-x-1/2`}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
