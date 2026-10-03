import { cache } from "react";
import { getDb } from "./mongodb";

export type SiteSettings = {
  heroImage?: string; // ana sayfa görselinin dosya adı (media/ klasöründe); yoksa "Fotoğraf yakında" görünür
  whatsapp: string; // ülke koduyla yalnız rakamlar (905551112233); boşsa düğme demo olarak görünür
  phone: string; // aynı biçim; boş olabilir
  email: string;
  address: string; // çok satırlı olabilir
  hours: string; // çalışma saatleri
  shippingFee: number; // tam lira; 0 = ücretsiz
};

export const DEFAULT_SETTINGS: SiteSettings = {
  whatsapp: "",
  phone: "",
  email: "",
  address: "",
  hours: "",
  shippingFee: 0, // kullanıcı kararı: şimdilik kargo ücretsiz
};

type SettingsDoc = Partial<Record<keyof SiteSettings, unknown>>;

const text = (value: unknown) => (typeof value === "string" ? value : "");

// Site ayarları tek belgede tutulur (koleksiyon "settings", _id "site"). Eksik ya da bozuk alanlar varsayılana döner.
// Yönetim sayfası bunu kullanır: veritabanına ulaşılamazsa hata verir (boş formu kaydedip gerçek değerlerin üstüne
// yazmasın diye varsayılana düşmez).
export async function readSettings(): Promise<SiteSettings> {
  const db = await getDb();
  const doc = await db.collection<SettingsDoc & { _id: string }>("settings").findOne({ _id: "site" });
  const fee = doc?.shippingFee;
  return {
    heroImage: text(doc?.heroImage) || undefined,
    whatsapp: text(doc?.whatsapp),
    phone: text(doc?.phone),
    email: text(doc?.email),
    address: text(doc?.address),
    hours: text(doc?.hours),
    shippingFee: typeof fee === "number" && Number.isInteger(fee) && fee >= 0 ? fee : DEFAULT_SETTINGS.shippingFee,
  };
}

// Mağaza sayfaları bunu kullanır: veritabanı okunamazsa sayfa yine açılır (varsayılan ayarlarla).
// cache(): aynı istek içinde (sayfa + alt bilgi) tekrar sorgulanmasın.
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  try {
    return await readSettings();
  } catch (error) {
    console.error("Site ayarları okunamadı", error);
    return DEFAULT_SETTINGS;
  }
});
