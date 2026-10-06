import { formatDateTime, formatPrice } from "./format";
import { ORDER_STATUS_LABELS, type Order } from "./order-model";
import { PAYMENT_ATTENTION_LABELS, type PaymentAttention } from "./payment-model";
import { formatPhone } from "./phone";
import { shippingLabel } from "./shipping";
import { orderMessage, whatsappLink } from "./whatsapp";

// Sipariş e-postalarının metinleri (düz metin, Türkçe). Saf işlevler: veritabanına ve ortama dokunmaz, sipariş ve
// bağlamı (sitenin adresi, iletişim bilgileri) alıp konu + metin döndürür. Müşterinin yazdığı değerler (ad, adres, not)
// olduğu gibi metne girer; düz metin olduğundan çalıştırılabilir bir şey taşımaz.

export type MailContact = { whatsapp: string; phone: string; email: string };
export type MailContext = { siteUrl: string; contact: MailContact };
export type MailDraft = { subject: string; text: string };

const SHOP = "TAURA Tesbihçilik";

// Para ve kargo yazıları e-postada kırılmaz boşluk içermesin.
const plain = (text: string) => text.replace(/ /g, " ");
const money = (amount: number) => plain(formatPrice(amount));

const firstName = (order: Order) => order.customer.name.split(" ")[0];
export const customerPageUrl = (order: Order, siteUrl: string) => `${siteUrl}/siparis/${order.trackKey}`;

const itemLines = (order: Order) =>
  order.items.map((item) => `- ${item.name} — ${item.qty} × ${money(item.price)} = ${money(item.price * item.qty)}`);

const totalLines = (order: Order) => [
  `Ara toplam: ${money(order.subtotal)}`,
  ...(order.discount ? [`İndirim${order.coupon ? ` (${order.coupon.code})` : ""}: −${money(order.discount)}`] : []),
  ...(order.gift ? ["Hediye paketi: Ücretsiz"] : []),
  `Kargo: ${plain(shippingLabel(order.shippingFee))}`,
  `Toplam: ${money(order.total)}`,
];

const giftLines = (order: Order) =>
  order.gift ? ["", order.giftNote ? `Hediye paketi istendi. Not kartı: ${order.giftNote}` : "Hediye paketi istendi."] : [];

const addressLines = (order: Order) => [
  order.customer.name,
  order.address.line,
  `${order.address.district} / ${order.address.city} · ${order.address.postalCode}`,
];

// Ayarlarda dolu olan iletişim bilgileri; hiçbiri yoksa bölüm hiç yazılmaz.
function contactSection(contact: MailContact): string[] {
  const rows = [
    ...(contact.whatsapp ? [`WhatsApp: ${formatPhone(contact.whatsapp)}`] : []),
    ...(contact.phone ? [`Telefon: ${formatPhone(contact.phone)}`] : []),
    ...(contact.email ? [`E-posta: ${contact.email}`] : []),
  ];
  return rows.length > 0 ? ["", "SORULARINIZ İÇİN", ...rows] : [];
}

