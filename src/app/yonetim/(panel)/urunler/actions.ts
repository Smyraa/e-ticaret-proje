"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { readProductForm, type ProductFormState } from "@/lib/product-form";
import { getProductForAdmin, insertProduct, updateProduct } from "@/lib/products-admin";

const SAVE_FAILED = "Kaydedilemedi. Veritabanına ulaşılamıyor olabilir; biraz sonra yeniden deneyin.";

// Yeni ürün ekler. Her sunucu eylemi gibi, yetki kontrolü bu işlevin içinde yapılır (formun yalnız
// girişli sayfada görünmesi güvenlik sayılmaz); girdiler güvenilmez kabul edilip yeniden doğrulanır.
export async function createProduct(_state: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();

  const { values, errors, data } = readProductForm(formData);
  if (!data) return { values, errors };

  let slug: string;
  try {
    slug = await insertProduct(data);
  } catch (error) {
    console.error("Ürün eklenemedi", error);
    return { values, message: SAVE_FAILED };
  }

  revalidatePath("/", "layout"); // katalog değişti: tüm sayfalar yeniden okunsun
  redirect(`/yonetim/urunler/${slug}?eklendi=1`);
}

// Var olan ürünü günceller. slug, formdan değil eyleme bağlanmış (bind) bir değerdir ama o da güvenilmez
// sayılır: ürün veritabanında aranır, yoksa hata dönülür.
export async function saveProduct(
  slug: string,
  _state: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const { values, errors, data } = readProductForm(formData);
  if (!data) return { values, errors };

  try {
    const existing = await getProductForAdmin(slug);
    if (!existing) return { values, message: "Bu ürün bulunamadı; silinmiş olabilir. Ürün listesine dönün." };

    // "Örnek" işareti yalnız kaldırılabilir; formdan hiçbir ürün örnek yapılamaz.
    await updateProduct(slug, data, existing.sample && values.sample);
  } catch (error) {
    console.error("Ürün kaydedilemedi", error);
    return { values, message: SAVE_FAILED };
  }

  revalidatePath("/", "layout");
  return { values, saved: true };
}
