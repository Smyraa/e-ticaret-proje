"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { mediaUrl } from "@/lib/media";
import type { Product } from "@/lib/products";
import { ProductImage } from "./product-image";

const SIZES = "(min-width: 768px) 50vw, 100vw";
const ZOOM = 2;

// Fareyle görselin üzerine gelince görsel 2 kat büyür ve imleci izler (tanelerin dokusu görünsün). Yalnız fareyle çalışır;
// dokunmatik ekranda görsel olduğu gibi kalır (sayfa kaydırması bozulmasın).
function Zoom({ children }: { children: ReactNode }) {
  const [origin, setOrigin] = useState<string | null>(null);
  const follow = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * 100;
    const y = ((event.clientY - box.top) / box.height) * 100;
    setOrigin(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  };
  return (
    <div
      className="relative cursor-zoom-in overflow-hidden rounded-xl"
      onPointerEnter={follow}
      onPointerMove={follow}
      onPointerLeave={() => setOrigin(null)}
    >
      <div
        className="transition-transform duration-200 ease-out"
        style={{ transform: origin ? `scale(${ZOOM})` : undefined, transformOrigin: origin ?? undefined }}
      >
        {children}
      </div>
    </div>
  );
}

// Ürün sayfasının görsel alanı. Birden çok görsel varsa büyük görsel yatay kaydırılır (telefonda parmakla, bilgisayarda küçük
// görsellere basarak ya da alana odaklanıp ok tuşlarıyla; CSS kaydırma yakalama ile her seferinde tam bir görsel), altta hangi
// görselde olunduğunu gösteren noktalar ve küçük görseller vardır. Tek görselli (ya da görselsiz) üründe yalnız büyük görsel.
// Büyük görsel fareyle yakınlaşır.
export function ProductGallery({ product }: { product: Product }) {
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const total = product.images.length;

  // Küçük görsele basınca o görsele kaydırılır; kaydırınca (parmakla da) hangi görselde olunduğu güncellenir.
  const show = (i: number) => {
    const box = scroller.current;
    if (box) box.scrollTo({ left: i * box.clientWidth, behavior: "smooth" });
    setIndex(i);
  };
  const onScroll = () => {
    const box = scroller.current;
    if (!box || box.clientWidth === 0) return;
    const current = Math.round(box.scrollLeft / box.clientWidth);
    if (current !== index) setIndex(current);
  };

  if (total <= 1) {
    return (
      <Zoom>
        <ProductImage product={product} sizes={SIZES} className="rounded-xl" preload />
      </Zoom>
    );
  }

  return (
    <div>
      <div className="relative">
        <div
          ref={scroller}
          onScroll={onScroll}
          tabIndex={0}
          role="region"
          aria-label={`${product.name} görselleri (yatay kaydırılır)`}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {product.images.map((file, i) => (
            <div key={file} className="w-full shrink-0 snap-center">
              <Zoom>
                <ProductImage product={product} index={i} sizes={SIZES} className="rounded-xl" preload={i === 0} />
              </Zoom>
            </div>
          ))}
        </div>
        {/* Hangi görselde olunduğunu gösteren noktalar (süs; ekran okuyucuya aşağıdaki ileti söyler) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {product.images.map((file, i) => (
            <span
              key={file}
              className={`h-1.5 rounded-full shadow transition-all duration-300 ${i === index ? "w-5 bg-gold-light" : "w-1.5 bg-paper/80"}`}
            />
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        Görsel {index + 1} / {total} gösteriliyor
      </p>
      <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
        {product.images.map((file, i) => (
          <li key={file}>
            <button
              type="button"
              onClick={() => show(i)}
              aria-label={`Görsel ${i + 1} / ${total}`}
              aria-pressed={i === index}
              className={`relative block aspect-[4/5] w-full overflow-hidden rounded-md border-2 transition ${
                i === index ? "border-primary" : "border-transparent hover:border-line"
              }`}
            >
              <Image src={mediaUrl(file)} alt="" fill sizes="96px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
