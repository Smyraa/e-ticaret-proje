import type { Metadata } from "next";
import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { requireAdmin } from "@/lib/auth";
import { formatPrice, stockText } from "@/lib/format";
import { ensureBarcodes, getAllProducts } from "@/lib/products-admin";
import { removeSampleProducts } from "./actions";
import { DeleteButton } from "./delete-button";

export const metadata: Metadata = { title: "Ürünler · Yönetim · TAURA" };

const badgeClass = "ml-2 rounded-sm px-2 py-1 align-middle text-[10px] font-normal tracking-wider uppercase";
// Satır sonundaki bağlantılar: dar ekranda iki bağlantı yan yana sığsın diye yazı biraz küçük.
const actionLinkClass =
  "inline-flex min-h-11 items-center text-[11px] tracking-wider uppercase underline transition md:text-xs md:tracking-widest";

// Silme işleminden sonra adrese eklenen işaretlerden gösterilecek ileti (sayı doğrulanır, serbest metin yazılmaz).
function noticeFor(deleted: string | string[] | undefined, samples: string | string[] | undefined) {
  if (deleted === "1") return "Ürün silindi.";
  if (typeof samples === "string" && /^\d{1,4}$/.test(samples)) {
    return Number(samples) === 0 ? "Silinecek örnek ürün yoktu." : `${Number(samples)} örnek ürün silindi.`;
  }
  return null;
}

// Ürün listesi (taslaklar dahil). Ad ve "Düzenle" bağlantısı ürünü düzenleme sayfasına götürür.
export default async function AdminProductsPage({ searchParams }: PageProps<"/yonetim/urunler">) {
  await requireAdmin();
  const { silindi, ornekler } = await searchParams;
  await ensureBarcodes(); // barkodu olmayan eski ürünlere barkod verilir
  const products = await getAllProducts();
  const sampleCount = products.filter((product) => product.sample).length;
  const notice = noticeFor(silindi, ornekler);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h1 className="font-display text-4xl">Ürünler</h1>
          <p className="mt-3 text-sm text-muted">Toplam {products.length} ürün.</p>
        </div>
        <Link
          href="/yonetim/urunler/yeni"
          className="inline-flex min-h-11 items-center bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
        >
          Yeni ürün
        </Link>
      </div>

      {notice && (
        <p role="status" className="mt-6 rounded-md bg-paper p-4 text-sm">
          {notice}
        </p>
      )}

      {sampleCount > 0 && (
        <section aria-labelledby="ornek-baslik" className="mt-8 rounded-lg bg-paper p-5 shadow-sm">
          <h2 id="ornek-baslik" className="text-sm font-semibold">
            Örnek ürünler
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Listede {sampleCount} örnek (demo) ürün var. Gerçek ürünlerinizi ekledikten sonra, canlıya çıkmadan önce
            hepsini tek seferde silebilirsiniz. Gerçek ürünlere dokunulmaz.
          </p>
          <div className="mt-4">
            <DeleteButton
              action={removeSampleProducts}
              confirmText={`${sampleCount} örnek ürün ve görselleri silinsin mi? Gerçek ürünlere dokunulmaz, bu işlem geri alınamaz.`}
              label={`Örnek ürünleri sil (${sampleCount})`}
            />
          </div>
        </section>
      )}

      {products.length === 0 ? (
        <p className="mt-8 rounded-lg bg-paper p-6 text-sm text-muted">Henüz ürün yok.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-lg bg-paper shadow-sm">
          {products.map((product) => (
            <li key={product.slug} className="flex gap-4 p-4">
              {/* Süs görseli: ürün adı hemen yanında yazıyor, ekran okuyucu iki kez okumasın. */}
              <div aria-hidden="true" className="w-14 shrink-0 self-start">
                <ProductImage product={product} sizes="56px" className="rounded-md" badge={false} />
              </div>

              <div className="min-w-0 flex-1 md:flex md:items-center md:gap-4">
                <div className="min-w-0 md:flex-1">
                  <p className="text-sm font-semibold">
                    <Link href={`/yonetim/urunler/${product.slug}`} className="transition hover:text-primary hover:underline">
                      {product.name}
                    </Link>
                    {product.sample && <span className={`${badgeClass} bg-espresso text-paper`}>Örnek</span>}
                    {!product.published && <span className={`${badgeClass} border border-ink`}>Taslak</span>}
                  </p>
                  <p className="text-[11px] tracking-widest text-muted uppercase">
                    {product.material}
                    {product.barcode && <span className="tracking-normal normal-case"> · Barkod {product.barcode}</span>}
                  </p>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-0 md:mt-0 md:shrink-0">
                  <p className="font-display text-xl md:w-24 md:text-right">{formatPrice(product.price)}</p>
                  <p
                    className={`text-xs md:w-28 ${product.stock > 0 ? "text-muted" : "font-semibold text-danger"}`}
                  >
                    {stockText(product.stock)}
                  </p>
                  <Link
                    href={`/yonetim/urunler/${product.slug}`}
                    className={`${actionLinkClass} hover:text-primary`}
                  >
                    Düzenle
                    <span className="sr-only">: {product.name}</span>
                  </Link>
                  {product.published && (
                    <a
                      href={`/urun/${product.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${actionLinkClass} text-muted hover:text-primary`}
                    >
                      Sitede gör
                      <span className="sr-only">: {product.name} (yeni sekmede açılır)</span>
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
