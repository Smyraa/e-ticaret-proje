import "server-only";

import { getDb } from "./mongodb";

// Hız sınırı sayaçları: bir anahtar (örn. "siparis|<adres>") için belirli bir süre içinde en çok N hak. Sayaçlar
// MongoDB'de durur; süresi dolunca MongoDB kendisi siler (TTL dizini). Hak TEK adımda (atomik) ayrılır: önce sayaca
// bakıp sonra yazan bir düzen, aynı anda gelen onlarca isteğin hepsinin sınıra takılmadan geçmesine yol açardı.
// Yönetici girişi de (auth.ts) aynı mekanizmayı kendi koleksiyonunda ("loginAttempts") kullanır.

type CounterDoc = { _id: string; count: number; resetAt: Date };

const indexReady = new Map<string, Promise<void>>();
function ensureIndex(collection: string): Promise<void> {
  let ready = indexReady.get(collection);
  if (!ready) {
    ready = (async () => {
      const db = await getDb();
      await db.collection(collection).createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 });
    })().catch((error) => {
      indexReady.delete(collection);
      throw error;
    });
    indexReady.set(collection, ready);
  }
  return ready;
}

export type Slot = { allowed: boolean; resetAt: Date };

// Sayaçtan bir hak ayırır. Pencere açıksa ve sınır dolmadıysa sayaç bir artar ve izin verilir; sınır dolduysa sayaç
// değişmez (pencere de uzamaz) ve izin verilmez. Pencere yoksa ya da bittiyse yenisi açılır (bu istek ilk haktır).
export async function takeSlot(
  collection: string,
  key: string,
  limit: number,
  windowMinutes: number,
): Promise<Slot> {
  await ensureIndex(collection);
  const db = await getDb();
  const counters = db.collection<CounterDoc>(collection);
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowMinutes * 60_000);
  const open = { $gt: ["$resetAt", now] };

  for (let attempt = 1; ; attempt++) {
    try {
      // Tek güncelleme: açık pencerede sayaç bir artar (en çok sınıra kadar), değilse 1'den yeni pencere başlar.
      // Dönen kayıt güncellemeden ÖNCEKİ halidir; iznin verilip verilmediği ondan anlaşılır.
      const before = await counters.findOneAndUpdate(
        { _id: key },
        [
          {
            $set: {
              count: { $cond: [open, { $min: [{ $add: [{ $ifNull: ["$count", 0] }, 1] }, limit] }, 1] },
              resetAt: { $cond: [open, "$resetAt", windowEnd] },
            },
          },
        ],
        { upsert: true, returnDocument: "before" },
      );
      if (!before || before.resetAt <= now) return { allowed: true, resetAt: windowEnd };
      return { allowed: (before.count ?? 0) < limit, resetAt: before.resetAt };
    } catch (error) {
      // Aynı anahtar için iki sayaç aynı anda açılırsa biri çakışır; sunucu çoğu zaman kendisi yeniden dener, değilse burada.
      if ((error as { code?: number }).code !== 11000 || attempt >= 3) throw error;
    }
  }
}

// İsteği sayar. Sınır içindeyse true, aşıldıysa false döner.
export async function allowRequest(key: string, limit: number, windowMinutes: number): Promise<boolean> {
  return (await takeSlot("rateLimits", key, limit, windowMinutes)).allowed;
}