// Satırları birleştirir: üst üste en çok bir boş satır kalır, metin tek bir satır sonuyla biter.
const compose = (rows: string[]) => `${rows.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;

// Müşteriye: sipariş verildi. Sipariş "ödeme bekleniyor" değilse (kartla ödeme alınmışsa) metin ödemenin alındığını söyler.
export function orderReceivedMail(order: Order, context: MailContext): MailDraft {
  const paid = order.status !== "pending";
  return {
    subject: `Siparişiniz alındı · ${order.number}`,
    text: compose([
      `Merhaba ${firstName(order)},`,
      "",
      paid ? "Siparişinizi aldık ve ödemenizi onayladık, teşekkür ederiz." : "Siparişinizi aldık, teşekkür ederiz.",
      "",
      `Sipariş numaranız: ${order.number}`,
      `Sipariş zamanı: ${formatDateTime(order.createdAt)}`,
      "",
      "ÜRÜNLER",
      ...itemLines(order),
      "",
      ...totalLines(order),
      ...giftLines(order),
      "",
      "TESLİMAT ADRESİ",
      ...addressLines(order),
      ...(order.note ? ["", `Sipariş notunuz: ${order.note}`] : []),
      "",
      "Siparişinizin durumunu bu adresten takip edebilirsiniz (adresi yalnızca güvendiğiniz kişilerle paylaşın):",
      customerPageUrl(order, context.siteUrl),
      "",
      `Adresi kaybederseniz ${context.siteUrl}/siparis sayfasında sipariş numaranız ve bu e-posta adresinizle siparişinizi yeniden açabilirsiniz.`,
      "",
      paid
        ? "Siparişiniz hazırlanacak. Kargoya verildiğinde size yeniden yazacağız."
        : "Ödemeniz onaylandığında siparişiniz hazırlanmaya başlar. Siparişiniz kargoya verildiğinde size yeniden yazacağız.",
      ...(order.test ? ["", "Not: Bu bir deneme siparişidir (yalnız örnek ürünler); hiçbir ürün gönderilmeyecek."] : []),
      ...contactSection(context.contact),
      "",
      SHOP,
    ]),
  };
}

// Müşteriye: sipariş kargoya verildi.
export function orderShippedMail(order: Order, context: MailContext): MailDraft {
  const shipment = order.shipment;
  return {
    subject: `Siparişiniz kargoya verildi · ${order.number}`,
    text: compose([
      `Merhaba ${firstName(order)},`,
      "",
      `${order.number} numaralı siparişiniz kargoya verildi.`,
      ...(shipment
        ? [
            "",
            `Kargo firması: ${shipment.carrier}`,
            ...(shipment.trackingNumber ? [`Takip numarası: ${shipment.trackingNumber}`] : []),
          ]
        : []),
      "",
      "Siparişinizin durumunu buradan takip edebilirsiniz:",
      customerPageUrl(order, context.siteUrl),
      ...contactSection(context.contact),
      "",
      SHOP,
    ]),
  };
}

// Size (işletme sahibine): yeni sipariş geldi. Yanıtlanırsa müşteriye gider (replyTo müşterinin adresidir).
// stockProblems: kartla ödeme alındı ama stok yetmediyse yetmeyen ürünler (uyarı olarak yazılır).
export function newOrderMail(order: Order, context: MailContext, stockProblems: string[] = []): MailDraft {
  const writeToCustomer = whatsappLink(
    order.customer.phone,
    orderMessage(firstName(order), order.number, customerPageUrl(order, context.siteUrl)),
  );
  const paid = order.status !== "pending";
  return {
    subject: `${order.test ? "[TEST] " : ""}Yeni sipariş${paid ? " (ödendi)" : ""}: ${order.number} · ${money(order.total)}`,
    text: compose([
      "Yeni bir sipariş geldi.",
      ...(order.test ? ["Bu bir TEST siparişi (yalnız örnek ürünler)."] : []),
      ...(stockProblems.length > 0
        ? [
            "",
            "DİKKAT: Kartla ödeme alındı ama stok yetmedi, ürünlerin stoğu düşülemedi:",
            ...stockProblems.map((problem) => `- ${problem}`),
            "Stoğu güncelleyip yönetimde “Stoğu şimdi düş” diyebilir ya da siparişi iptal edip ödemeyi iade edebilirsiniz.",
          ]
        : []),
      "",
      `Sipariş: ${order.number}`,
      `Zaman: ${formatDateTime(order.createdAt)}`,
      `Durum: ${ORDER_STATUS_LABELS[order.status]}`,
      `Toplam: ${money(order.total)}`,
      "",
      "MÜŞTERİ",
      `Ad: ${order.customer.name}`,
      `Telefon: ${formatPhone(order.customer.phone)}`,
      `E-posta: ${order.customer.email}`,
      `WhatsApp'tan yaz: ${writeToCustomer}`,
      "",
      "ÜRÜNLER",
      ...itemLines(order),
      "",
      ...totalLines(order),
      ...giftLines(order),
      "",
      "TESLİMAT ADRESİ",
      ...addressLines(order),
      ...(order.note ? ["", `Müşterinin sipariş notu: ${order.note}`] : []),
      "",
      `Yönetimde aç: ${context.siteUrl}/yonetim/siparisler/${order.number}`,
    ]),
  };
}

// Size: bir ödeme gözden geçirilmeli (tutar uyuşmuyor, ikinci ödeme, kapanmış siparişe ödeme...). Sipariş silinmiş olabilir,
// bu yüzden yalnız numara ve tutarla yazılır.
export function paymentAlertMail(
  info: { orderNumber: string; amount: number; attention: PaymentAttention },
  context: MailContext,
): MailDraft {
  return {
    subject: `DİKKAT: Ödeme gözden geçirilmeli · ${info.orderNumber}`,
    text: compose([
      "Bir ödemeyi gözden geçirmeniz gerekiyor.",
      "",
      `Sipariş: ${info.orderNumber}`,
      `Tutar: ${money(info.amount)}`,
      `Sorun: ${PAYMENT_ATTENTION_LABELS[info.attention]}`,
      "",
      `Yönetimde aç: ${context.siteUrl}/yonetim/siparisler/${info.orderNumber}`,
    ]),
  };
}
