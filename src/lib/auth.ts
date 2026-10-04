import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { clientAddress } from "./client-address";
import { getDb } from "./mongodb";
import { hashPassword, passwordProblem, verifyAgainstDummy, verifyPassword } from "./password";
import { takeSlot } from "./rate-limit";

// Yönetici girişi: e-posta + parola. Oturum = tarayıcıya verilen rastgele uzun bir anahtar (HttpOnly çerez).
// Veritabanında anahtarın kendisi değil özeti durur; veritabanı sızsa bile çalınan kayıtla giriş yapılamaz.

export const SESSION_COOKIE = "taura_oturum";
const SESSION_DAYS = 7;
const MAX_FAILURES = 5; // aynı e-posta + aynı bağlantı adresinden 15 dakikada en çok bu kadar giriş denemesi
const MAX_FAILURES_PER_EMAIL = 20; // adrese bakmadan, aynı e-posta için sınır (bkz. clientAddress)
const LOCK_MINUTES = 15; // sınıra ulaşınca bekleme süresi

type UserDoc = { _id: ObjectId; email: string; passwordHash: string; role: "admin"; createdAt: Date };
type SessionDoc = { _id: string; userId: ObjectId; createdAt: Date; expiresAt: Date };
type AttemptDoc = { _id: string; count: number; resetAt: Date };

export type Admin = { id: string; email: string };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Çerez ayarları: JavaScript okuyamaz (httpOnly), başka sitelerden gelen isteklerde gönderilmez (sameSite),
// canlıda yalnızca HTTPS üzerinden gider (secure).
export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

// Süresi dolan oturum ve deneme kayıtlarını MongoDB kendisi siler (TTL dizini); e-posta tek olmalı.
let indexesReady: Promise<void> | undefined;
function ensureIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    const db = await getDb();
    await Promise.all([
      db.collection("users").createIndex({ email: 1 }, { unique: true }),
      db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection("loginAttempts").createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 }),
    ]);
  })().catch((error) => {
    indexesReady = undefined;
    throw error;
  });
  return indexesReady;
}

async function createSession(userId: ObjectId) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const db = await getDb();
  await db
    .collection<SessionDoc>("sessions")
    .insertOne({ _id: hashToken(token), userId, createdAt: now, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

// Geçerli oturumdaki yönetici; yoksa null. Bir istek içinde tekrar çağrılırsa veritabanına yeniden gitmez.
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const session = await db
    .collection<SessionDoc>("sessions")
    .findOne({ _id: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await db
    .collection<UserDoc>("users")
    .findOne({ _id: session.userId }, { projection: { email: 1 } });
  return user ? { id: user._id.toHexString(), email: user.email } : null;
});

// Her yönetim sayfasının ve her yönetim işleminin başında çağrılır: giriş yoksa giriş sayfasına gönderir.
// (Yalnızca ortak düzende kontrol etmek yetmez; sayfalar ve sunucu eylemleri kendi kontrolünü yapar.)
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/yonetim/giris");
  return admin;
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.collection<SessionDoc>("sessions").deleteOne({ _id: hashToken(token) });
  }
  store.delete(SESSION_COOKIE);
}

// Deneme sayaçlarının anahtarları (loginAttempts koleksiyonunda; süresi dolunca MongoDB siler).
// Adres taklit edilebildiğinden (bkz. clientAddress) giriş için e-posta başına ikinci bir sayaç da tutulur.
const addressKey = (email: string, address: string) => `giris|${email}|${address}`;
const emailKey = (email: string) => `giris-eposta|${email}`;
const passwordKey = (userId: string) => `parola|${userId}`;

// Deneme hakkı ayırır: hak parola denenmeden ÖNCE, tek adımda alınır (bkz. rate-limit.ts). Önce sayaca bakıp hatayı
// sonra yazmak, aynı anda gelen onlarca denemenin hepsinin kilide takılmadan parola denemesine yol açardı.
// Hak kalmadıysa kalan dakikayı, kaldıysa 0 verir.
async function reserveAttempt(key: string, limit: number): Promise<number> {
  const { allowed, resetAt } = await takeSlot("loginAttempts", key, limit, LOCK_MINUTES);
  return allowed ? 0 : Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 60000));
}

async function clearFailures(key: string) {
  const db = await getDb();
  await db.collection<AttemptDoc>("loginAttempts").deleteOne({ _id: key });
}

