import { createLocalStore } from "./local-store";

// Favoriler: ürün adreslerinin (slug) listesi, eklenme sırasıyla. Giriş gerekmez, başka cihaza taşınmaz.
// Kartlardaki kalpler, üst menüdeki sayı ve favoriler sayfası aynı listeyi paylaşır.
const EMPTY: string[] = [];

// Saklanan veri bozuk olabilir: yalnızca metinleri alır, tekrarları atar.
function parseFavorites(raw: unknown): string[] {
  if (!Array.isArray(raw)) return EMPTY;
  return [...new Set(raw.filter((item): item is string => typeof item === "string"))];
}

const store = createLocalStore("taura-favorites", EMPTY, parseFavorites);

export const useFavorites = store.useStore;

export function toggleFavorite(slug: string) {
  const current = store.get();
  store.set(current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
}
