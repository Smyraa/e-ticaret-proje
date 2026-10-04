"use server";

import { redirect } from "next/navigation";
import { clientAddress } from "@/lib/client-address";
import {
  LOOKUP_FAILED,
  LOOKUP_NOT_FOUND,
  LOOKUP_TOO_MANY,
  readLookupForm,
  type LookupState,
} from "@/lib/order-lookup-form";
import { findTrackKey } from "@/lib/orders";
import { allowRequest } from "@/lib/rate-limit";

// Deneme sınırları (15 dakikada): aynı bağlantı adresinden en çok 10, aynı sipariş numarasına en çok 8 sorgu.
// İkincisi, adresi taklit eden ya da sürekli değiştiren birinin tek bir siparişin e-postasını tahmin etmesini engeller
// (bkz. clientAddress: adres tek başına güvenilir bir ölçüt değildir). Numara uzayı çok geniş olduğundan (31^8) başka
// bir siparişi "tutturmak" bu sınırlarla zaten pratikte imkânsızdır.
const PER_ADDRESS = 10;
const PER_ORDER = 8;
const WINDOW_MINUTES = 15;

// Sipariş sorgulama: numara + e-posta doğruysa müşteri, siparişinin gizli adresli sayfasına yönlenir (üyelik yok;
// adresini kaybeden müşteri siparişine böyle ulaşır). Numara yoksa da e-posta yanlışsa da aynı ileti çıkar.
export async function lookupOrder(_state: LookupState, formData: FormData): Promise<LookupState> {
  const form = readLookupForm(formData);
  if (!form.data) return { values: form.values, errors: form.errors };
  const { values, data } = form;

  let trackKey: string | null;
  try {
    // Önce adresin hakkı alınır; adres kilitliyse sipariş sayacına dokunulmaz.
    const allowed =
      (await allowRequest(`sorgu|${await clientAddress()}`, PER_ADDRESS, WINDOW_MINUTES)) &&
      (await allowRequest(`sorgu-no|${data.number}`, PER_ORDER, WINDOW_MINUTES));
    if (!allowed) return { values, message: LOOKUP_TOO_MANY };
    trackKey = await findTrackKey(data.number, data.email);
  } catch (error) {
    console.error("Sipariş sorgulanamadı", error);
    return { values, message: LOOKUP_FAILED };
  }
  if (!trackKey) return { values, message: LOOKUP_NOT_FOUND };

  redirect(`/siparis/${trackKey}`);
}
