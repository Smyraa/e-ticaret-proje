import { cache } from "react";
import { getDb } from "./mongodb";

export type SiteSettings = {
  heroImage?: string; // ana sayfa görselinin dosya adı (media/ klasöründe); yoksa "Fotoğraf yakında" görünür
  whatsapp: string; // ülke koduyla yalnız rakamlar (905551112233); boşsa düğme demo olarak görünür
  phone: string; // aynı biçim; boş olabilir
  email: string; // sitede gösterilen iletişim e-postası
  orderEmail: string; // yeni sipariş bildirimlerinin gideceği e-posta (sitede görünmez); boşsa iletişim e-postası kullanılır
  address: string; // çok satırlı olabilir
  hours: string; // çalışma saatleri
  shippingFee: number; // tam lira; 0 = ücretsiz
  lowStockThreshold: number; // stok bu sayıya ya da altına inince "düşük stok" sayılır (yönetimde; sitede görünmez)
};

// Herkese açık sayfalarda kullanılabilen ayarlar: sipariş bildirimi e-postası dışarı verilmez (türden de okunamaz).
export type PublicSettings = Omit<SiteSettings, "orderEmail" | "lowStockThreshold">;

export const DEFAULT_SETTINGS: SiteSettings = {
  whatsapp: "",
  phone: "",
  email: "",
  orderEmail: "",
  address: "",
  hours: "",
  shippingFee: 0, // kullanıcı kararı: şimdilik kargo ücretsiz
  lowStockThreshold: 2, // kullanıcı kararı (2026-10-07): ortak eşik, Ayarlar'dan değişir
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
  const low = doc?.lowStockThreshold;
  return {
    heroImage: text(doc?.heroImage) || undefined,
    whatsapp: text(doc?.whatsapp),
    phone: text(doc?.phone),
    email: text(doc?.email),
    orderEmail: text(doc?.orderEmail),
    address: text(doc?.address),
    hours: text(doc?.hours),
    shippingFee: typeof fee === "number" && Number.isInteger(fee) && fee >= 0 ? fee : DEFAULT_SETTINGS.shippingFee,
    lowStockThreshold:
      typeof low === "number" && Number.isInteger(low) && low >= 0 ? low : DEFAULT_SETTINGS.lowStockThreshold,
  };
}

function publicOf(settings: SiteSettings): PublicSettings {
  const { orderEmail, lowStockThreshold, ...open } = settings;
  void orderEmail; // sipariş bildirimi e-postası mağaza sayfalarına verilmez
  void lowStockThreshold; // yalnız yönetim kullanır
  return open;
}

// Mağaza sayfaları bunu kullanır: veritabanı okunamazsa sayfa yine açılır (varsayılan ayarlarla).
// cache(): aynı istek içinde (sayfa + alt bilgi) tekrar sorgulanmasın.
export const getSiteSettings = cache(async (): Promise<PublicSettings> => {
  try {
    return publicOf(await readSettings());
  } catch (error) {
    console.error("Site ayarları okunamadı", error);
    return publicOf(DEFAULT_SETTINGS);
  }
});
