// Sipariş sorgulama formunun alanları ve denetimi. Sunucu eyleminde ve formda kullanılır (tarayıcıya yalnızca
// türler gider). Burada yalnız yazım biçimi denetlenir: sipariş var mı yok mu bilgisi hiçbir iletiye girmez.
import { EMAIL_ERROR, EMAIL_MAX, isEmail } from "./email";
import { oneLine } from "./form-text";
import { parseOrderNumber } from "./order-ids";

// Formda geri gösterilecek değerler; aşırı uzun girdi sayfaya olduğu gibi geri yazılmasın diye kırpılır.
const ECHO_NUMBER_MAX = 40;

export type LookupValues = { number: string; email: string };
export type LookupField = keyof LookupValues;
export type LookupErrors = Partial<Record<LookupField, string>>;

export type LookupState =
  | {
      values?: LookupValues; // son gönderilen değerler
      errors?: LookupErrors; // yazım hatası (alan başına)
      message?: string; // genel ileti: bulunamadı, çok fazla deneme, sunucu hatası
    }
  | undefined;

// Numara yok da olsa, e-posta yanlış da olsa AYNI ileti çıkar; hangisinin yanlış olduğu söylenmez.
export const LOOKUP_NOT_FOUND =
  "Bu bilgilerle bir sipariş bulamadık. Sipariş numarasını ve sipariş verirken yazdığınız e-posta adresini kontrol edin.";
export const LOOKUP_TOO_MANY = "Kısa sürede çok fazla deneme yapıldı. Biraz bekleyip yeniden deneyin.";
export const LOOKUP_FAILED = "Sorgulama şu an yapılamıyor. Biraz sonra yeniden deneyin.";

const NUMBER_ERROR =
  "Sipariş numarası TA-7KQ2-X9DM gibi yazılır. Sipariş sayfanızın üstünde ve bizden aldığınız mesajlarda yer alır.";

const clip = (text: string, max: number) => [...text].slice(0, max).join("");

export function readLookupForm(formData: FormData): {
  values: LookupValues;
  errors: LookupErrors;
  data?: { number: string; email: string };
} {
  const rawNumber = oneLine(formData.get("siparis-no"));
  const email = oneLine(formData.get("eposta")).toLowerCase(); // siparişte de küçük harfle saklanır
  const number = parseOrderNumber(rawNumber);

  const values: LookupValues = {
    number: number ?? clip(rawNumber, ECHO_NUMBER_MAX),
    email: clip(email, EMAIL_MAX),
  };
  const errors: LookupErrors = {};
  if (!rawNumber) errors.number = "Sipariş numarasını yazın.";
  else if (!number) errors.number = NUMBER_ERROR;
  if (!email) errors.email = "E-posta adresini yazın.";
  else if (!isEmail(email)) errors.email = EMAIL_ERROR;

  if (Object.keys(errors).length > 0 || !number) return { values, errors };
  return { values, errors, data: { number, email } };
}
