// Kuponların biçimi, indirim hesabı ve yönetim formu denetimi. Sunucuda ve sayfalarda ortak kullanılır (saf; veritabanı yok).
// Kullanıcı kararları (2026-10-07): yüzde ya da sabit tutar, miktar, bitiş tarihi, toplam kullanım sınırı, misafir izni,
// en az sepet tutarı ve müşteri başına tek kullanım. İndirim yalnız ürün ara toplamına uygulanır (kargoya değil);
// yüzde indirim tam liraya aşağı yuvarlanır; sabit indirim ara toplamı aşamaz (toplam eksiye düşmez).
import { oneLine } from "./form-text";
import { parseLira } from "./money";

export type CouponType = "percent" | "fixed";

export type Coupon = {
  id: string;
  code: string; // büyük harf, A–Z 0–9 ve tire
  type: CouponType;
  amount: number; // yüzde (1–90) ya da TL (tam lira)
  endsAt: Date; // bu andan sonra geçersiz (Türkiye saatiyle seçilen günün sonu)
  usageLimit: number | null; // toplam kullanım sınırı (yoksa sınırsız)
  used: number; // ayrılmış + kesinleşmiş kullanım sayısı
  minSubtotal: number; // en az sepet (ürün ara toplamı) tutarı; 0 = yok
  onePerCustomer: boolean; // aynı müşteri (hesap ya da misafir e-postası) bir kez kullanır
  allowGuests: boolean; // misafir (giriş yapmamış) müşteri kullanabilir mi
  active: boolean;
  createdAt: Date;
};

// Siparişe yazılan kupon bilgisi (anlık kopya).
export type OrderCoupon = { code: string; type: CouponType; amount: number };

export const COUPON_LIMITS = { codeMin: 3, codeMax: 20, percentMax: 90, fixedMax: 100_000, usageMax: 100_000, minSubtotalMax: 1_000_000 };

export const normalizeCode = (input: string) => input.replace(/\s+/g, "").toLocaleUpperCase("tr").replace(/İ/g, "I");

export function discountFor(coupon: Pick<Coupon, "type" | "amount">, subtotal: number): number {
  if (subtotal <= 0) return 0;
  const raw = coupon.type === "percent" ? Math.floor((subtotal * coupon.amount) / 100) : coupon.amount;
  return Math.max(0, Math.min(raw, subtotal));
}

export const couponLabel = (coupon: Pick<Coupon, "type" | "amount">) =>
  coupon.type === "percent" ? `%${coupon.amount} indirim` : `${coupon.amount.toLocaleString("tr-TR")} TL indirim`;

// ---------- Yönetim formu ----------

export type CouponFormValues = {
  code: string;
  type: string;
  amount: string;
  endsOn: string; // YYYY-AA-GG (tarih kutusu)
  usageLimit: string; // boş = sınırsız
  minSubtotal: string; // boş ya da 0 = yok
  onePerCustomer: boolean;
  allowGuests: boolean;
  active: boolean;
};
export type CouponField = keyof CouponFormValues;
export type CouponFormState =
  | { values?: CouponFormValues; errors?: Partial<Record<CouponField, string>>; message?: string; saved?: boolean }
  | undefined;
export type CouponData = Omit<Coupon, "id" | "used" | "createdAt">;

export const EMPTY_COUPON: CouponFormValues = {
  code: "",
  type: "percent",
  amount: "",
  endsOn: "",
  usageLimit: "",
  minSubtotal: "",
  onePerCustomer: true,
  allowGuests: true,
  active: true,
};

// Türkiye saatiyle seçilen günün sonu (23:59:59.999, UTC+3; Türkiye'de yaz saati yok).
export const endOfDayIstanbul = (day: string) => new Date(`${day}T23:59:59.999+03:00`);
export const dayOf = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(date); // YYYY-AA-GG

