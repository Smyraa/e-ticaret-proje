// Favori listesinin okuyucusu. Hem tarayıcıda (favorites.ts) hem sunucuda (hesapta saklanan favoriler) kullanılır.

export const EMPTY_FAVORITES: string[] = [];

// Saklanan veri bozuk olabilir: yalnızca metinleri alır, tekrarları atar.
export function parseFavorites(raw: unknown): string[] {
  if (!Array.isArray(raw)) return EMPTY_FAVORITES;
  return [...new Set(raw.filter((item): item is string => typeof item === "string"))];
}
