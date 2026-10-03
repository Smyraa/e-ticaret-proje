import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { ObjectId } from "mongodb";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "./mongodb";
import { verifyAgainstDummy, verifyPassword } from "./password";

// Yönetici girişi: e-posta + parola. Oturum = tarayıcıya verilen rastgele uzun bir anahtar (HttpOnly çerez).
// Veritabanında anahtarın kendisi değil özeti durur; veritabanı sızsa bile çalınan kayıtla giriş yapılamaz.

export const SESSION_COOKIE = "taura_oturum";
const SESSION_DAYS = 7;
const MAX_FAILURES = 5; // art arda yanlış deneme sınırı
const LOCK_MINUTES = 15; // sınıra ulaşınca bekleme süresi

type UserDoc = { _id: ObjectId; email: string; passwordHash: string; role: "admin"; createdAt: Date };
type SessionDoc = { _id: string; userId: ObjectId; createdAt: Date; expiresAt: Date };
type AttemptDoc = { _id: string; failures: number; resetAt: Date };

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

// Deneme sınırı anahtarı: e-posta + bağlantı adresi. Canlıda Nginx adresi X-Forwarded-For ile iletir.
async function attemptKey(email: string): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "yerel";
  return `${email}|${ip}`;
}

// Sınıra ulaşıldıysa kalan dakika, değilse 0.
async function lockedMinutes(key: string): Promise<number> {
  const db = await getDb();
  const attempt = await db.collection<AttemptDoc>("loginAttempts").findOne({ _id: key });
  if (!attempt || attempt.resetAt <= new Date() || attempt.failures < MAX_FAILURES) return 0;
  return Math.max(1, Math.ceil((attempt.resetAt.getTime() - Date.now()) / 60000));
}

async function recordFailure(key: string) {
  const db = await getDb();
  const attempts = db.collection<AttemptDoc>("loginAttempts");
  const now = new Date();
  const updated = await attempts.updateOne({ _id: key, resetAt: { $gt: now } }, { $inc: { failures: 1 } });
  if (updated.matchedCount === 0) {
    // ilk hata ya da önceki pencere bitmiş: yeni pencere aç
    await attempts.replaceOne(
      { _id: key },
      { failures: 1, resetAt: new Date(now.getTime() + LOCK_MINUTES * 60 * 1000) },
      { upsert: true },
    );
  }
}

export type LoginResult = { ok: true } | { ok: false; message: string };

export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  // Aşırı uzun girdiyi en baştan reddet (gereksiz işlem yapılmasın).
  if (email.length > 254 || password.length > 1024) {
    return { ok: false, message: "E-posta ya da parola hatalı." };
  }

  await ensureIndexes();
  const key = await attemptKey(email);
  const locked = await lockedMinutes(key);
  if (locked > 0) {
    return { ok: false, message: `Çok fazla hatalı deneme. Yaklaşık ${locked} dakika sonra tekrar deneyin.` };
  }

  const db = await getDb();
  const user = await db.collection<UserDoc>("users").findOne({ email });
  let valid = false;
  if (user) {
    valid = await verifyPassword(password, user.passwordHash);
  } else {
    await verifyAgainstDummy(password); // kayıtlı olmayan e-postada da aynı süre harcanır
  }

  if (!user || !valid) {
    await recordFailure(key);
    return { ok: false, message: "E-posta ya da parola hatalı." };
  }

  await db.collection<AttemptDoc>("loginAttempts").deleteOne({ _id: key });
  await createSession(user._id);
  return { ok: true };
}
