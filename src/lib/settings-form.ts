// Site ayarları formunun alanları, doğrulaması ve durum türleri. Sunucu eyleminde ve formda kullanılır
// (tarayıcıya yalnızca türler gider). Doğrulama sunucuda yapılır.
import { charCount, multiLine, oneLine, tooLong } from "./form-text";
import { parseLira } from "./money";
import { formatPhone, normalizePhone } from "./phone";
import type { SiteSettings } from "./settings";

export const SETTINGS_LIMITS = { email: 120, address: 300, hours: 120, shippingMax: 10_000 } as const;

// Formdaki alanlar; kullanıcının yazdığı gibi (metin) tutulur ki hata sonrası yazdıkları geri gelsin.
export type SettingsValues = {
  whatsapp: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  shippingFee: string;
};

export type SettingsField = keyof SettingsValues;
export type SettingsErrors = Partial<Record<SettingsField, string>>;

export type SettingsFormState =
  | {
      values?: SettingsValues; // son gönderilen (düzeltilmiş) değerler
      errors?: SettingsErrors; // alan başına hata iletisi
      message?: string; // genel hata
      saved?: boolean; // değişiklikler kaydedildi
    }
  | undefined;

// Doğrulanmış, veritabanına yazılmaya hazır ayarlar (ana sayfa görseli ayrı yönetilir).
export type SettingsData = Omit<SiteSettings, "heroImage">;

// Kayıtlı ayarları forma yazılacak biçime çevirir (telefonlar okunaklı: "+90 555 111 22 33").
export function settingsValues(settings: SiteSettings): SettingsValues {
  return {
    whatsapp: formatPhone(settings.whatsapp),
    phone: formatPhone(settings.phone),
    email: settings.email,
    address: settings.address,
    hours: settings.hours,
    shippingFee: String(settings.shippingFee),
  };
}

const PHONE_ERROR = "Numarayı ülke koduyla ya da başında 0 ile yazın (örn. 0555 111 22 33).";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function readSettingsForm(formData: FormData): {
  values: SettingsValues;
  errors: SettingsErrors;
  data?: SettingsData;
} {
  const values: SettingsValues = {
    whatsapp: oneLine(formData.get("whatsapp")),
    phone: oneLine(formData.get("phone")),
    email: oneLine(formData.get("email")).toLowerCase(),
    address: multiLine(formData.get("address")),
    hours: oneLine(formData.get("hours")),
    shippingFee: oneLine(formData.get("shippingFee")),
  };
  const errors: SettingsErrors = {};

  const whatsapp = normalizePhone(values.whatsapp);
  if (whatsapp === null) errors.whatsapp = PHONE_ERROR;
  const phone = normalizePhone(values.phone);
  if (phone === null) errors.phone = PHONE_ERROR;

  if (values.email && (values.email.length > SETTINGS_LIMITS.email || !EMAIL_PATTERN.test(values.email))) {
    errors.email = "Geçerli bir e-posta adresi yazın (örn. ad@ornek.com).";
  }
  if (charCount(values.address) > SETTINGS_LIMITS.address) errors.address = tooLong(SETTINGS_LIMITS.address, values.address);
  if (charCount(values.hours) > SETTINGS_LIMITS.hours) errors.hours = tooLong(SETTINGS_LIMITS.hours, values.hours);

  const fee = parseLira(values.shippingFee);
  if (!values.shippingFee) errors.shippingFee = "Kargo ücretini yazın (ücretsiz için 0).";
  else if (fee === null) errors.shippingFee = "Kargo ücretini tam lira olarak, yalnız rakamla yazın (ücretsiz için 0).";
  else if (fee > SETTINGS_LIMITS.shippingMax) {
    errors.shippingFee = `Kargo ücreti en çok ${SETTINGS_LIMITS.shippingMax.toLocaleString("tr-TR")} TL olabilir.`;
  }

  if (Object.keys(errors).length > 0 || whatsapp === null || phone === null || fee === null) {
    return { values, errors };
  }

  return {
    values,
    errors,
    data: {
      whatsapp,
      phone,
      email: values.email,
      address: values.address,
      hours: values.hours,
      shippingFee: fee,
    },
  };
}
