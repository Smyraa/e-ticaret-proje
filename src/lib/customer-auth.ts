import "server-only";

import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { cache } from "react";
import {
  clearFailures,
  hashToken,
  lockedMessage,
  releaseAttempt,
  reserveAttempt,
  sessionCookieOptions,
} from "./auth";
import { EMPTY_CART, parseCart, type Cart } from "./cart-model";
import { clientAddress } from "./client-address";
import { isEmail } from "./email";
import { parseFavorites } from "./favorites-model";
import { getDb } from "./mongodb";
import {
  CUSTOMER_PASSWORD_MIN_LENGTH,
  hashPassword,
  passwordProblem,
  verifyAgainstDummy,
  verifyPassword,
} from "./password";
import { allowRequest } from "./rate-limit";

// Müşteri hesabı (isteğe bağlı; misafir alışveriş de sürer). Yönetici girişiyle aynı yöntem (e-posta + parola, özeti
// saklanan rastgele oturum anahtarı) ama AYRI koleksiyonlarda ve AYRI çerezde: müşteri hesabı hiçbir durumda yönetime
// giremez. Favoriler ve sepet de hesapta durur (giriş yapınca tarayıcıdakilerle birleşir, bkz. account-sync.tsx).

export const CUSTOMER_COOKIE = "taura_musteri";
const SESSION_DAYS = 30;
const MAX_FAILURES = 5; // aynı e-posta + aynı bağlantı adresinden 15 dakikada en çok bu kadar giriş denemesi
const MAX_FAILURES_PER_EMAIL = 20; // adrese bakmadan, aynı e-posta için sınır
const SIGNUPS_PER_HOUR = 5; // aynı bağlantı adresinden saatte en çok bu kadar yeni hesap
export const NAME_MAX = 80;
const FAVORITES_MAX = 200;
const CART_ITEMS_MAX = 50;

type CustomerDoc = {
  _id: ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  favorites: string[];
  cart: Cart;
  createdAt: Date;
  updatedAt: Date;
};
type SessionDoc = { _id: string; customerId: ObjectId; createdAt: Date; expiresAt: Date };

export type Customer = { id: string; email: string; name: string };
export type AccountData = { favorites: string[]; cart: Cart };

let indexesReady: Promise<void> | undefined;
function ensureIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    const db = await getDb();
    await Promise.all([
      db.collection("customers").createIndex({ email: 1 }, { unique: true }),
      db.collection("customerSessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection("customerSessions").createIndex({ customerId: 1 }),
    ]);
  })().catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  return indexesReady;
}

const customersOf = async () => (await getDb()).collection<CustomerDoc>("customers");
const sessionsOf = async () => (await getDb()).collection<SessionDoc>("customerSessions");

async function createSession(customerId: ObjectId) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await (await sessionsOf()).insertOne({ _id: hashToken(token), customerId, createdAt: now, expiresAt });
  (await cookies()).set(CUSTOMER_COOKIE, token, sessionCookieOptions(expiresAt));
}

