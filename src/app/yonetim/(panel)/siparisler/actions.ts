"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { deleteMediaFiles } from "@/lib/media-files";
import { readAdminNote, readCommand, readShipForm, type OrderActionState } from "@/lib/order-admin-form";
import { runOrderCommand } from "@/lib/order-flow";
import { notifyOrderShipped } from "@/lib/order-notify";
import { ORDER_NUMBER_PATTERN } from "@/lib/order-ids";
import type { OrderCommand } from "@/lib/order-status";
import { deleteTestOrders, saveAdminNote } from "@/lib/orders-admin";
import type { DeleteState } from "@/lib/product-form";

const NOT_FOUND = "Sipariş bulunamadı.";
const NOT_CONFIRMED = "İşlem onaylanmadı. Sayfa tam yüklenince yeniden deneyin.";
const FAILED = "İşlem yapılamadı. Veritabanına ulaşılamıyor olabilir; biraz sonra yeniden deneyin.";

// Onay penceresi gerektiren işlemler: stoğu oynatanlar ve geri alınması zor olanlar. "onay" alanı tarayıcıdaki onay
// penceresinden SONRA forma yazılır; JavaScript yoksa ya da henüz yüklenmediyse onay gelmez ve işlem yapılmaz.
const NEEDS_CONFIRM = new Set<OrderCommand>(["paid", "deliver", "cancel", "back", "stock-deduct", "stock-return"]);

// Siparişte bir işlem yapar (durum değiştirme, kargoya verme, stok onarımı). number sayfada bağlanır (bind) ama o da
// güvenilmez sayılır: biçimi denetlenir, sipariş veritabanında aranır; komutun o anki durumda geçerli olup olmadığına
// order-flow.ts karar verir.
export async function changeOrder(number: string, _state: OrderActionState, formData: FormData): Promise<OrderActionState> {
  await requireAdmin();
  if (typeof number !== "string" || !ORDER_NUMBER_PATTERN.test(number)) return { error: NOT_FOUND };

  const command = readCommand(formData);
  if (!command) return { error: "Geçersiz işlem." };
  if (NEEDS_CONFIRM.has(command) && formData.get("onay") !== "evet") return { error: NOT_CONFIRMED };

  let ship;
  if (command === "ship") {
    const form = readShipForm(formData);
    if (!form.data) return { errors: form.errors, values: form.values };
    ship = form.data;
  }

  try {
    const result = await runOrderCommand(number, command, ship);
    revalidatePath("/", "layout"); // durum ve stok değişti (başarısızsa da güncel durum görünsün)
    // Sipariş gerçekten kargoya verildiyse (bilgi düzeltmesi değil) müşteriye e-posta, yanıt gittikten sonra hazırlanır.
    if (result.ok && result.notify === "shipped") after(() => notifyOrderShipped(number));
    return result.ok ? { message: result.message } : { error: result.error, problems: result.problems };
  } catch (error) {
    console.error("Sipariş işlemi yapılamadı", error);
    return { error: FAILED };
  }
}

// Yönetici notunu kaydeder (yalnız yönetim görür).
export async function saveOrderNote(number: string, _state: OrderActionState, formData: FormData): Promise<OrderActionState> {
  await requireAdmin();
  if (typeof number !== "string" || !ORDER_NUMBER_PATTERN.test(number)) return { error: NOT_FOUND };

  const { note, error } = readAdminNote(formData);
  if (error) return { error };

  try {
    if (!(await saveAdminNote(number, note))) return { error: NOT_FOUND };
  } catch (failure) {
    console.error("Yönetici notu kaydedilemedi", failure);
    return { error: FAILED };
  }
  revalidatePath("/", "layout");
  return { message: note ? "Not kaydedildi." : "Not silindi." };
}

// Test (yalnız örnek ürünlerden oluşan) siparişlerin TÜMÜNÜ siler; gerçek siparişlere dokunmaz.
export async function removeTestOrders(_state: DeleteState, formData: FormData): Promise<DeleteState> {
  await requireAdmin();
  if (formData.get("onay") !== "evet") return { error: NOT_CONFIRMED };

  let count: number;
  try {
    const result = await deleteTestOrders();
    count = result.count;
    await deleteMediaFiles(result.unusedImages);
  } catch (error) {
    console.error("Test siparişleri silinemedi", error);
    return { error: FAILED };
  }

  revalidatePath("/", "layout");
  redirect(`/yonetim/siparisler?temizlendi=${count}`);
}
