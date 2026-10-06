"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { clientAddress } from "@/lib/client-address";
import { getCustomer } from "@/lib/customer-auth";
import { buildOrderItems } from "@/lib/order-build";
import { readCartPayload, readCheckoutForm, type CheckoutState } from "@/lib/order-form";
import { notifyOrderPlaced } from "@/lib/order-notify";
import { createOrder, getOrderByNumber } from "@/lib/orders";
import { paymentSetup } from "@/lib/payment-config";
import { paymentsActive } from "@/lib/payment-model";
import { startPayment } from "@/lib/payments";
import { getProductsBySlugs } from "@/lib/products";
import { allowRequest } from "@/lib/rate-limit";
import { readSettings } from "@/lib/settings";

// Aynı bağlantı adresinden bu sürede en çok bu kadar sipariş açılabilir (sahte siparişle listeyi doldurmayı zorlaştırır).
const ORDERS_PER_WINDOW = 5;
const WINDOW_MINUTES = 30;

// "Siparişi tamamla": sepet ve form sunucuda doğrulanır, ürün bilgisi ve fiyatlar veritabanından yeniden okunur,
// sipariş "ödeme bekleniyor" durumunda kaydedilir. Giriş gerekmez (misafir alışveriş; giriş yapılmışsa sipariş hesaba bağlanır); stok burada düşmez, ödeme
// alınınca düşer. Kartla ödeme açıksa müşteri ödeme sayfasına yönlenir (sonuç siteye dönünce işlenir, bkz.
// odeme/geri-donus); değilse sipariş sayfasına yönlenir ve sipariş e-postaları hemen hazırlanır.
export async function placeOrder(_state: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const form = readCheckoutForm(formData);
  if (!form.data) return { values: form.values, errors: form.errors };
  const { values, data } = form;

  const cart = readCartPayload(formData);
  if ("error" in cart) return { values, message: cart.error };

  let trackKey: string;
  let number: string;
  let payUrl: string | null = null;
  let notifyNow = true;
  try {
    const address = await clientAddress();
    if (!(await allowRequest(`siparis|${address}`, ORDERS_PER_WINDOW, WINDOW_MINUTES))) {
      return { values, message: "Kısa sürede çok fazla sipariş verildi. Birkaç dakika bekleyip yeniden deneyin." };
    }

    // Kargo ücreti readSettings ile okunur: okunamazsa hata verir (varsayılan ücrete düşüp yanlış toplamla sipariş açılmasın).
    const [products, settings, customer] = await Promise.all([
      getProductsBySlugs(cart.lines.map((line) => line.slug)),
      readSettings(),
      getCustomer(),
    ]);
    const built = buildOrderItems(products, cart.lines);
    if (!built.ok) {
      return {
        values,
        message: `Sipariş oluşturulamadı. ${built.problems.join(" ")} Lütfen sepetinizi güncelleyip tekrar deneyin.`,
      };
    }

    const created = await createOrder({
      items: built.items,
      subtotal: built.subtotal,
      shippingFee: settings.shippingFee,
      total: built.subtotal + settings.shippingFee,
      gift: cart.gift,
      giftNote: cart.giftNote,
      note: data.note,
      customer: data.customer,
      address: data.address,
      test: built.items.every((item) => item.sample),
      consentAt: new Date(),
      ...(customer ? { customerId: customer.id } : {}),
    });
    trackKey = created.trackKey;
    number = created.number;

    // Kartla ödeme açıksa ödeme oturumu şimdi açılır. Açılamazsa sipariş yine de kayıtlıdır: müşteri sipariş sayfasından
    // "Kartla öde" ile yeniden dener.
    if (paymentsActive(paymentSetup())) {
      notifyNow = false; // e-postalar ödeme ALININCA gider; ödenmemiş denemeler için gitmesin
      try {
        const order = await getOrderByNumber(number);
        if (order) {
          const started = await startPayment(order, address);
          if (started.ok) payUrl = started.url;
        }
      } catch (error) {
        // Sipariş kaydedildi; yalnız ödeme sayfası açılamadı. Müşteri hata görmez, sipariş sayfasından yeniden dener.
        console.error(`Ödeme oturumu açılamadı (${number})`, error);
      }
    }
  } catch (error) {
    console.error("Sipariş oluşturulamadı", error);
    return { values, message: "Sipariş şu an oluşturulamadı. Biraz sonra yeniden deneyin." };
  }

  // E-postalar (müşteriye "sipariş alındı", size "yeni sipariş") yanıt gittikten SONRA hazırlanır: müşteri beklemez,
  // e-posta sorunu siparişi bozmaz.
  if (notifyNow) after(() => notifyOrderPlaced(number));
  if (payUrl) redirect(payUrl);
  redirect(`/siparis/${trackKey}?yeni=1`);
}