// Geçerli oturumdaki müşteri; yoksa null. Bir istek içinde tekrar çağrılırsa veritabanına yeniden gitmez.
export const getCustomer = cache(async (): Promise<Customer | null> => {
  const token = (await cookies()).get(CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  const session = await (await sessionsOf()).findOne({ _id: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const customer = await (await customersOf()).findOne(
    { _id: session.customerId },
    { projection: { email: 1, name: 1 } },
  );
  return customer ? { id: customer._id.toHexString(), email: customer.email, name: customer.name } : null;
});

export async function endCustomerSession() {
  const store = await cookies();
  const token = store.get(CUSTOMER_COOKIE)?.value;
  if (token) await (await sessionsOf()).deleteOne({ _id: hashToken(token) });
  store.delete(CUSTOMER_COOKIE);
}

export type AuthResult = { ok: true } | { ok: false; field: "ad" | "eposta" | "parola" | null; message: string };

// Yeni hesap açar ve oturumu başlatır. E-posta küçük harfle gelir.
export async function registerCustomer(name: string, email: string, password: string): Promise<AuthResult> {
  if (!name) return { ok: false, field: "ad", message: "Adınızı yazın." };
  if (name.length > NAME_MAX) return { ok: false, field: "ad", message: `Ad en çok ${NAME_MAX} karakter olabilir.` };
  if (!isEmail(email)) return { ok: false, field: "eposta", message: "Geçerli bir e-posta adresi yazın." };
  const problem = passwordProblem(password, CUSTOMER_PASSWORD_MIN_LENGTH);
  if (problem) return { ok: false, field: "parola", message: problem };

  await ensureIndexes();
  if (!(await allowRequest(`kayit|${await clientAddress()}`, SIGNUPS_PER_HOUR, 60))) {
    return { ok: false, field: null, message: "Kısa sürede çok fazla hesap açıldı. Biraz sonra yeniden deneyin." };
  }

  const now = new Date();
  const doc: CustomerDoc = {
    _id: new ObjectId(),
    email,
    name,
    passwordHash: await hashPassword(password),
    favorites: [],
    cart: EMPTY_CART,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await (await customersOf()).insertOne(doc);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return { ok: false, field: "eposta", message: "Bu e-postayla açılmış bir hesap var. Giriş yapın." };
    }
    throw error;
  }
  await createSession(doc._id);
  return { ok: true };
}

const addressKey = (email: string, address: string) => `musteri-giris|${email}|${address}`;
const emailKey = (email: string) => `musteri-giris-eposta|${email}`;

// Giriş: yönetici girişindeki gibi deneme hakkı parola denenmeden önce ayrılır (bkz. auth.ts).
export async function loginCustomer(email: string, password: string): Promise<AuthResult> {
  const wrong = { ok: false, field: null, message: "E-posta ya da parola hatalı." } as const;
  if (email.length > 254 || password.length > 1024) return wrong;

  await ensureIndexes();
  const byAddress = addressKey(email, await clientAddress());
  const byEmail = emailKey(email);
  const addressLock = await reserveAttempt(byAddress, MAX_FAILURES);
  if (addressLock > 0) return { ok: false, field: null, message: lockedMessage(addressLock) };
  const emailLock = await reserveAttempt(byEmail, MAX_FAILURES_PER_EMAIL);
  if (emailLock > 0) return { ok: false, field: null, message: lockedMessage(emailLock) };

  const customer = await (await customersOf()).findOne({ email });
  let valid = false;
  if (customer) {
    valid = await verifyPassword(password, customer.passwordHash);
  } else {
    await verifyAgainstDummy(password); // kayıtlı olmayan e-postada da aynı süre harcanır
  }
  if (!customer || !valid) return wrong;

  await Promise.all([clearFailures(byAddress), releaseAttempt(byEmail)]);
  await createSession(customer._id);
  return { ok: true };
}

// Gelen veri tarayıcıdan geldiği için güvenilmez: favori ve sepet okuyucularından geçer, boyutu sınırlanır.
const cleanFavorites = (raw: unknown) => parseFavorites(raw).filter((slug) => slug.length <= 100).slice(-FAVORITES_MAX);
function cleanCart(raw: unknown): Cart {
  const cart = parseCart(raw);
  const items = cart.items.filter((item) => item.slug.length <= 100 && item.qty <= 99).slice(0, CART_ITEMS_MAX);
  return items.length === 0 ? EMPTY_CART : { ...cart, items };
}

export async function getAccountData(customerId: string): Promise<AccountData> {
  const doc = await (await customersOf()).findOne(
    { _id: new ObjectId(customerId) },
    { projection: { favorites: 1, cart: 1 } },
  );
  return { favorites: cleanFavorites(doc?.favorites), cart: cleanCart(doc?.cart) };
}

export async function saveAccountData(customerId: string, raw: { favorites: unknown; cart: unknown }): Promise<void> {
  await (await customersOf()).updateOne(
    { _id: new ObjectId(customerId) },
    { $set: { favorites: cleanFavorites(raw.favorites), cart: cleanCart(raw.cart), updatedAt: new Date() } },
  );
}

// Girişten sonra BİR KEZ: tarayıcıdaki favori ve sepet hesaptakilerle birleşir. Aynı ürün iki yerde varsa sepette
// büyük adet alınır (toplanmaz; aynı sepet iki kez sayılmasın). Hediye seçimi, ürünü olan taraftan gelir.
export async function mergeAccountData(
  customerId: string,
  raw: { favorites: unknown; cart: unknown },
): Promise<AccountData> {
  const saved = await getAccountData(customerId);
  const local = { favorites: cleanFavorites(raw.favorites), cart: cleanCart(raw.cart) };

  const favorites = [...new Set([...saved.favorites, ...local.favorites])];
  const quantities = new Map(saved.cart.items.map((item) => [item.slug, item.qty]));
  for (const item of local.cart.items) quantities.set(item.slug, Math.max(quantities.get(item.slug) ?? 0, item.qty));
  const options = local.cart.items.length > 0 ? local.cart : saved.cart;
  const cart = { items: [...quantities].map(([slug, qty]) => ({ slug, qty })), gift: options.gift, note: options.note };

  await saveAccountData(customerId, { favorites, cart });
  return getAccountData(customerId);
}

// ---------- Profil ve güvenlik (Hesabım → Profil ve güvenlik) ----------

export async function updateCustomerName(customerId: string, name: string): Promise<AuthResult> {
  if (!name) return { ok: false, field: "ad", message: "Adınızı yazın." };
  if ([...name].length > NAME_MAX) return { ok: false, field: "ad", message: `Ad en çok ${NAME_MAX} karakter olabilir.` };
  await (await customersOf()).updateOne({ _id: new ObjectId(customerId) }, { $set: { name, updatedAt: new Date() } });
  return { ok: true };
}

const passwordKey = (customerId: string) => `musteri-parola|${customerId}`;

// Parolayı doğrular (yanlış denemeler sınırlı). Doğruysa müşteri kaydını, değilse hatayı döndürür.
async function checkOwnPassword(customerId: string, password: string): Promise<CustomerDoc | AuthResult> {
  const locked = await reserveAttempt(passwordKey(customerId), MAX_FAILURES);
  if (locked > 0) return { ok: false, field: null, message: lockedMessage(locked) };
  const customer = await (await customersOf()).findOne({ _id: new ObjectId(customerId) });
  if (!customer || password.length > 1024 || !(await verifyPassword(password, customer.passwordHash))) {
    return { ok: false, field: "parola", message: "Parola yanlış." };
  }
  await clearFailures(passwordKey(customerId));
  return customer;
}
const isFailure = (value: CustomerDoc | AuthResult): value is AuthResult => "ok" in value;

// Parola değişince bu müşterinin TÜM oturumları kapanır, bu tarayıcıya yeni oturum verilir.
export async function changeCustomerPassword(customerId: string, current: string, next: string): Promise<AuthResult> {
  const problem = passwordProblem(next, CUSTOMER_PASSWORD_MIN_LENGTH);
  if (problem) return { ok: false, field: null, message: problem };
  if (next === current) return { ok: false, field: null, message: "Yeni parola mevcut parolayla aynı olamaz." };
  await ensureIndexes();
  const checked = await checkOwnPassword(customerId, current);
  if (isFailure(checked)) return checked;
  const changed = await (await customersOf()).updateOne(
    { _id: checked._id, passwordHash: checked.passwordHash },
    { $set: { passwordHash: await hashPassword(next), updatedAt: new Date() } },
  );
  if (changed.modifiedCount === 0) {
    return { ok: false, field: null, message: "Parola başka bir yerden değiştirilmiş görünüyor. Sayfayı yenileyip yeniden deneyin." };
  }
  await (await sessionsOf()).deleteMany({ customerId: checked._id });
  await createSession(checked._id);
  return { ok: true };
}

// Hesabı siler (KVKK): müşteri kaydı (adresler, favoriler, sepet içinde), yorumları, tüm oturumları ve çerez. Verilmiş siparişler
// yasal saklama için kalır, hesapla bağı kaldırılır.
export async function deleteCustomerAccount(customerId: string, password: string): Promise<AuthResult> {
  await ensureIndexes();
  const checked = await checkOwnPassword(customerId, password);
  if (isFailure(checked)) return checked;
  const db = await getDb();
  await db.collection("orders").updateMany({ customerId }, { $unset: { customerId: "" } });
  await db.collection("reviews").deleteMany({ customerId }); // yorumlar da kişisel veridir
  await (await sessionsOf()).deleteMany({ customerId: checked._id });
  await (await customersOf()).deleteOne({ _id: checked._id });
  (await cookies()).delete(CUSTOMER_COOKIE);
  return { ok: true };
}
