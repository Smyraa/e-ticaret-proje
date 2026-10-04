import "server-only";

import { recordMailFailure, sendMail } from "./mail";
import { newOrderMail, orderReceivedMail, orderShippedMail, type MailContext } from "./order-mail-text";
import { getOrderByNumber } from "./orders";
import { readSettings } from "./settings";
import { siteUrl } from "./site";

// Sipariş bildirimleri: ilgili sipariş ve ayarlar okunur, e-postalar hazırlanıp gönderilir (bkz. mail.ts). Her işlev
// ÇAĞIRANI BEKLETMEMELİ ve siparişi bozmamalı: sunucu eylemlerinden `after()` içinde çağrılır ve hata fırlatmaz.

async function load(number: string) {
  const [order, settings] = await Promise.all([getOrderByNumber(number), readSettings()]);
  if (!order) return null;
  const context: MailContext = {
    siteUrl,
    contact: { whatsapp: settings.whatsapp, phone: settings.phone, email: settings.email },
  };
  return { order, settings, context };
}

// Sipariş verilince: müşteriye "siparişiniz alındı", size "yeni sipariş geldi". Bildirim adresi ayarlarda yoksa iletişim
// e-postası kullanılır; o da yoksa e-posta atlanır ve nedeni yönetimde sipariş sayfasında görünür.
export async function notifyOrderPlaced(number: string): Promise<void> {
  try {
    const loaded = await load(number);
    if (!loaded) return;
    const { order, settings, context } = loaded;

    await sendMail({
      kind: "order-received",
      orderNumber: number,
      to: order.customer.email,
      replyTo: settings.email || undefined,
      ...orderReceivedMail(order, context),
    });

    const draft = newOrderMail(order, context);
    const owner = settings.orderEmail || settings.email;
    if (owner) {
      await sendMail({ kind: "order-new", orderNumber: number, to: owner, replyTo: order.customer.email, ...draft });
    } else {
      await recordMailFailure({
        kind: "order-new",
        orderNumber: number,
        subject: draft.subject,
        error: "Bildirim e-postası ayarlanmadı (Ayarlar → Sipariş bildirimleri).",
      });
    }
  } catch (error) {
    console.error(`Sipariş e-postaları hazırlanamadı (${number})`, error);
  }
}

// Sipariş kargoya verilince müşteriye "siparişiniz kargoya verildi" gider. Kargo bilgisi yoksa (araya başka bir işlem
// girmişse) gönderilmez.
export async function notifyOrderShipped(number: string): Promise<void> {
  try {
    const loaded = await load(number);
    if (!loaded || !loaded.order.shipment) return;
    const { order, settings, context } = loaded;

    await sendMail({
      kind: "order-shipped",
      orderNumber: number,
      to: order.customer.email,
      replyTo: settings.email || undefined,
      ...orderShippedMail(order, context),
    });
  } catch (error) {
    console.error(`Kargo e-postası hazırlanamadı (${number})`, error);
  }
}
