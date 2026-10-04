import "server-only";

import { randomBytes } from "node:crypto";
import { getDb } from "./mongodb";
import { PAYMENT_SESSION_MINUTES, PAYMENT_TOKEN_PATTERN, type PaymentRecord } from "./payment-model";
import { PaymentError, type PaymentProvider } from "./payment-provider";

// Deneme ödeme sağlayıcısı: GERÇEK BİR KURULUŞ DEĞİLDİR. Yalnız yerelde çalışır (bkz. payment-config.ts) ve ödeme akışının
// tamamını hesapsız denemeye yarar: müşteri kendi sitemizdeki bir deneme sayfasına gider, orada "onayla / reddet / vazgeç"
// der; sonuç gerçek kuruluşlardaki gibi sunucu tarafında sorulur (verify), tarayıcının söylediğine güvenilmez.
// Oturumlar "fakePayments" koleksiyonunda tutulur ve 7 gün sonra kendiliğinden silinir.

export type FakeDecision = "approve" | "decline" | "cancel";

type FakeSession = {
  _id: string; // oturum anahtarı
  orderNumber: string;
  amount: number;
  createdAt: Date;
  decision?: FakeDecision;
  decidedAt?: Date;
  paidAmount?: number; // yalnız testler için: onaylanan tutarı değiştirmek (tutar uyuşmazlığı denemesi)
  refundFails?: boolean; // yalnız testler için: iade başarısız olsun
  refundedAt?: Date;
};

const KEEP_DAYS = 7;

const sessionsOf = async () => (await getDb()).collection<FakeSession>("fakePayments");

let indexReady: Promise<void> | undefined;
function ensureIndex(): Promise<void> {
  indexReady ??= (async () => {
    await (await sessionsOf()).createIndex({ createdAt: 1 }, { expireAfterSeconds: KEEP_DAYS * 86_400 });
  })().catch((error) => {
    indexReady = undefined;
    throw error;
  });
  return indexReady;
}

export const fakeProvider: PaymentProvider = {
  name: "fake",
  live: false,

  async start({ order }) {
    await ensureIndex();
    const token = randomBytes(24).toString("base64url");
    await (await sessionsOf()).insertOne({ _id: token, orderNumber: order.number, amount: order.total, createdAt: new Date() });
    return {
      token,
      redirectUrl: `/odeme/deneme/${token}`,
      expiresAt: new Date(Date.now() + PAYMENT_SESSION_MINUTES * 60_000),
    };
  },

  async verify(payment: PaymentRecord) {
    const session = await (await sessionsOf()).findOne({ _id: payment.token });
    if (!session) throw new PaymentError("Deneme ödeme oturumu bulunamadı.");
    switch (session.decision) {
      case "approve":
        return {
          outcome: "paid",
          providerPaymentId: `fake-${payment.token.slice(0, 12)}`,
          paidAmount: session.paidAmount ?? session.amount,
          orderNumber: session.orderNumber,
        };
      case "decline":
        return { outcome: "failed", reason: "Kart reddedildi (deneme)." };
      case "cancel":
        return { outcome: "failed", reason: "Ödeme sayfasından vazgeçildi." };
      default:
        return { outcome: "pending" };
    }
  },

  async refund(payment: PaymentRecord) {
    const sessions = await sessionsOf();
    const session = await sessions.findOne({ _id: payment.token });
    if (!session) return { ok: false, error: "Deneme ödeme oturumu bulunamadı." };
    if (session.refundFails) return { ok: false, error: "Deneme iadesi bilerek başarısız yapıldı." };
    await sessions.updateOne({ _id: payment.token }, { $set: { refundedAt: new Date() } });
    return { ok: true };
  },
};

// Deneme ödeme sayfası için: oturumun özeti (anahtar biçimi tutmuyorsa ya da oturum yoksa null).
export async function getFakeSession(token: string) {
  if (!PAYMENT_TOKEN_PATTERN.test(token)) return null;
  const session = await (await sessionsOf()).findOne({ _id: token });
  if (!session) return null;
  return { orderNumber: session.orderNumber, amount: session.amount, decision: session.decision ?? null };
}

// Müşterinin deneme sayfasındaki seçimini kaydeder. Bir oturuma yalnız bir kez karar verilir.
export async function decideFake(token: string, decision: FakeDecision): Promise<"ok" | "missing" | "decided"> {
  if (!PAYMENT_TOKEN_PATTERN.test(token)) return "missing";
  const sessions = await sessionsOf();
  const result = await sessions.updateOne(
    { _id: token, decision: { $exists: false } },
    { $set: { decision, decidedAt: new Date() } },
  );
  if (result.matchedCount === 1) return "ok";
  return (await sessions.countDocuments({ _id: token })) === 1 ? "decided" : "missing";
}
