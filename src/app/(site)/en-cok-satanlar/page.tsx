import { ProductListPage } from "@/components/product-list-page";
import { showcaseProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/metadata";
import type { Product } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("En çok satanlar", "En çok tercih edilen tesbihlerimiz.");

// Vitrinin "Tümünü gör" sayfası: yöneticinin seçtiği ürünler, onun sırasıyla (Site Görünümü → Vitrinler).
export default async function BestSellersPage() {
  let products: Product[] = [];
  let failed = false;
  try {
    products = await showcaseProducts("en-cok-satanlar");
  } catch (error) {
    console.error("Vitrin okunamadı", error);
    failed = true;
  }
  return <ProductListPage title="En çok satanlar" intro="En çok tercih edilen tesbihlerimiz." products={products} failed={failed} empty="Bu vitrinde şu an ürün yok." />;
}
