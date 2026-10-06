"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { clientAddress } from "@/lib/client-address";
import { normalizeCode, type OrderCoupon } from "@/lib/coupon-model";
import { checkCoupon, holdCoupon } from "@/lib/coupons";
import { addAddress, cleanTitle } from "@/lib/customer-addresses";
import { getCustomer } from "@/lib/customer-auth";
import { buildOrderItems } from "@/lib/order-build";
import { readCartPayload, readCheckoutForm, type CheckoutState } from "@/lib/order-form";
import { notifyOrderPlaced } from "@/lib/order-notify";
import { createOrder, deleteUnstartedOrder, getOrderByNumber } from "@/lib/orders";
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

    // Kupon: sepetteki kod sunucuda yeniden denetlenir, indirim burada hesaplanır (tarayıcının söylediği tutara güvenilmez).
    const couponCode = normalizeCode(String(formData.get("kupon") ?? "")).slice(0, 20);
    const buyer = { customerId: customer?.id ?? null, email: data.customer.email };
    let coupon: OrderCoupon | undefined;
    let discount = 0;
    if (couponCode) {
      const checked = /^[A-Z0-9-]{3,20}$/.test(couponCode)
        ? await checkCoupon(couponCode, built.subtotal, buyer)
        : ({ ok: false, message: "Bu kupon kodu geçerli değil." } as const);
      if (!checked.ok) return { values, message: `Kupon: ${checked.message} Kuponu sepetten kaldırıp yeniden deneyin.` };
      coupon = { code: checked.coupon.code, type: checked.coupon.type, amount: checked.coupon.amount };
      discount = checked.discount;
    }

    const created = await createOrder({
      items: built.items,
      subtotal: built.subtotal,
      ...(coupon ? { coupon, discount } : {}),
      shippingFee: settings.shippingFee,
      total: built.subtotal - discount + settings.shippingFee,
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

    // Kupon hakkı ayrılır (sınır ve müşteri başına tek kullanım burada kesin olarak denetlenir). Bu arada başkası son hakkı
    // aldıysa hiç ödenmemiş sipariş silinir ve müşteri forma döner.
    if (coupon) {
      const held = await holdCoupon(coupon, number, buyer);
      if (!held.ok) {
        await deleteUnstartedOrder(number);
        return { values, message: `Kupon: ${held.message} Kuponu sepetten kaldırıp yeniden deneyin.` };
      }
    }

    // Giriş yapılmışsa ve "Adresi kaydet" işaretliyse adres hesabın adres defterine eklenir (aynısı varsa eklenmez).
    // Kayıt olmasa da sipariş geçerlidir.
    if (customer && formData.get("adresi-kaydet") === "evet") {
      try {
        await addAddress(customer.id, {
          title: cleanTitle(formData.get("adres-basligi")),
          name: data.customer.name,
          phone: data.customer.phone,
          ...data.address,
        });
      } catch (error) {
        console.error(`Adres kaydedilemedi (${number})`, error);
      }
    }

    // Kartla ödeme açıksa ödeme oturumu şimdi açılır. Açılamazsa sipariş yine de kayıtlıdır: müşteri sipariş sayfasından
    // "Kartla öde" ile yeniden dener.
    if (paymentsActive(paymentSetup())) {
      notifyNow = false; // e-postalar ödeme ALININCA gider; ödenmemiş denemeler için gitmesin
      try {
        const order = await getOrderByNumber(number);
        if (order) {
          const started = await startPayment(order, address);
          if (started.ok) payUrl = started.url;
          else if (started.stock) {
            // Sipariş verilirken stok vardı ama ödeme başlarken (aynı anda başka biri aldı) yetmedi: ödeme sayfası açılmaz,
            // hiç ödenmemiş sipariş silinir ve müşteri sepetiyle birlikte forma döner.
            await deleteUnstartedOrder(number);
            return { values, message: `${started.error} Sepetinizi güncelleyip yeniden deneyin.` };
          }
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
