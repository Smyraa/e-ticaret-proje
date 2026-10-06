import { notFound } from "next/navigation";
import { ProductListPage } from "@/components/product-list-page";
import { getCategory, productsInCategory } from "@/lib/catalog";
import { pageMetadata } from "@/lib/metadata";
import type { Product } from "@/lib/products";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/kategori/[slug]">) {
  const { slug } = await params;
  const category = await getCategory(slug).catch(() => null);
  return pageMetadata(category?.name ?? "Kategori", category ? `${category.name}: TAURA Tesbihçilik koleksiyonu.` : "Kategori");
}

// Kategorinin ürün sayfası (ana sayfadaki kategori düğmeleri buraya götürür).
export default async function CategoryPage({ params }: PageProps<"/kategori/[slug]">) {
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
  return <ProductListPage title={category.name} products={products} failed={failed} empty="Bu kategoride henüz ürün yok." />;
}
