import { EMPTY_FAVORITES, parseFavorites } from "./favorites-model";
import { createLocalStore } from "./local-store";

// Favoriler: ürün adreslerinin (slug) listesi, eklenme sırasıyla. Giriş gerekmez; giriş yapılınca hesapla eşitlenir.
// Kartlardaki kalpler, üst menüdeki sayı ve favoriler sayfası aynı listeyi paylaşır.
const store = createLocalStore("taura-favorites", EMPTY_FAVORITES, parseFavorites);

export const useFavorites = store.useStore;
export const favoritesStore = store; // hesap eşitlemesi için (account-sync.tsx)

export function toggleFavorite(slug: string) {
  const current = store.get();
  store.set(current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
}
