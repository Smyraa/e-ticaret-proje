import type { Metadata } from "next";
import Image from "next/image";
import { requireAdmin } from "@/lib/auth";
import { mediaUrl } from "@/lib/media";
import { readSettings } from "@/lib/settings";
import { settingsValues } from "@/lib/settings-form";
import { SettingsTabs } from "../settings-tabs";
import { DeleteButton } from "../urunler/delete-button";
import { removeHeroImage, saveSettings } from "./actions";
import { HeroUploader } from "./hero-uploader";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Site ayarları · Yönetim · TAURA" };

// İletişim bilgileri, kargo ücreti ve ana sayfa görseli. Her biri boş bırakılabilir; boş olan sitede gösterilmez.
export default async function SettingsPage({ searchParams }: PageProps<"/yonetim/ayarlar">) {
  await requireAdmin();
  const settings = await readSettings(); // veritabanı okunamazsa hata verir (boş formu kaydedip değerleri silmesin)
  const { gorsel } = await searchParams;

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="font-display text-4xl">Site ayarları</h1>
      <SettingsTabs current="site" />
      <p className="mt-6 max-w-2xl text-sm text-muted">
        Buradaki bilgiler sitede iletişim sayfasında, alt bilgide, ürün sayfasındaki WhatsApp düğmesinde ve sepet ile
        ödeme özetinde kullanılır. Boş bıraktığınız bilgi sitede görünmez.
      </p>

      <h2 className="mt-10 font-display text-2xl">İletişim</h2>
      <SettingsForm action={saveSettings} initial={settingsValues(settings)} />

      <section aria-labelledby="ana-gorsel-baslik" className="mt-12 border-t border-line pt-8">
        <h2 id="ana-gorsel-baslik" className="font-display text-2xl">
          Ana sayfa görseli
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Ana sayfanın en üstünde, başlığın yanında görünen fotoğraf. Henüz görsel yüklenmediyse orada “Fotoğraf yakında”
          yazar.
        </p>

        {gorsel === "kaldirildi" && (
          <p role="status" className="mt-4 rounded-md bg-paper p-4 text-sm">
            Ana sayfa görseli kaldırıldı.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-6">
          <div className="relative aspect-[4/5] w-40 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-sand to-soft">
            {settings.heroImage ? (
              <Image src={mediaUrl(settings.heroImage)} alt="" fill sizes="160px" className="object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-xs text-ink">
                Fotoğraf yakında
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 basis-60 space-y-6">
            <HeroUploader hasImage={Boolean(settings.heroImage)} />
            {settings.heroImage && (
              <DeleteButton
                action={removeHeroImage}
                confirmText="Ana sayfa görseli kaldırılsın mı? Yerine “Fotoğraf yakında” yazısı görünür."
                label="Görseli kaldır"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
