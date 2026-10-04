import "server-only";

import { paymentSetup } from "./payment-config";
import { fakeProvider } from "./payment-fake";
import type { ProviderName } from "./payment-model";
import type { PaymentProvider } from "./payment-provider";

// Kurulu ödeme kuruluşları. iyzico bağlandığında buraya eklenir.
const providers: Partial<Record<ProviderName, PaymentProvider>> = { fake: fakeProvider };

export function getProvider(name: ProviderName): PaymentProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Ödeme sağlayıcısı kurulu değil: ${name}`);
  // Deneme sağlayıcısı yalnız ayar açıkça "fake" iken (ve adres yerelken) çalışır. Başka bir ayarda, veritabanında kalmış
  // eski deneme ödemeleri bile ona başvuramaz: sahte bir ödeme gerçek bir siparişi "ödendi" yapamaz.
  if (name === "fake" && paymentSetup().mode !== "fake") throw new Error("Deneme ödeme sağlayıcısı kapalı.");
  return provider;
}

// Müşterilerden şu an ödeme almak için kullanılan kuruluş (ayar kapalı ya da hatalıysa null).
export function activeProvider(): PaymentProvider | null {
  const setup = paymentSetup();
  return setup.mode === "fake" || setup.mode === "iyzico" ? getProvider(setup.mode) : null;
}
