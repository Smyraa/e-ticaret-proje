"use client";

import Image from "next/image";
import { useState } from "react";
import { mediaUrl } from "@/lib/media";
import type { Product } from "@/lib/products";
import { ProductImage } from "./product-image";

const SIZES = "(min-width: 768px) 50vw, 100vw";

// Ürün sayfasının görsel alanı: büyük görsel + (birden çok görsel varsa) küçük görseller. Küçüğe basınca büyük görsel
// değişir. Tek görselli (ya da görselsiz) üründe eskisi gibi yalnız büyük görsel gösterilir.
export function ProductGallery({ product }: { product: Product }) {
  const [index, setIndex] = useState(0);
  const total = product.images.length;

  if (total <= 1) {
    return <ProductImage product={product} sizes={SIZES} className="rounded-xl" preload />;
  }

  return (
    <div>
      <ProductImage product={product} index={index} sizes={SIZES} className="rounded-xl" preload={index === 0} />
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
