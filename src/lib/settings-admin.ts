import "server-only";
import { deleteMediaFile } from "./media-files";
import { getDb } from "./mongodb";
import type { SettingsData } from "./settings-form";

// Site ayarlarını yazan işlevler. Yalnızca requireAdmin() geçmiş yerlerden (sunucu eylemi, yükleme yolu) çağrılmalı.

type SettingsDoc = { _id: string; heroImage?: string; updatedAt?: Date } & Partial<SettingsData>;

const settingsOf = async () => (await getDb()).collection<SettingsDoc>("settings");

// Ana sayfa görseli adı dışındaki ayarları yazar (ana sayfa görseli ayrı yönetilir; ona dokunulmaz).
export async function writeSettings(data: SettingsData): Promise<void> {
  const settings = await settingsOf();
  await settings.updateOne({ _id: "site" }, { $set: { ...data, updatedAt: new Date() } }, { upsert: true });
}

// Ana sayfa görseli olarak kullanılan dosya adı: hero-<8 hane>.jpg|webp (ürün görsellerinden ayrı tutulur).
const HERO_NAME = /^hero-[0-9a-f]{8}\.(jpg|webp)$/;

// Eski ana sayfa görselinin dosyası, başka hiçbir yerde kullanılmıyorsa diskten silinir.
async function dropIfUnused(name: string | undefined): Promise<void> {
  if (!name || !HERO_NAME.test(name)) return; // yalnız ana sayfa görseli adı biçimindekiler silinir
  const db = await getDb();
  const stillUsed =
    (await db.collection("products").countDocuments({ images: name }, { limit: 1 })) > 0 ||
    (await db.collection("settings").countDocuments({ heroImage: name }, { limit: 1 })) > 0;
  if (!stillUsed) await deleteMediaFile(name);
}

// Ana sayfa görselini değiştirir; eski dosya artık kullanılmıyorsa siler.
export async function replaceHeroImage(name: string): Promise<void> {
  const settings = await settingsOf();
  const before = await settings.findOneAndUpdate(
    { _id: "site" },
    { $set: { heroImage: name, updatedAt: new Date() } },
    { upsert: true, returnDocument: "before" },
  );
  if (before?.heroImage && before.heroImage !== name) await dropIfUnused(before.heroImage);
}

// Ana sayfa görselini kaldırır ("Fotoğraf yakında" yazısı görünür); dosyayı siler.
export async function clearHeroImage(): Promise<void> {
  const settings = await settingsOf();
  const before = await settings.findOneAndUpdate(
    { _id: "site" },
    { $unset: { heroImage: "" }, $set: { updatedAt: new Date() } },
    { returnDocument: "before" },
  );
  await dropIfUnused(before?.heroImage);
}
