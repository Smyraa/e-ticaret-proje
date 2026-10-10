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
  // kart saydam buğulu camdır, yazılar açık renk. light: krem panelli sayfalarda düz krem kart.
  tone?: "light" | "dark";
};

// Ürün listelerindeki kart: tıklayınca ürün sayfasına gider. Bağlantı ürün adındadır ama kartın tamamını kaplar
// (after: katmanı); kalp ve "Sepete ekle" düğmeleri bağlantının içinde değil, üstünde durur (düğme bağlantıya konmaz).
// Üzerine gelince kart hafifçe yükselir ve "Sepete ekle" belirir.
export function ProductCard({ product, eager, tone = "light" }: Props) {
  const dark = tone === "dark";
  return (
    <div
      className={`group relative flex h-full flex-col rounded-xl p-3 transition duration-300 motion-safe:hover:-translate-y-1 ${
        dark
          ? "bg-paper/10 text-paper ring-1 ring-gold-light/30 backdrop-blur-sm hover:bg-paper/15 hover:ring-gold-light/70"
          : "bg-paper text-ink shadow-sm [text-shadow:none] hover:shadow-md"
      }`}
    >
      <div className="relative mb-4">
        <ProductImage
          product={product}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="rounded-lg"
          eager={eager}
        />
        <FavoriteButton slug={product.slug} name={product.name} className="absolute top-2 right-2 z-10" />
        <QuickAdd slug={product.slug} name={product.name} stock={product.stock} />
      </div>
      <p className={`text-[11px] tracking-widest uppercase ${dark ? "text-gold-light" : "text-muted"}`}>{product.material}</p>
      <h3 className="mt-1 text-lg font-semibold">
        <Link href={`/urun/${product.slug}`} className="after:absolute after:inset-0 after:rounded-xl">
          {product.name}
        </Link>
      </h3>
      <PriceTag price={product.price} oldPrice={product.oldPrice} tone={tone} className="mt-auto pt-4" />
      <p className={`text-xs ${dark ? "text-paper/75" : "text-muted"}`}>{stockText(product.stock)}</p>
    </div>
  );
}
