import Image from "next/image";
import { mediaUrl } from "@/lib/media";
import type { Product } from "@/lib/products";

type Props = {
  product: Product;
  index?: number; // hangi görsel (varsayılan 0 = ana görsel)
  sizes: string; // tarayıcıya, görselin ekranda ne kadar yer kaplayacağını söyler
  className?: string;
  preload?: boolean; // sayfanın en önemli (LCP) görseli için: önceden yüklenir
  eager?: boolean; // ekranın üstündeki görseller için: tembel yüklenmez
  badge?: boolean; // örnek ürünlerde "Örnek" etiketi (küçük önizlemelerde kapatılır)
};

// Ürünün ana görseli (4:5). Görsel yoksa yer tutucu gösterilir; örnek ürünlerde "Örnek" etiketi çıkar.
export function ProductImage({ product, index = 0, sizes, className = "", preload, eager, badge = true }: Props) {
  const file = product.images?.[index];

  return (
    <div
      className={`relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-sand to-soft ${className}`}
    >
      {file ? (
        <Image
          src={mediaUrl(file)}
          alt={index > 0 ? `${product.name} (görsel ${index + 1})` : product.name}
          fill
          sizes={sizes}
          preload={preload}
          loading={eager ? "eager" : undefined}
          className="object-cover"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-ink">
          Fotoğraf yakında
        </span>
      )}
      {badge && product.sample && (
        <span className="absolute top-3 left-3 rounded-sm bg-espresso px-2 py-1 text-[10px] tracking-wider text-paper uppercase">
          Örnek
        </span>
      )}
    </div>
  );
}
