import Link from "next/link";
import { stockText } from "@/lib/format";
import type { Product } from "@/lib/products";
import { FavoriteButton } from "./favorite-button";
import { PriceTag } from "./price-tag";
import { ProductImage } from "./product-image";
import { QuickAdd } from "./quick-add";

type Props = {
  product: Product;
  eager?: boolean; // ekranın üstündeki kartlar: görseli tembel yüklenmez
};

// Ürün listelerindeki kart: tıklayınca ürün sayfasına gider. Bağlantı ürün adındadır ama kartın tamamını kaplar
// (after: katmanı); kalp ve "Sepete ekle" düğmeleri bağlantının içinde değil, üstünde durur (düğme bağlantıya konmaz).
// Üzerine gelince kart hafifçe yükselir ve "Sepete ekle" belirir.
export function ProductCard({ product, eager }: Props) {
  return (
    <div className="group relative flex h-full flex-col rounded-lg bg-paper p-4 text-ink shadow-sm transition duration-300 [text-shadow:none] hover:shadow-md motion-safe:hover:-translate-y-1">
      <div className="relative mb-4">
        <ProductImage
          product={product}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="rounded-md"
          eager={eager}
        />
        <FavoriteButton slug={product.slug} name={product.name} className="absolute top-2 right-2 z-10" />
        <QuickAdd slug={product.slug} name={product.name} stock={product.stock} />
      </div>
      <p className="text-[11px] tracking-widest text-muted uppercase">{product.material}</p>
      <h3 className="mt-1 text-lg font-semibold">
        <Link href={`/urun/${product.slug}`} className="after:absolute after:inset-0 after:rounded-lg">
          {product.name}
        </Link>
      </h3>
      <PriceTag price={product.price} oldPrice={product.oldPrice} className="mt-auto pt-4" />
      <p className="text-xs text-muted">{stockText(product.stock)}</p>
    </div>
  );
}
