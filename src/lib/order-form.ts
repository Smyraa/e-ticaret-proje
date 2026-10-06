// Ödeme formunun alanları, doğrulaması ve durum türleri. Sunucu eyleminde ve formda kullanılır (tarayıcıya yalnızca
// türler gider). Doğrulama sunucuda yapılır; tarayıcıdan gelen hiçbir değere (fiyat dahil) güvenilmez.
import { EMAIL_ERROR, isEmail } from "./email";
import { charCount, multiLine, oneLine, tooLong } from "./form-text";
import { NOTE_MAX } from "./gift-note";
import type { OrderAddress, OrderCustomer } from "./order-model";
import { normalizePhone } from "./phone";
import { findProvince, isDistrictOf, postalCodeMatches } from "./tr-places";

export const ORDER_LIMITS = {
  nameMin: 2,
  nameMax: 80,
  addressMin: 10,
  addressMax: 300,
  placeMin: 2,
  placeMax: 40,
  noteMax: 300,
  maxLines: 30, // siparişteki en çok farklı ürün
  maxQty: 99, // bir üründen en çok adet
} as const;

// Adres alanları (ödeme formu ve hesaptaki adres defteri ortak kullanır): alıcının adı ve telefonu da adresin parçası.
export type AddressValues = {
  name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode: string;
};

// Formdaki alanlar; müşterinin yazdığı gibi (temizlenmiş metin) tutulur ki hata sonrası yazdıkları geri gelsin.
export type CheckoutValues = AddressValues & {
  email: string;
  note: string;
  consent: boolean;
  saveAddress: boolean; // girişliyken "Adresi kaydet" (yalnız hata sonrası formu geri doldurmak için)
  addressTitle: string;
};

export type CheckoutField = keyof CheckoutValues;
export type CheckoutErrors = Partial<Record<CheckoutField, string>>;
export type AddressErrors = Partial<Record<keyof AddressValues, string>>;

// Telefon yalnız Türkiye numarası olabilir (kargo yurt içi; formda maske de bu biçimi kullanır).
export const PHONE_TR_ERROR = "Türkiye'de geçerli bir telefon numarası yazın (örn. 0555 111 22 33).";
const isTurkishPhone = (digits: string | null): digits is string => digits !== null && /^90[2-5]\d{9}$/.test(digits);

export function readAddressValues(formData: FormData): AddressValues {
  return {
    name: oneLine(formData.get("ad-soyad")),
    phone: oneLine(formData.get("telefon")),
    address: multiLine(formData.get("adres")),
    city: oneLine(formData.get("il")),
    district: oneLine(formData.get("ilce")),
    postalCode: oneLine(formData.get("posta-kodu")),
  };
}

// Adres alanlarını denetler. Hatasızsa telefonu tek biçimde (905551112233) verir.
export function checkAddress(values: AddressValues): { errors: AddressErrors; phone: string | null } {
  const errors: AddressErrors = {};
  const L = ORDER_LIMITS;

  if (!values.name) errors.name = "Ad soyad yazın.";
  else if (charCount(values.name) < L.nameMin) errors.name = `Ad soyad en az ${L.nameMin} karakter olmalı.`;
  else if (charCount(values.name) > L.nameMax) errors.name = tooLong(L.nameMax, values.name);

  const phone = normalizePhone(values.phone);
  if (!values.phone) errors.phone = "Telefon numarası yazın.";
  else if (!isTurkishPhone(phone)) errors.phone = PHONE_TR_ERROR;

  if (!values.address) errors.address = "Adresi yazın.";
  else if (charCount(values.address) < L.addressMin) {
    errors.address = `Adresi mahalle, sokak ve kapı numarasıyla yazın (en az ${L.addressMin} karakter).`;
  } else if (charCount(values.address) > L.addressMax) errors.address = tooLong(L.addressMax, values.address);

  const province = findProvince(values.city);
  if (!values.city) errors.city = "İl seçin.";
  else if (!province) errors.city = "Listeden bir il seçin.";

  if (!values.district) errors.district = "İlçe seçin.";
  else if (province && !isDistrictOf(values.city, values.district)) errors.district = "Seçtiğiniz ilin bir ilçesini seçin.";

  if (!values.postalCode) errors.postalCode = "Posta kodunu yazın.";
  else if (!/^\d{5}$/.test(values.postalCode)) errors.postalCode = "Posta kodu 5 haneli olmalı (örn. 34000).";
  else if (province && !postalCodeMatches(values.city, values.postalCode)) {
    errors.postalCode = `${province.name} için posta kodu ${String(province.plate).padStart(2, "0")} ile başlar.`;
  }

  return { errors, phone: Object.keys(errors).length === 0 && isTurkishPhone(phone) ? phone : null };
}

