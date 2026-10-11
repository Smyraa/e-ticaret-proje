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
  // dark: ana sayfanın halı zemini üzerinde. Beyaz kart koyu zeminde keskin bir çerçeve gibi duruyordu (kullanıcı); orada
  // kart saydam buğulu camdır, yazılar açık renk. light: krem panelli sayfalarda yarı saydam açık krem kart (bembeyaz sert duruyordu).
  tone?: "light" | "dark";
};

// Ürün listelerindeki kart: tıklayınca ürün sayfasına gider. Bağlantı ürün adındadır ama kartın tamamını kaplar
// (after: katmanı); kalp ve "Sepete ekle" düğmeleri bağlantının içinde değil, üstünde durur (düğme bağlantıya konmaz).
// Üzerine gelince kart hafifçe yükselir ve "Sepete ekle" belirir. Telefonda iki kart yan yana sığsın diye boşluklar ve yazılar
// küçülür.
export function ProductCard({ product, eager, tone = "light" }: Props) {
  const dark = tone === "dark";
  return (
    <div
      className={`group relative flex h-full flex-col rounded-xl p-2 transition sm:p-3 duration-300 motion-safe:hover:-translate-y-1 ${
        dark
          ? "bg-paper/10 text-paper ring-1 ring-gold-light/30 backdrop-blur-sm hover:bg-paper/15 hover:ring-gold-light/70"
          : "bg-paper/55 text-ink shadow-sm ring-1 ring-gold/25 [text-shadow:none] hover:bg-paper/80 hover:shadow-md"
      }`}
    >
      <div className="relative mb-3 sm:mb-4">
        <ProductImage
          product={product}
          sizes="(min-width: 1024px) 25vw, 50vw"
          className="rounded-lg"
          eager={eager}
        />
        <FavoriteButton slug={product.slug} name={product.name} className="absolute top-2 right-2 z-10" />
        <QuickAdd slug={product.slug} name={product.name} stock={product.stock} />
      </div>
      <p className={`text-[10px] tracking-wider uppercase sm:text-[11px] sm:tracking-widest ${dark ? "text-gold-light" : "text-muted"}`}>{product.material}</p>
      <h3 className="mt-1 text-sm leading-snug font-semibold sm:text-lg sm:leading-normal">
        <Link href={`/urun/${product.slug}`} className="after:absolute after:inset-0 after:rounded-xl">
          {product.name}
        </Link>
      </h3>
      <PriceTag price={product.price} oldPrice={product.oldPrice} tone={tone} className="mt-auto pt-3 sm:pt-4" />
      <p className={`text-[11px] sm:text-xs ${dark ? "text-paper/75" : "text-muted"}`}>{stockText(product.stock)}</p>
    </div>
  );
}