export function couponValues(coupon: Coupon): CouponFormValues {
  return {
    code: coupon.code,
    type: coupon.type,
    amount: String(coupon.amount),
    endsOn: dayOf(coupon.endsAt),
    usageLimit: coupon.usageLimit === null ? "" : String(coupon.usageLimit),
    minSubtotal: coupon.minSubtotal ? String(coupon.minSubtotal) : "",
    onePerCustomer: coupon.onePerCustomer,
    allowGuests: coupon.allowGuests,
    active: coupon.active,
  };
}

const wholeNumber = (text: string) => (/^\d{1,9}$/.test(text.replace(/[.\s]/g, "")) ? Number(text.replace(/[.\s]/g, "")) : null);

export function readCouponForm(formData: FormData, today = dayOf(new Date())): {
  values: CouponFormValues;
  errors: Partial<Record<CouponField, string>>;
  data?: CouponData;
} {
  const values: CouponFormValues = {
    code: normalizeCode(oneLine(formData.get("code"))),
    type: oneLine(formData.get("type")),
    amount: oneLine(formData.get("amount")),
    endsOn: oneLine(formData.get("endsOn")),
    usageLimit: oneLine(formData.get("usageLimit")),
    minSubtotal: oneLine(formData.get("minSubtotal")),
    onePerCustomer: formData.get("onePerCustomer") === "on",
    allowGuests: formData.get("allowGuests") === "on",
    active: formData.get("active") === "on",
  };
  const errors: Partial<Record<CouponField, string>> = {};
  const L = COUPON_LIMITS;

  if (!values.code) errors.code = "Kupon kodunu yazın.";
  else if (!new RegExp(`^[A-Z0-9-]{${L.codeMin},${L.codeMax}}$`).test(values.code)) {
    errors.code = `Kod ${L.codeMin}–${L.codeMax} karakter olmalı; yalnız harf (A–Z), rakam ve tire.`;
  }

  const type = values.type === "percent" || values.type === "fixed" ? values.type : null;
  if (!type) errors.type = "İndirim türünü seçin.";

  const amount = type === "fixed" ? parseLira(values.amount) : wholeNumber(values.amount);
  if (!values.amount) errors.amount = "İndirim miktarını yazın.";
  else if (amount === null || amount < 1) errors.amount = "Miktarı 1 ya da daha büyük bir tam sayı olarak yazın.";
  else if (type === "percent" && amount > L.percentMax) errors.amount = `Yüzde indirim en çok %${L.percentMax} olabilir.`;
  else if (type === "fixed" && amount > L.fixedMax) errors.amount = `Sabit indirim en çok ${L.fixedMax.toLocaleString("tr-TR")} TL olabilir.`;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.endsOn) || Number.isNaN(endOfDayIstanbul(values.endsOn).getTime())) {
    errors.endsOn = "Bitiş tarihini seçin.";
  } else if (values.endsOn < today) {
    errors.endsOn = "Bitiş tarihi geçmişte olamaz.";
  }

  let usageLimit: number | null = null;
  if (values.usageLimit) {
    usageLimit = wholeNumber(values.usageLimit);
    if (usageLimit === null || usageLimit < 1 || usageLimit > L.usageMax) {
      errors.usageLimit = `Kullanım sınırı 1 ile ${L.usageMax.toLocaleString("tr-TR")} arasında olmalı (sınırsız için boş bırakın).`;
    }
  }

  let minSubtotal = 0;
  if (values.minSubtotal) {
    const parsed = parseLira(values.minSubtotal);
    if (parsed === null || parsed > L.minSubtotalMax) {
      errors.minSubtotal = "En az sepet tutarını tam lira olarak yazın (yoksa boş bırakın).";
    } else minSubtotal = parsed;
  }

  if (Object.keys(errors).length > 0 || !type || amount === null) return { values, errors };
  return {
    values,
    errors,
    data: {
      code: values.code,
      type,
      amount,
      endsAt: endOfDayIstanbul(values.endsOn),
      usageLimit,
      minSubtotal,
      onePerCustomer: values.onePerCustomer,
      allowGuests: values.allowGuests,
      active: values.active,
    },
  };
}
