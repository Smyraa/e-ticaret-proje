"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clientAddress } from "@/lib/client-address";
import { TRACK_KEY_PATTERN } from "@/lib/order-ids";
import { getOrderByKey } from "@/lib/orders";
import type { PayState } from "@/lib/payment-model";
import { checkOrderPayments, startPayment } from "@/lib/payments";
import { allowRequest } from "@/lib/rate-limit";

const MISSING = "Sipariş bulunamadı.";
const TOO_MANY = "Kısa sürede çok fazla deneme yapıldı. Birkaç dakika bekleyip yeniden deneyin.";
const FAILED = "İşlem şu an yapılamadı. Biraz sonra yeniden deneyin.";

// "Kartla öde": siparişin ödeme oturumunu açar (açık bir oturum varsa onu kullanır) ve müşteriyi ödeme sayfasına gönderir.
// key sayfada bağlanır (bind) ama güvenilmez sayılır: biçimi denetlenir, sipariş veritabanında aranır. Sayfanın gizli
// anahtarını bilen herkes bu siparişin ödeme sayfasını açabilir; bu zararsızdır (yalnız o siparişi ödeyebilir).
export async function startOrderPayment(key: string): Promise<PayState> {
  if (typeof key !== "string" || !TRACK_KEY_PATTERN.test(key)) return { error: MISSING };

  let url: string;
  try {
    const address = await clientAddress();
    const order = await getOrderByKey(key);
    if (!order) return { error: MISSING };
    // Kuruluşa her açılışta bir istek gider: hem sipariş başına hem adres başına sınırlanır.
    if (
      !(await allowRequest(`odeme-baslat|${order.number}`, 10, 30)) ||
      !(await allowRequest(`odeme-baslat-adres|${address}`, 30, 30))
    ) {
      return { error: TOO_MANY };
    }
    const started = await startPayment(order, address);
    if (!started.ok) return { error: started.error };
    url = started.url;
  } catch (error) {
    console.error("Ödeme başlatılamadı", error);
    return { error: FAILED };
  }
  redirect(url);
}

// "Ödememi kontrol et": müşteri ödemeyi yaptı ama siteye dönemediyse (sekme kapandı, bağlantı koptu) sonucu kuruluştan sorar.
export async function checkOrderPayment(key: string): Promise<PayState> {
  if (typeof key !== "string" || !TRACK_KEY_PATTERN.test(key)) return { error: MISSING };

  try {
    const order = await getOrderByKey(key);
    if (!order) return { error: MISSING };
    if (!(await allowRequest(`odeme-kontrol|${order.number}`, 12, 10))) return { error: TOO_MANY };

    const outcomes = await checkOrderPayments(order.number);
    revalidatePath("/", "layout"); // sipariş durumu değişmiş olabilir
    if (outcomes.length === 0) return { message: "Bekleyen bir ödeme bulunamadı." };
    if (outcomes.some((outcome) => outcome.kind === "paid")) return { message: "Ödemeniz alındı, teşekkür ederiz." };
    if (outcomes.some((outcome) => outcome.kind === "error")) {
      return { error: "Ödeme kuruluşuna şu an ulaşılamıyor. Biraz sonra yeniden deneyin." };
    }
    if (outcomes.some((outcome) => outcome.kind === "pending")) {
      return { message: "Ödeme henüz tamamlanmamış görünüyor. Ödemeyi bitirdiyseniz birkaç dakika sonra yeniden kontrol edin." };
    }
    return { message: "Son ödeme denemesi tamamlanamadı. Aşağıdan yeniden deneyebilirsiniz." };
  } catch (error) {
    console.error("Ödeme kontrol edilemedi", error);
    return { error: FAILED };
  }
}
