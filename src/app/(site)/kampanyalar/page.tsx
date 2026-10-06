import { ProductListPage } from "@/components/product-list-page";
import { showcaseProducts } from "@/lib/catalog";
import { pageMetadata } from "@/lib/metadata";
import type { Product } from "@/lib/products";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("Kampanyalar", "Seçili kampanya ürünleri.");

// Vitrinin "Tümünü gör" sayfası: yöneticinin seçtiği ürünler, onun sırasıyla (Site Görünümü → Vitrinler).
export default async function CampaignShowcasePage() {
  let products: Product[] = [];
  let failed = false;
  try {
    products = await showcaseProducts("kampanyalar");
  } catch (error) {
    console.error("Vitrin okunamadı", error);
    failed = true;
  }
  return <ProductListPage title="Kampanyalar" intro="Seçili kampanya ürünleri." products={products} failed={failed} empty="Bu vitrinde şu an ürün yok." />;
}
