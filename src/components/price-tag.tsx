import { discountPercent, formatPrice } from "@/lib/format";

type Props = {
  price: number;
  oldPrice: number | null;
  size?: "md" | "lg"; // md: ürün kartı, lg: ürün sayfası
  tone?: "light" | "dark"; // dark: koyu (halı) zemindeki saydam kart
  className?: string;
};

// Fiyat; indirimliyse yanında üstü çizili eski fiyat ve gold çerçeveli indirim yüzdesi.
export function PriceTag({ price, oldPrice, size = "md", tone = "light", className = "" }: Props) {
  const dark = tone === "dark";
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 ${className}`}>
      <span className={`font-display ${size === "lg" ? "text-3xl" : "text-2xl"} ${oldPrice ? (dark ? "text-gold-light" : "text-bordo") : ""}`}>
        {formatPrice(price)}
      </span>
      {oldPrice && (
        <>
          <s className={`text-sm ${dark ? "text-paper/70" : "text-muted"}`}>
            <span className="sr-only">Eski fiyat: </span>
            {formatPrice(oldPrice)}
          </s>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${
              dark ? "border-gold-light/70 bg-gold-light/10 text-gold-light" : "border-gold bg-gold/10 text-gold-deep"
            }`}
          >
            %{discountPercent(price, oldPrice)} indirim
          </span>
        </>
      )}
    </p>
  );
}
