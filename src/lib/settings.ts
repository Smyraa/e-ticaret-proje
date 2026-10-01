import { cache } from "react";
import { getDb } from "./mongodb";

export type SiteSettings = {
  heroImage?: string; // ana sayfa görselinin dosya adı (media/ klasöründe)
};

// Site ayarları tek belgede tutulur (koleksiyon "settings", _id "site"). Şimdilik yalnızca ana sayfa görseli var;
// ileride yönetim panelinden değiştirilecek.
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const db = await getDb();
  const settings = await db
    .collection<{ _id: string } & SiteSettings>("settings")
    .findOne({ _id: "site" }, { projection: { _id: 0 } });
  return settings ?? {};
});
