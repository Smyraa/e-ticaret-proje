import "server-only";

import { paymentSetup } from "./payment-config";
import { fakeProvider } from "./payment-fake";
import { iyzicoProvider } from "./payment-iyzico";
import type { ProviderName } from "./payment-model";
import type { PaymentProvider } from "./payment-provider";

// Kurulu ödeme kuruluşları.
const providers: Record<ProviderName, PaymentProvider> = { fake: fakeProvider, iyzico: iyzicoProvider };

export function getProvider(name: ProviderName): PaymentProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Ödeme sağlayıcısı kurulu değil: ${name}`);
  // Bir kuruluş yalnız ayar onu açıkça seçmişken çalışır. Başka bir ayarda, veritabanında kalmış eski ödemeler bile ona
  // başvuramaz: deneme sağlayıcısıyla (yerel olmayan bir adreste) sahte ödeme siparişi "ödendi" yapamaz.
  if (paymentSetup().mode !== name) throw new Error(`Ödeme sağlayıcısı şu an kapalı: ${name}`);
  return provider;
}

// Müşterilerden şu an ödeme almak için kullanılan kuruluş (ayar kapalı ya da hatalıysa null).
export function activeProvider(): PaymentProvider | null {
  const setup = paymentSetup();
  return setup.mode === "fake" || setup.mode === "iyzico" ? getProvider(setup.mode) : null;
}
