import Image from "next/image";
import { mediaUrl } from "@/lib/media";
import type { Product } from "@/lib/products";

type Props = {
  product: Product;
  sizes: string; // tarayıcıya, görselin ekranda ne kadar yer kaplayacağını söyler
  className?: string;
  priority?: boolean;
};

// Ürünün ana görseli (4:5). Görsel yoksa yer tutucu gösterilir; örnek ürünlerde "Örnek" etiketi çıkar.
export function ProductImage({ product, sizes, className = "", priority }: Props) {
  const file = product.images?.[0];

  return (
    <div
      className={`relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-sand to-soft ${className}`}
    >
      {file ? (
        <Image
          src={mediaUrl(file)}
          alt={product.name}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-muted">
          Fotoğraf yakında
        </span>
      )}
      {product.sample && (
        <span className="absolute top-3 left-3 rounded-sm bg-espresso px-2 py-1 text-[10px] tracking-wider text-paper uppercase">
          Örnek
        </span>
      )}
    </div>
  );
}
