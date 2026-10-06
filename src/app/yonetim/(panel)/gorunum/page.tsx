import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { CATEGORY_MAX, CATEGORY_NAME_MAX, listCategories, SHOWCASE_MAX, SHOWCASES, showcaseSlugs, type ShowcaseKey } from "@/lib/catalog";
import { getAllProducts } from "@/lib/products-admin";
import { categoryAction, showcaseAction } from "./actions";

export const metadata: Metadata = { title: "Site Görünümü · Yönetim · TAURA" };

const small = "inline-flex min-h-11 items-center px-2 text-xs tracking-widest uppercase underline transition hover:text-primary disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40";
const control = "rounded-md border border-field bg-paper p-2.5 text-sm";
const solid = "min-h-11 bg-espresso px-5 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary";

// Site Görünümü: ana sayfadaki kategori düğmeleri ve vitrinler (Kampanyalar, En çok satanlar). Ana sayfa görseli Ayarlar'da.
export default async function AppearancePage({ searchParams }: PageProps<"/yonetim/gorunum">) {
  await requireAdmin();
  const { sonuc } = await searchParams;
  const [categories, products, showcases] = await Promise.all([
    listCategories(),
    getAllProducts(),
    Promise.all((Object.keys(SHOWCASES) as ShowcaseKey[]).map(async (key) => [key, await showcaseSlugs(key)] as const)),
  ]);
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const counts = new Map<string, number>();
  for (const product of products) if (product.category) counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
  const message = typeof sonuc === "string" && sonuc !== "tamam" ? sonuc : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="font-display text-4xl">Site Görünümü</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        Ana sayfadaki kategori düğmeleri ve ürün vitrinleri. Ana sayfa görseli{" "}
        <Link href="/yonetim/ayarlar" className="underline hover:text-primary">
          Ayarlar
        </Link>{" "}
        sayfasında.
      </p>
      {sonuc === "tamam" && (
        <p role="status" className="mt-4 rounded-md bg-paper p-3 text-sm shadow-sm">
          Değişiklik kaydedildi.
        </p>
      )}
      {message && (
        <p role="alert" className="mt-4 rounded-md bg-paper p-3 text-sm font-semibold text-danger shadow-sm">
          {message}
        </p>
      )}

      <section aria-labelledby="kategoriler-baslik" className="mt-10">
        <h2 id="kategoriler-baslik" tabIndex={-1} className="font-display text-2xl">
          Kategoriler
        </h2>
        <p className="mt-1 text-sm text-muted">
          Ana sayfada bu sırayla düğme olarak görünür; her biri kendi ürün sayfasını açar. Ürünlere kategori ürün formundan
          atanır. En çok {CATEGORY_MAX} kategori.
        </p>
        {categories.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-lg bg-paper shadow-sm">
            {categories.map((category, index) => (
              <li key={category.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3">
                <form action={categoryAction} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <input type="hidden" name="kategori" value={category.id} />
                  <label htmlFor={`kat-${category.id}`} className="sr-only">
                    Kategori adı
                  </label>
                  <input id={`kat-${category.id}`} name="ad" defaultValue={category.name} maxLength={CATEGORY_NAME_MAX} required className={`${control} min-w-0 flex-1`} />
                  <button type="submit" name="islem" value="adlandir" className={small}>
                    Adı kaydet<span className="sr-only">: {category.name}</span>
                  </button>
                </form>
                <span className="text-xs text-muted">
                  /kategori/{category.slug} · {counts.get(category.slug) ?? 0} ürün
                </span>
                <form action={categoryAction} className="flex items-center">
                  <input type="hidden" name="kategori" value={category.id} />
                  <button type="submit" name="islem" value="yukari" disabled={index === 0} className={small}>
                    Yukarı<span className="sr-only">: {category.name}</span>
                  </button>
                  <button type="submit" name="islem" value="asagi" disabled={index === categories.length - 1} className={small}>
                    Aşağı<span className="sr-only">: {category.name}</span>
                  </button>
                </form>
                <form action={categoryAction} className="flex items-center gap-1">
                  <input type="hidden" name="kategori" value={category.id} />
                  <input type="hidden" name="islem" value="sil" />
                  <label className="flex min-h-11 items-center gap-1 text-xs text-muted">
                    <input type="checkbox" name="onay" value="evet" className="accent-primary" />
                    onay
                  </label>
                  <button type="submit" className={`${small} text-danger`}>
                    Sil<span className="sr-only">: {category.name}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={categoryAction} className="mt-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="islem" value="ekle" />
          <div className="min-w-0 flex-1">
            <label htmlFor="yeni-kategori" className="text-sm">
              Yeni kategori
            </label>
            <input id="yeni-kategori" name="ad" maxLength={CATEGORY_NAME_MAX} required placeholder="Örn. Kehribar tesbihler" className={`${control} mt-1 w-full`} />
          </div>
          <button type="submit" className={solid}>
            Ekle
          </button>
        </form>
      </section>

      <section aria-labelledby="vitrinler-baslik" className="mt-12">
        <h2 id="vitrinler-baslik" tabIndex={-1} className="font-display text-2xl">
          Vitrinler
        </h2>
        <p className="mt-1 text-sm text-muted">
          Ana sayfada yatay kaydırmalı vitrin olarak görünür; “Tümünü gör” kendi sayfasını açar. Ürünleri ve sırasını siz
          seçersiniz (satışa göre otomatik sıralanmaz). Kampanyalar vitrini kuponlardan bağımsızdır. Vitrin başına en çok{" "}
          {SHOWCASE_MAX} ürün; taslak ürünler sitede görünmez.
        </p>
        {showcases.map(([key, slugs]) => {
          const available = products.filter((product) => !slugs.includes(product.slug));
          return (
            <div key={key} id={`vitrin-${key}`} className="mt-6 scroll-mt-6 rounded-lg bg-paper p-4 shadow-sm">
              <h3 className="font-display text-xl">
                {SHOWCASES[key].title}{" "}
                <a href={SHOWCASES[key].path} target="_blank" rel="noopener noreferrer" className="text-xs tracking-widest text-muted uppercase underline hover:text-primary">
                  sayfayı gör<span className="sr-only"> (yeni sekmede açılır)</span>
                </a>
              </h3>
              {slugs.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Bu vitrinde ürün yok; ana sayfada görünmez.</p>
              ) : (
                <ol className="mt-3 divide-y divide-line border-y border-line">
                  {slugs.map((slug, index) => {
                    const product = bySlug.get(slug);
                    return (
                      <li key={slug} className="flex flex-wrap items-center justify-between gap-2 py-2">
                        <span className="text-sm">
                          {index + 1}. {product?.name ?? `${slug} (ürün silinmiş)`}
                          {product && !product.published && <span className="ml-2 text-xs text-muted">(taslak: sitede görünmez)</span>}
                        </span>
                        <form action={showcaseAction} className="flex items-center">
                          <input type="hidden" name="vitrin" value={key} />
                          <input type="hidden" name="urun" value={slug} />
                          <button type="submit" name="islem" value="yukari" disabled={index === 0} className={small}>
                            Yukarı<span className="sr-only">: {product?.name ?? slug}</span>
                          </button>
                          <button type="submit" name="islem" value="asagi" disabled={index === slugs.length - 1} className={small}>
                            Aşağı<span className="sr-only">: {product?.name ?? slug}</span>
                          </button>
                          <button type="submit" name="islem" value="cikar" className={`${small} text-danger`}>
                            Çıkar<span className="sr-only">: {product?.name ?? slug}</span>
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ol>
              )}
              {available.length > 0 && slugs.length < SHOWCASE_MAX && (
                <form action={showcaseAction} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="vitrin" value={key} />
                  <input type="hidden" name="islem" value="ekle" />
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`ekle-${key}`} className="text-sm">
                      Ürün ekle
                    </label>
                    <select id={`ekle-${key}`} name="urun" required defaultValue="" className={`${control} mt-1 w-full`}>
                      <option value="" disabled>
                        Ürün seçin
                      </option>
                      {available.map((product) => (
                        <option key={product.slug} value={product.slug}>
                          {product.name}
                          {product.published ? "" : " (taslak)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className={solid}>
                    Ekle<span className="sr-only">: {SHOWCASES[key].title}</span>
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
