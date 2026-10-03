import "server-only";

import { getDb } from "./mongodb";

// Basit hız sınırı: bir anahtar (örn. "siparis|<adres>") için belirli bir süre içinde en çok N istek.
// Sayaçlar "rateLimits" koleksiyonunda durur; süresi dolunca MongoDB kendisi siler (TTL dizini).
// Giriş denemelerinin sayacı (auth.ts) farklı çalışır: orada yalnız hatalar sayılır ve başarıda sıfırlanır.

type LimitDoc = { _id: string; count: number; resetAt: Date };

let indexReady: Promise<void> | undefined;
function ensureIndex(): Promise<void> {
  indexReady ??= (async () => {
    const db = await getDb();
    await db.collection("rateLimits").createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 });
  })().catch((error) => {
    indexReady = undefined;
    throw error;
  });
  return indexReady;
}

// İsteği sayar. Sınır içindeyse true, aşıldıysa false döner (aşılan istekler de sayılır, pencere uzamaz).
export async function allowRequest(key: string, limit: number, windowMinutes: number): Promise<boolean> {
  await ensureIndex();
  const db = await getDb();
  const limits = db.collection<LimitDoc>("rateLimits");
  const now = new Date();

  const open = await limits.findOneAndUpdate(
    { _id: key, resetAt: { $gt: now } },
    { $inc: { count: 1 } },
    { returnDocument: "after" },
  );
  if (open) return open.count <= limit;

  // Pencere yok ya da bitmiş: yenisini aç.
  try {
    await limits.replaceOne(
      { _id: key },
      { count: 1, resetAt: new Date(now.getTime() + windowMinutes * 60_000) },
      { upsert: true },
    );
  } catch (error) {
    // Aynı anda başka bir istek pencereyi açtı; bu istek sayılmadan geçer (en çok bir istek fazla izin verilir).
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  return true;
}
