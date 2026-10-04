import "server-only";

import { readIyzicoEnv, type IyzicoEnv } from "./payment-config";
import { PaymentError } from "./payment-error";
import {
  amountText,
  authorizationHeaders,
  buildInitializeBody,
  CANCEL_PATH,
  cleanIp,
  DETAIL_PATH,
  INITIALIZE_PATH,
  interpretDetail,
  interpretInitialize,
  parseRefundReference,
  refundFailure,
  REFUND_PATH,
  sanitizeReason,
} from "./payment-iyzico-core";
import { PAYMENT_SESSION_MINUTES } from "./payment-model";
import type { PaymentProvider } from "./payment-provider";

// iyzico "Ödeme Formu" (Checkout Form) bağdaştırıcısı: müşteri iyzico'nun barındırdığı ödeme sayfasına yönlendirilir (kart bilgisi
// sitemize hiç gelmez); ödeme sonrası dönüşte sonuç iyzico'dan SUNUCUDAN sorulur. Saf kısımlar payment-iyzico-core.ts'te.
// Biçimler resmî belgelerden okundu; gerçek sandbox anahtarıyla henüz DENENMEDİ.

const TIMEOUT_MS = 15_000;

function config(): IyzicoEnv {
  const result = readIyzicoEnv();
  if (!result.ok) throw new PaymentError(`iyzico ayarı hatalı: ${result.problem}`);
  return result.env;
}

// iyzico'ya imzalı bir POST gönderir ve JSON yanıtı verir (HTTP 4xx'te de iyzico JSON döndürür). Ağ hatası ve JSON olmayan
// yanıt PaymentError olur. Gövde ve anahtarlar günlüğe yazılmaz.
async function call(env: IyzicoEnv, path: string, body: Record<string, unknown>): Promise<unknown> {
  const text = JSON.stringify(body);
  let response: Response;
  try {
    response = await fetch(env.baseUrl + path, {
      method: "POST",
      headers: authorizationHeaders(env.apiKey, env.secretKey, path, text),
      body: text,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new PaymentError("iyzico'ya ulaşılamadı", { cause: error });
  }
  const raw = await response.text();
  try {
    return JSON.parse(raw);
  } catch {
    throw new PaymentError(`iyzico geçersiz yanıt verdi (HTTP ${response.status})`);
  }
}

export const iyzicoProvider: PaymentProvider = {
  name: "iyzico",

  // Gerçek para çeken ortam mı? Ayar okunamazsa güvenli tarafta kalınır (gerçek sayılır).
  get live() {
    const result = readIyzicoEnv();
    return result.ok ? !result.env.sandbox : true;
  },

  async start({ order, conversationId, callbackUrl, ip }) {
    const env = config();
    const body = buildInitializeBody(order, { conversationId, callbackUrl, ip: cleanIp(ip) });
    const json = await call(env, INITIALIZE_PATH, body);
    const { token, pageUrl } = interpretInitialize(json, env.secretKey, env.baseUrl, conversationId);
    return { token, redirectUrl: pageUrl, expiresAt: new Date(Date.now() + PAYMENT_SESSION_MINUTES * 60_000) };
  },

  async verify(payment) {
    const env = config();
    const json = await call(env, DETAIL_PATH, { locale: "tr", conversationId: payment.conversationId, token: payment.token });
    if (typeof json === "object" && json !== null && (json as { status?: unknown }).status !== "success") {
      const { errorCode, errorMessage } = json as { errorCode?: unknown; errorMessage?: unknown };
      console.warn(
        `iyzico sonuç sorgusu başarılı dönmedi (${payment.orderNumber}): ${sanitizeReason(errorCode, 20)} ${sanitizeReason(errorMessage)}`,
      );
    }
    return interpretDetail(json, env.secretKey, { token: payment.token, conversationId: payment.conversationId });
  },

  // Tam iade. Önce iptal denenir (yalnız ödemenin yapıldığı gün olur, müşterinin ekstresinde iz bırakmaz); iyzico iptal etmezse
  // (gün geçmiş) kalem kalem iade edilir. Ulaşılamama PaymentError olur (iade yapılıp yapılmadığı belli değildir).
  async refund(payment) {
    const env = config();
    const reference = parseRefundReference(payment.refundRef);
    if (!reference) return { ok: false, error: "Ödeme kaydında iade bilgisi yok; iadeyi iyzico panelinden yapın." };

    const cancelled = await call(env, CANCEL_PATH, { locale: "tr", conversationId: payment.conversationId, paymentId: reference.paymentId });
    if (refundFailure(cancelled) === null) return { ok: true };
    if (reference.items.length === 0) {
      return { ok: false, error: "Ödeme kaydında kalem bilgisi yok; iadeyi iyzico panelinden yapın." };
    }

    for (const item of reference.items) {
      const refunded = await call(env, REFUND_PATH, {
        locale: "tr",
        conversationId: payment.conversationId,
        paymentTransactionId: item.id,
        price: amountText(item.price),
        currency: "TRY",
      });
      const failure = refundFailure(refunded);
      if (failure) return { ok: false, error: failure };
    }
    return { ok: true };
  },
};
