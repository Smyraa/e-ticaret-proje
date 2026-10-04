import { formatDateTime, formatPrice } from "./format";
import { ORDER_STATUS_LABELS, type Order } from "./order-model";
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

// Müşteriye: sipariş verildi.
export function orderReceivedMail(order: Order, context: MailContext): MailDraft {
  return {
    subject: `Siparişiniz alındı · ${order.number}`,
    text: compose([
      `Merhaba ${firstName(order)},`,
      "",
      "Siparişinizi aldık, teşekkür ederiz.",
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
      "Ödemeniz onaylandığında siparişiniz hazırlanmaya başlar. Siparişiniz kargoya verildiğinde size yeniden yazacağız.",
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
export function newOrderMail(order: Order, context: MailContext): MailDraft {
  const writeToCustomer = whatsappLink(
    order.customer.phone,
    orderMessage(firstName(order), order.number, customerPageUrl(order, context.siteUrl)),
  );
  return {
    subject: `${order.test ? "[TEST] " : ""}Yeni sipariş: ${order.number} · ${money(order.total)}`,
    text: compose([
      "Yeni bir sipariş geldi.",
      ...(order.test ? ["Bu bir TEST siparişi (yalnız örnek ürünler)."] : []),
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
