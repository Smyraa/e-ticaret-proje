import Link from "next/link";
import { formatPrice, stockText } from "@/lib/format";
import type { Product } from "@/lib/products";
import { ProductImage } from "./product-image";

// Ürün listelerindeki kart: tıklayınca ürün sayfasına gider.
export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/urun/${product.slug}`}
      className="flex h-full flex-col rounded-lg bg-paper p-4 shadow-sm transition hover:shadow-md"
    >
      <ProductImage
        product={product}
        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
        className="mb-4 rounded-md"
      />
      <p className="text-[11px] tracking-widest text-muted uppercase">
        {product.material}
      </p>
      <h3 className="mt-1 text-lg font-semibold">{product.name}</h3>
      <p className="mt-auto pt-4 font-display text-2xl">{formatPrice(product.price)}</p>
      <p className="text-xs text-muted">{stockText(product.stock)}</p>
    </Link>
  );
}
