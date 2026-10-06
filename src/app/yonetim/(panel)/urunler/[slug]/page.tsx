import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { listCategories } from "@/lib/catalog";
import { valuesOf } from "@/lib/product-form";
import { getProductForAdmin, listMaterials } from "@/lib/products-admin";
import { changeImage, removeProduct, saveProduct } from "../actions";
import { DeleteButton } from "../delete-button";
import { ProductForm } from "../edit-form";
import { ImageManager } from "../image-manager";

export const metadata: Metadata = { title: "Ürünü düzenle · Yönetim · TAURA" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/yonetim/urunler/[slug]">) {
  await requireAdmin();
  const { slug } = await params;
  const { eklendi, eklenemedi } = await searchParams;
  const failedImages = Number(eklenemedi) > 0 ? Math.min(Number(eklenemedi), 8) : 0;

  const product = await getProductForAdmin(slug);
  if (!product) notFound();
  const [materials, categories] = await Promise.all([listMaterials(), listCategories()]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href="/yonetim/urunler"
        className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase transition hover:text-primary"
      >
        ← Ürünlere dön
      </Link>
      <h1 className="mt-4 font-display text-4xl">Ürünü düzenle</h1>
      <p className="mt-3 text-sm text-muted">{product.name}</p>
      <p className="mt-1 text-sm text-muted">
        Adres: <span className="text-ink">/urun/{product.slug}</span>
        {" · "}
        {product.published ? (
          <a
            href={`/urun/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition hover:text-primary"
          >
            Sitede gör
            <span className="sr-only"> (yeni sekmede açılır)</span>
          </a>
        ) : (
          "Taslak (sitede görünmez)"
        )}
      </p>

      {eklendi && (
        <p role="status" className="mt-6 rounded-md bg-paper p-4 text-sm">
          {product.images.length > 0
            ? `Ürün ve ${product.images.length} fotoğrafı eklendi.`
            : "Ürün eklendi. Fotoğrafları aşağıdaki “Görseller” bölümünden ekleyebilirsiniz."}
          {!product.published && " Ürün taslak olarak duruyor; hazır olunca “Yayında” kutusunu işaretleyip kaydedin."}
        </p>
      )}
      {eklendi && failedImages > 0 && (
        <p role="alert" className="mt-3 rounded-md bg-paper p-4 text-sm font-semibold text-danger">
          Seçtiğiniz fotoğraflardan {failedImages} tanesi eklenemedi. Aşağıdaki “Görseller” bölümünden yeniden
          ekleyebilirsiniz.
        </p>
      )}

      <ImageManager slug={product.slug} images={product.images} action={changeImage.bind(null, product.slug)} />

      <h2 className="mt-12 font-display text-2xl">Ürün bilgileri</h2>
      <ProductForm
        action={saveProduct.bind(null, product.slug)}
        initial={valuesOf(product)}
        materials={materials}
        categories={categories}
        submitLabel="Kaydet"
        showSample={product.sample}
      />

      <section aria-labelledby="sil-baslik" className="mt-12 border-t border-line pt-8">
        <h2 id="sil-baslik" className="font-display text-2xl">
          Ürünü sil
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Silinen ürün ve görselleri geri getirilemez. Ürünü yalnızca bir süre gizlemek istiyorsanız silmeyin: “Ürün
          bilgileri” bölümündeki “Yayında” kutusunun işaretini kaldırıp kaydedin (taslak olur).
        </p>
        <div className="mt-4">
          <DeleteButton
            action={removeProduct.bind(null, product.slug)}
            confirmText={`“${product.name}” kalıcı olarak silinsin mi? Ürünün görselleri de silinir, bu işlem geri alınamaz.`}
            label="Ürünü sil"
          />
        </div>
      </section>
    </div>
  );
}