export type CheckoutState =
  | {
      values?: CheckoutValues; // son gönderilen (temizlenmiş) değerler
      errors?: CheckoutErrors; // alan başına hata iletisi
      message?: string; // genel hata (sepet sorunları, sınır aşımı, sunucu hatası)
    }
  | undefined;

// Doğrulanmış müşteri bilgileri (siparişe yazılmaya hazır).
export type CheckoutData = { customer: OrderCustomer; address: OrderAddress; note: string };

export function readCheckoutForm(formData: FormData): {
  values: CheckoutValues;
  errors: CheckoutErrors;
  data?: CheckoutData;
} {
  const values: CheckoutValues = {
    ...readAddressValues(formData),
    email: oneLine(formData.get("eposta")).toLowerCase(),
    note: multiLine(formData.get("siparis-notu")),
    consent: oneLine(formData.get("onay")) === "evet",
    saveAddress: oneLine(formData.get("adresi-kaydet")) === "evet",
    addressTitle: [...oneLine(formData.get("adres-basligi"))].slice(0, 30).join(""),
  };
  const address = checkAddress(values);
  const errors: CheckoutErrors = { ...address.errors };
  const phone = address.phone;
  const L = ORDER_LIMITS;

  if (!values.email) errors.email = "E-posta adresi yazın.";
  else if (!isEmail(values.email)) errors.email = EMAIL_ERROR;

  if (charCount(values.note) > L.noteMax) errors.note = tooLong(L.noteMax, values.note);
  if (!values.consent) errors.consent = "Devam etmek için ön bilgilendirmeyi ve satış sözleşmesini okuyup kabul etmelisiniz.";

  if (Object.keys(errors).length > 0 || !phone) return { values, errors };

  return {
    values,
    errors,
    data: {
      customer: { name: values.name, phone, email: values.email },
      address: { line: values.address, city: values.city, district: values.district, postalCode: values.postalCode },
      note: values.note,
    },
  };
}

// Sepetten istenen satır: yalnız ürün adresi ve adet. Fiyat ve ürün bilgisi sunucuda veritabanından okunur.
export type RequestedLine = { slug: string; qty: number };
export type CartPayload = { lines: RequestedLine[]; gift: boolean; giftNote: string };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CART_UNREADABLE = "Sepetiniz okunamadı. Sepete dönüp ürünleri yeniden kontrol edin.";

// Formdaki gizli sepet alanını (JSON) sıkı biçimde okur. Bozuk, aşırı büyük ya da kuralları aşan veri reddedilir.
export function readCartPayload(formData: FormData): CartPayload | { error: string } {
  const raw = formData.get("sepet");
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 5000) return { error: CART_UNREADABLE };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: CART_UNREADABLE };
  }
  if (!Array.isArray(parsed)) return { error: CART_UNREADABLE };
  if (parsed.length === 0) return { error: "Sepetiniz boş." };
  if (parsed.length > ORDER_LIMITS.maxLines) return { error: CART_UNREADABLE };

  // Aynı ürün birden çok satırda gelirse adetler birleştirilir.
  const quantities = new Map<string, number>();
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) return { error: CART_UNREADABLE };
    const { slug, qty } = item as Record<string, unknown>;
    if (typeof slug !== "string" || slug.length > 80 || !SLUG_PATTERN.test(slug)) return { error: CART_UNREADABLE };
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > ORDER_LIMITS.maxQty) {
      return { error: CART_UNREADABLE };
    }
    const total = (quantities.get(slug) ?? 0) + qty;
    if (total > ORDER_LIMITS.maxQty) return { error: CART_UNREADABLE };
    quantities.set(slug, total);
  }

  // Hediye notu yalnız hediye paketi işaretliyken geçerlidir (sepet de böyle çalışır).
  const gift = oneLine(formData.get("hediye")) === "evet";
  const giftNote = gift ? [...multiLine(formData.get("hediye-notu"))].slice(0, NOTE_MAX).join("") : "";

  return { lines: [...quantities].map(([slug, qty]) => ({ slug, qty })), gift, giftNote };
}
