import "server-only";

import { createHash } from "node:crypto";
import { isEmail } from "./email";
import type { MailKind, MailMessage, MailRecord, MailSetup, MailStatus } from "./mail-model";
import { getDb } from "./mongodb";
import { allowRequest } from "./rate-limit";

// E-posta katmanı. Sipariş bildirimleri buradan geçer: gönderim bir "taşıyıcı"ya (transport) bırakılır ve her e-posta
// "mails" koleksiyonuna kaydedilir (yönetimde sipariş sayfasında görünür). Taşıyıcı MAIL_TRANSPORT ortam değişkeniyle
// seçilir. Şimdilik yalnız "log" var: e-posta GÖNDERİLMEZ, yalnız kaydedilir (gerçek bir e-posta hizmeti seçilene
// kadar). Hizmet seçilince buraya yeni bir taşıyıcı eklenir; e-postayı hazırlayan ve çağıran kodlar değişmez.
// sendMail hiçbir zaman hata fırlatmaz: e-posta sorunu siparişi bozmamalı.

type Transport = (mail: MailMessage) => Promise<"logged" | "sent">;

const transports: Record<string, Transport> = {
  log: async () => "logged",
};

const transportName = () => process.env.MAIL_TRANSPORT?.trim() || "log";

export function mailSetup(): MailSetup {
  const name = transportName();
  if (name === "log") return { mode: "log", name };
  return { mode: Object.hasOwn(transports, name) ? "live" : "invalid", name };
}

// Kayıtlar 60 gün sonra kendiliğinden silinir (içlerinde kişisel bilgi olabilir).
const KEEP_DAYS = 60;
// Müşterilere giden e-postalar için alıcı başına sınır: başkasının adresiyle art arda sipariş verip ona e-posta yağdırmayı
// (ve gönderen adresin kara listeye girmesini) engeller.
const CUSTOMER_KINDS = new Set<MailKind>(["order-received", "order-shipped"]);
const PER_RECIPIENT = 6;
const RECIPIENT_WINDOW_MINUTES = 60;
const TEXT_MAX = 20_000;

class MailError extends Error {}

let indexesReady: Promise<void> | undefined;
function ensureIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    const mails = (await getDb()).collection("mails");
    await Promise.all([
      mails.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 }),
      mails.createIndex({ orderNumber: 1, createdAt: -1 }),
    ]);
  })().catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  return indexesReady;
}

const mailsOf = async () => (await getDb()).collection<MailRecord>("mails");
const hasLineBreak = (value: string) => /[\r\n]/.test(value);
const recipientKey = (address: string) => `posta|${createHash("sha256").update(address).digest("hex").slice(0, 32)}`;

async function deliver(mail: MailMessage): Promise<"logged" | "sent"> {
  if (!isEmail(mail.to)) throw new MailError("Alıcı adresi geçersiz.");
  if (mail.replyTo && !isEmail(mail.replyTo)) throw new MailError("Yanıt adresi geçersiz.");
  if (hasLineBreak(mail.to) || hasLineBreak(mail.subject) || hasLineBreak(mail.replyTo ?? "")) {
    throw new MailError("E-posta başlıklarında satır sonu olamaz.");
  }
  if (mail.text.length > TEXT_MAX) throw new MailError("E-posta içeriği çok uzun.");

  if (
    CUSTOMER_KINDS.has(mail.kind) &&
    !(await allowRequest(recipientKey(mail.to), PER_RECIPIENT, RECIPIENT_WINDOW_MINUTES))
  ) {
    throw new MailError("Bu alıcıya kısa sürede çok fazla e-posta gönderildi; bu e-posta gönderilmedi.");
  }

  const name = transportName();
  if (!Object.hasOwn(transports, name)) throw new MailError(`E-posta taşıyıcısı tanımlı değil: ${name}`);
  return transports[name](mail);
}

async function record(mail: Omit<MailMessage, "text"> & { text?: string }, status: MailStatus, error?: string) {
  await ensureIndexes();
  const now = new Date();
  await (await mailsOf()).insertOne({
    kind: mail.kind,
    orderNumber: mail.orderNumber,
    to: mail.to,
    ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    subject: mail.subject,
    ...(status === "logged" && mail.text ? { text: mail.text } : {}),
    status,
    ...(error ? { error } : {}),
    createdAt: now,
    expireAt: new Date(now.getTime() + KEEP_DAYS * 86_400_000),
  });
}

// E-postayı gönderir (ya da kayıt modunda yalnız kaydeder) ve sonucu "mails" koleksiyonuna yazar. Hata fırlatmaz.
export async function sendMail(mail: MailMessage): Promise<MailStatus> {
  let status: MailStatus = "failed";
  let error: string | undefined;
  try {
    status = await deliver(mail);
  } catch (failure) {
    if (failure instanceof MailError) {
      error = failure.message;
    } else {
      console.error(`E-posta taşıyıcısı hata verdi (${mail.kind}, ${mail.orderNumber})`, failure);
      error = "Gönderim sırasında beklenmeyen bir hata oluştu.";
    }
  }
  if (status === "failed") console.error(`E-posta gönderilemedi (${mail.kind}, ${mail.orderNumber}): ${error}`);
  try {
    await record(mail, status, error);
  } catch (failure) {
    console.error(`E-posta kaydı yazılamadı (${mail.kind}, ${mail.orderNumber})`, failure);
  }
  return status;
}

// Gönderilemeyeceği baştan belli olan bir e-postayı (örn. bildirim adresi ayarlanmamış) başarısız olarak kaydeder.
export async function recordMailFailure(info: {
  kind: MailKind;
  orderNumber: string;
  subject: string;
  error: string;
}): Promise<void> {
  try {
    await record({ kind: info.kind, orderNumber: info.orderNumber, to: "", subject: info.subject }, "failed", info.error);
  } catch (failure) {
    console.error(`E-posta kaydı yazılamadı (${info.kind}, ${info.orderNumber})`, failure);
  }
}

export type MailListItem = MailRecord & { id: string };

// Bir siparişin e-posta kayıtları, yeniden eskiye. Yalnız yönetim sayfası kullanır.
export async function listMailsForOrder(orderNumber: string): Promise<MailListItem[]> {
  const docs = await (await mailsOf()).find({ orderNumber }).sort({ createdAt: -1, _id: -1 }).toArray();
  return docs.map(({ _id, ...rest }) => ({ id: String(_id), ...rest }));
}

// Silinen siparişlerin e-posta kayıtlarını da siler (içlerinde müşterinin bilgileri var).
export async function deleteMailsForOrders(orderNumbers: string[]): Promise<void> {
  if (orderNumbers.length === 0) return;
  await (await mailsOf()).deleteMany({ orderNumber: { $in: orderNumbers } });
}
