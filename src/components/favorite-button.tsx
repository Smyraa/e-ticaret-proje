"use client";

import { toggleFavorite, useFavorites } from "@/lib/favorites";
import { HeartIcon } from "./heart-icon";

type Props = {
  slug: string;
  name: string; // ekran okuyucular için
  variant?: "icon" | "full"; // icon: kartın üstündeki kalp, full: ürün sayfasındaki yazılı düğme
  className?: string;
};

export function FavoriteButton({ slug, name, variant = "icon", className = "" }: Props) {
  const favorite = useFavorites().includes(slug);

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={() => toggleFavorite(slug)}
        className={`inline-flex min-h-11 items-center gap-2 border px-5 text-xs font-semibold tracking-widest uppercase transition ${
          favorite
            ? "border-primary text-primary"
            : "border-line hover:border-primary hover:text-primary"
        } ${className}`}
      >
        <HeartIcon filled={favorite} size={18} />
        {favorite ? "Favorilerden çıkar" : "Favorilere ekle"}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={`${favorite ? "Favorilerden çıkar" : "Favorilere ekle"}: ${name}`}
      onClick={() => toggleFavorite(slug)}
      className={`flex h-11 w-11 items-center justify-center rounded-full bg-paper/90 shadow-sm transition hover:text-primary ${
        favorite ? "text-primary" : "text-ink"
      } ${className}`}
    >
      <HeartIcon filled={favorite} />
    </button>
  );
}
