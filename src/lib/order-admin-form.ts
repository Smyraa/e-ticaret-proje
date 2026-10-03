// Siparişler sayfasının formları: kargo bilgisi, yönetici notu ve işlem komutu okuma. Doğrulama sunucuda yapılır.
import { charCount, multiLine, oneLine, tooLong } from "./form-text";
import { COMMANDS, type OrderCommand } from "./order-status";

export const ADMIN_LIMITS = { carrier: 40, tracking: 60, note: 1000 } as const;

// İşlem düğmelerinin ve formların sonucu. problems: stok yetmediğinde ürün başına açıklama.
export type OrderActionState =
  | {
      message?: string;
      error?: string;
      problems?: string[];
      errors?: { carrier?: string; trackingNumber?: string };
      values?: { carrier: string; trackingNumber: string };
    }
  | undefined;

// Formdaki "islem" alanı bilinen komutlardan biri değilse null.
export function readCommand(formData: FormData): OrderCommand | null {
  const value = oneLine(formData.get("islem"));
  return (COMMANDS as string[]).includes(value) ? (value as OrderCommand) : null;
}

// Kargoya verme formu: firma zorunlu, takip numarası isteğe bağlı (elden teslim gibi durumlar için).
export function readShipForm(formData: FormData): {
  values: { carrier: string; trackingNumber: string };
  errors: { carrier?: string; trackingNumber?: string };
  data?: { carrier: string; trackingNumber: string };
} {
  const values = {
    carrier: oneLine(formData.get("kargo-firmasi")),
    trackingNumber: oneLine(formData.get("takip-no")),
  };
  const errors: { carrier?: string; trackingNumber?: string } = {};

  if (!values.carrier) errors.carrier = "Kargo firmasını yazın (elden teslimse “Elden” yazabilirsiniz).";
  else if (charCount(values.carrier) > ADMIN_LIMITS.carrier) errors.carrier = tooLong(ADMIN_LIMITS.carrier, values.carrier);
  if (charCount(values.trackingNumber) > ADMIN_LIMITS.tracking) {
    errors.trackingNumber = tooLong(ADMIN_LIMITS.tracking, values.trackingNumber);
  }

  return Object.keys(errors).length > 0 ? { values, errors } : { values, errors, data: values };
}

// Yönetici notu: çok satırlı, isteğe bağlı (boş not notu siler).
export function readAdminNote(formData: FormData): { note: string; error?: string } {
  const note = multiLine(formData.get("not"));
  if (charCount(note) > ADMIN_LIMITS.note) return { note, error: tooLong(ADMIN_LIMITS.note, note) };
  return { note };
}
