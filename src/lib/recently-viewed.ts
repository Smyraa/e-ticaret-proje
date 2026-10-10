import { parseFavorites } from "./favorites-model";
import { createLocalStore } from "./local-store";

// Son bakılan ürünler: ürün adreslerinin (slug) listesi, en yenisi başta, en çok 12. Yalnız bu tarayıcıda tutulur
// (hesapla eşitlenmez, sunucuya kaydedilmez). Ürün sayfası açılınca güncellenir.
export const RECENT_MAX = 12;
export const recentStore = createLocalStore("taura-son-bakilan", [] as string[], (raw) =>
  parseFavorites(raw).slice(0, RECENT_MAX),
);
