"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { listCategories } from "@/lib/catalog";
import { isSafeMediaName, type ImageActionState } from "@/lib/images";
import { deleteMediaFile, deleteMediaFiles } from "@/lib/media-files";
import { readProductForm, valuesOf, type DeleteState, type ProductFormState } from "@/lib/product-form";
import {
  BarcodeTakenError,
  deleteProduct,
  deleteSampleProducts,
  getProductForAdmin,
  insertProduct,
  moveProductImage,
  removeProductImage,
  updateProduct,
  type MoveImageOp,
} from "@/lib/products-admin";

const SAVE_FAILED = "Kaydedilemedi. Veritabanına ulaşılamıyor olabilir; biraz sonra yeniden deneyin.";
const BARCODE_TAKEN = "Bu barkod başka bir üründe kayıtlı.";
const CATEGORY_MISSING = "Seçilen kategori bulunamadı; silinmiş olabilir. Sayfayı yenileyip yeniden seçin.";

// Formdan gelen kategori adresi gerçekten var mı (boş = kategorisiz)?
const categoryExists = async (slug: string) => !slug || (await listCategories()).some((category) => category.slug === slug);
const NOT_FOUND = "Bu ürün bulunamadı; silinmiş olabilir. Ürün listesine dönün.";
const DELETE_FAILED = "Silinemedi. Veritabanına ulaşılamıyor olabilir; biraz sonra yeniden deneyin.";
const NOT_CONFIRMED = "Silme onaylanmadı. Sayfa tam yüklenince yeniden deneyin.";

// Yeni ürün ekler. Her sunucu eylemi gibi, yetki kontrolü bu işlevin içinde yapılır (formun yalnız
// girişli sayfada görünmesi güvenlik sayılmaz); girdiler güvenilmez kabul edilip yeniden doğrulanır.
export async function createProduct(_state: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();

  const { values, errors, data } = readProductForm(formData);
  if (!data) return { values, errors };
  if (!(await categoryExists(data.category))) return { values, errors: { category: CATEGORY_MISSING } };

  let slug: string;
  try {
    slug = await insertProduct(data);
  } catch (error) {
    if (error instanceof BarcodeTakenError) return { values, errors: { barcode: BARCODE_TAKEN } };
    console.error("Ürün eklenemedi", error);
    return { values, message: SAVE_FAILED };
  }

  revalidatePath("/", "layout"); // katalog değişti: tüm sayfalar yeniden okunsun
  // Formda fotoğraf seçildiyse yönlendirme tarayıcıya bırakılır: önce fotoğraflar bu ürüne yüklenir (bkz. edit-form).
  if (Number(formData.get("gorsel-sayisi")) > 0) return { values, created: slug };
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
  if (typeof slug !== "string" || slug === "") return { values, message: NOT_FOUND };
  if (!(await categoryExists(data.category))) return { values, errors: { category: CATEGORY_MISSING } };

  try {
    const existing = await getProductForAdmin(slug);
    if (!existing) return { values, message: NOT_FOUND };

    // "Örnek" işareti yalnız kaldırılabilir; formdan hiçbir ürün örnek yapılamaz.
    await updateProduct(slug, data, existing.sample && values.sample);
  } catch (error) {
    if (error instanceof BarcodeTakenError) return { values, errors: { barcode: BARCODE_TAKEN } };
    console.error("Ürün kaydedilemedi", error);
    return { values, message: SAVE_FAILED };
  }

  revalidatePath("/", "layout");
  // Barkod boş bırakıldıysa sistem yenisini üretti: form kayıtlı değerleri göstersin.
  const saved = await getProductForAdmin(slug).catch(() => null);
  return { values: saved ? valuesOf(saved) : values, saved: true };
}

const MOVES: Record<string, MoveImageOp> = { yukari: "up", asagi: "down", ana: "main" };
const MOVE_DONE: Record<MoveImageOp, string> = { up: "Görsel bir yukarı alındı.", down: "Görsel bir aşağı alındı.", main: "Görsel ana görsel yapıldı." };

// Görsel listesindeki bir düğmenin işlemi. Düğmenin değeri "<işlem>:<dosya adı>" biçimindedir (yukari, asagi, ana, sil).
// Dosya adı formdan geldiği için güvenilmez: biçimi denetlenir ve yalnız bu ürünün listesinde varsa işlem yapılır.
export async function changeImage(
  slug: string,
  _state: ImageActionState,
  formData: FormData,
): Promise<ImageActionState> {
  await requireAdmin();

  const command = formData.get("islem");
  const split = typeof command === "string" ? command.indexOf(":") : -1;
  if (typeof command !== "string" || split < 1) return { error: "Geçersiz işlem." };
  const op = command.slice(0, split);
  const name = command.slice(split + 1);
  if (typeof slug !== "string" || !isSafeMediaName(name)) return { error: "Geçersiz görsel." };

  try {
    const product = await getProductForAdmin(slug);
    if (!product?.images.includes(name)) return { error: "Bu görsel artık üründe yok. Sayfayı yenileyin." };

    if (op === "sil") {
      const { removed, unused } = await removeProductImage(slug, name);
      if (!removed) return { error: "Görsel silinemedi. Sayfayı yenileyip yeniden deneyin." };
      if (unused) await deleteMediaFile(name); // başka üründe kullanılmıyorsa dosya da diskten gider
      revalidatePath("/", "layout");
      return { message: "Görsel silindi." };
    }

    if (Object.hasOwn(MOVES, op)) {
      const move = MOVES[op];
      if (!(await moveProductImage(slug, name, move))) {
        return { error: "Liste başka yerden değişmiş. Sayfayı yenileyip yeniden deneyin." };
      }
      revalidatePath("/", "layout");
      return { message: MOVE_DONE[move] };
    }
  } catch (error) {
    console.error("Görsel işlemi yapılamadı", error);
    return { error: "İşlem yapılamadı. Biraz sonra yeniden deneyin." };
  }
  return { error: "Geçersiz işlem." };
}

// Ürünü kalıcı olarak siler (görselleri de, başka üründe kullanılmıyorsa). "onay" alanı, tarayıcıdaki onay
// penceresinden SONRA forma yazılır; JavaScript yoksa ya da henüz yüklenmediyse onay gelmez ve silinmez.
export async function removeProduct(slug: string, _state: DeleteState, formData: FormData): Promise<DeleteState> {
  await requireAdmin();
  if (formData.get("onay") !== "evet") return { error: NOT_CONFIRMED };
  if (typeof slug !== "string" || slug === "") return { error: NOT_FOUND };

  try {
    const { unusedImages } = await deleteProduct(slug);
    await deleteMediaFiles(unusedImages);
  } catch (error) {
    console.error("Ürün silinemedi", error);
    return { error: DELETE_FAILED };
  }

  revalidatePath("/", "layout");
  redirect("/yonetim/urunler?silindi=1");
}

// Örnek (demo) işaretli TÜM ürünleri ve yalnız onların kullandığı görselleri siler; gerçek ürünlere dokunmaz.
export async function removeSampleProducts(_state: DeleteState, formData: FormData): Promise<DeleteState> {
  await requireAdmin();
  if (formData.get("onay") !== "evet") return { error: NOT_CONFIRMED };

  let count: number;
  try {
    const result = await deleteSampleProducts();
    count = result.count;
    await deleteMediaFiles(result.unusedImages);
  } catch (error) {
    console.error("Örnek ürünler silinemedi", error);
    return { error: DELETE_FAILED };
  }

  revalidatePath("/", "layout");
  redirect(`/yonetim/urunler?ornekler=${count}`);
}