// Başarılı girişte ayrılan hakkı geri verir (sayaç yalnız başarısız denemeleri saysın); başkasının biriken
// denemeleri silinmez, yalnız bu girişin hakkı düşülür.
async function releaseAttempt(key: string) {
  const db = await getDb();
  const attempts = db.collection<AttemptDoc>("loginAttempts");
  const removed = await attempts.deleteOne({ _id: key, count: { $lte: 1 } });
  if (removed.deletedCount === 0) await attempts.updateOne({ _id: key, count: { $gt: 1 } }, { $inc: { count: -1 } });
}

const lockedMessage = (minutes: number) => `Çok fazla hatalı deneme. Yaklaşık ${minutes} dakika sonra tekrar deneyin.`;

export type LoginResult = { ok: true } | { ok: false; message: string };

export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  // Aşırı uzun girdiyi en baştan reddet (gereksiz işlem yapılmasın).
  if (email.length > 254 || password.length > 1024) {
    return { ok: false, message: "E-posta ya da parola hatalı." };
  }

  await ensureIndexes();
  const byAddress = addressKey(email, await clientAddress());
  const byEmail = emailKey(email);
  // Önce adresin hakkı alınır; adres kilitliyse e-posta sayacına dokunulmaz (tek bir adres, yöneticiyi e-posta
  // sınırıyla kilitleyemesin).
  const addressLock = await reserveAttempt(byAddress, MAX_FAILURES);
  if (addressLock > 0) return { ok: false, message: lockedMessage(addressLock) };
  const emailLock = await reserveAttempt(byEmail, MAX_FAILURES_PER_EMAIL);
  if (emailLock > 0) return { ok: false, message: lockedMessage(emailLock) };

  const db = await getDb();
  const user = await db.collection<UserDoc>("users").findOne({ email });
  let valid = false;
  if (user) {
    valid = await verifyPassword(password, user.passwordHash);
  } else {
    await verifyAgainstDummy(password); // kayıtlı olmayan e-postada da aynı süre harcanır
  }

  if (!user || !valid) return { ok: false, message: "E-posta ya da parola hatalı." }; // hak zaten ayrıldı

  // Başarılı girişte yalnız bu adresin sayacı sıfırlanır; e-posta sayacından bu girişin hakkı geri verilir, gerisi
  // kendi süresinde biter (yoksa meşru bir girişle başka birinin biriken kaba kuvvet denemeleri de silinirdi).
  await Promise.all([clearFailures(byAddress), releaseAttempt(byEmail)]);
  await createSession(user._id);
  return { ok: true };
}

// field: hatanın ait olduğu form kutusu (null: genel hata).
export type PasswordChangeResult = { ok: true } | { ok: false; field: "mevcut" | "yeni" | null; message: string };

// Yönetici parolasını değiştirir. Mevcut parola sorulur (açık kalmış bir oturumdan hesabı ele geçirmek zorlaşsın);
// yanlış denemeler girişteki gibi sınırlanır. Değişince bu yöneticinin TÜM oturumları silinir ve bu tarayıcıya yeni
// bir oturum verilir: eski bir oturum anahtarı (çalınmış olsa bile) bir daha işe yaramaz.
export async function changePassword(
  admin: Admin,
  currentPassword: string,
  newPassword: string,
): Promise<PasswordChangeResult> {
  const problem = passwordProblem(newPassword);
  if (problem) return { ok: false, field: "yeni", message: problem };
  if (newPassword === currentPassword) {
    return { ok: false, field: "yeni", message: "Yeni parola mevcut parolayla aynı olamaz." };
  }

  await ensureIndexes();
  const key = passwordKey(admin.id);
  const locked = await reserveAttempt(key, MAX_FAILURES);
  if (locked > 0) return { ok: false, field: null, message: lockedMessage(locked) };

  const db = await getDb();
  const users = db.collection<UserDoc>("users");
  const user = await users.findOne({ _id: new ObjectId(admin.id) });
  if (!user || currentPassword.length > 1024 || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return { ok: false, field: "mevcut", message: "Mevcut parola yanlış." }; // hak zaten ayrıldı
  }
  await clearFailures(key);

  // Özet yalnızca okuduğumuz özetle aynıysa yazılır: aynı anda başka yerden değişmişse üzerine yazılmaz.
  const changed = await users.updateOne(
    { _id: user._id, passwordHash: user.passwordHash },
    { $set: { passwordHash: await hashPassword(newPassword), updatedAt: new Date() } },
  );
  if (changed.modifiedCount === 0) {
    return {
      ok: false,
      field: null,
      message: "Parola başka bir yerden değiştirilmiş görünüyor. Sayfayı yenileyip yeniden deneyin.",
    };
  }

  await db.collection<SessionDoc>("sessions").deleteMany({ userId: user._id });
  await createSession(user._id);
  return { ok: true };
}
