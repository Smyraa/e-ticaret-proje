import { notFound } from "next/navigation";
import { ProductFilterForm } from "@/components/product-filter-form";
import { ProductListPage } from "@/components/product-list-page";
import { getCategory, productsInCategory } from "@/lib/catalog";
import { pageMetadata } from "@/lib/metadata";
import { filterProducts, readFilterParams, type Product } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/kategori/[slug]">) {
  const { slug } = await params;
  const category = await getCategory(slug).catch(() => null);
  return pageMetadata(category?.name ?? "Kategori", category ? `${category.name}: TAURA Tesbihçilik koleksiyonu.` : "Kategori");
}

// Kategorinin ürün sayfası (ana sayfadaki kategori düğmeleri buraya götürür).
export default async function CategoryPage({ params, searchParams }: PageProps<"/kategori/[slug]">) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound();
  const category = await getCategory(slug).catch(() => null);
  if (!category) notFound();
  let products: Product[] = [];
  let failed = false;
  try {
    products = await productsInCategory(category.slug);
  } catch (error) {
    console.error("Kategori ürünleri okunamadı", error);
    failed = true;
  }
  // Süzme: sıralama, fiyat aralığı, yalnız indirimdekiler (kategoride arama ve malzeme seçimi yok).
  const { values, filter, active } = readFilterParams(await searchParams);
  const path = `/kategori/${category.slug}`;
  return (
    <ProductListPage
      title={category.name}
      products={filterProducts(products, { ...filter, q: "", material: "" })}
      failed={failed}
      empty="Bu kategoride henüz ürün yok."
      filters={products.length > 0 && <ProductFilterForm action={path} values={values} />}
      clearHref={active ? path : undefined}
    />
  );
}
