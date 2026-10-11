"use client";

import Image from "next/image";
import { useState, type PointerEvent, type ReactNode } from "react";
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

// Ürün sayfasının görsel alanı: büyük görsel + (birden çok görsel varsa) küçük görseller. Küçüğe basınca büyük görsel
// değişir. Tek görselli (ya da görselsiz) üründe eskisi gibi yalnız büyük görsel gösterilir. Büyük görsel fareyle yakınlaşır.
export function ProductGallery({ product }: { product: Product }) {
  const [index, setIndex] = useState(0);
  const total = product.images.length;

  if (total <= 1) {
    return (
      <Zoom>
        <ProductImage product={product} sizes={SIZES} className="rounded-xl" preload />
      </Zoom>
    );
  }

  return (
    <div>
      <Zoom>
        <ProductImage product={product} index={index} sizes={SIZES} className="rounded-xl" preload={index === 0} />
      </Zoom>
      <p className="sr-only" aria-live="polite">
        Görsel {index + 1} / {total} gösteriliyor
      </p>
      <ul className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
        {product.images.map((file, i) => (
          <li key={file}>
            <button
              type="button"
              onClick={() => setIndex(i)}
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
