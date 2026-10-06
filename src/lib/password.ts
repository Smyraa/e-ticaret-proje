// Parola özeti (hash): parola veritabanında olduğu gibi durmaz, geri döndürülemeyen bir "parmak izi" durur.
// scrypt, Node.js'in yerleşik algoritmasıdır; ek paket gerekmez. Bu dosya hem sitede hem hesap açma komutunda
// (scripts/admin.mjs) kullanılır, bu yüzden yalnızca düz TypeScript içerir (Node doğrudan çalıştırabilsin diye).
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const PASSWORD_MIN_LENGTH = 12; // yönetici
export const CUSTOMER_PASSWORD_MIN_LENGTH = 8; // müşteri hesabı
export const PASSWORD_MAX_LENGTH = 128;

// Maliyet ayarları: her deneme ~0,1 sn ve 32 MB bellek harcar; kaba kuvvet denemelerini pahalılaştırır.
const COST = 2 ** 15;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

// Parola kurallarında sorun varsa Türkçe açıklamayı, yoksa null döndürür.
export function passwordProblem(password: string, minLength = PASSWORD_MIN_LENGTH): string | null {
  if (password.length < minLength) {
    return `Parola en az ${minLength} karakter olmalı.`;
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Parola en çok ${PASSWORD_MAX_LENGTH} karakter olabilir.`;
  }
  return null;
}

function derive(
  password: string,
  salt: Buffer,
  cost: number,
  blockSize: number,
  parallelization: number,
  keyLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"), // aynı görünen farklı Unicode yazımlar aynı parola sayılır
      salt,
      keyLength,
      { N: cost, r: blockSize, p: parallelization, maxmem: 256 * cost * blockSize },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

// Biçim: scrypt$<maliyet>$<blok>$<paralellik>$<tuz>$<özet>. Her parola kendi rastgele tuzuyla özetlenir;
// aynı parolayı kullanan iki kişinin özeti bile farklı çıkar.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, COST, BLOCK_SIZE, PARALLELISM, KEY_LENGTH);
  return ["scrypt", COST, BLOCK_SIZE, PARALLELISM, salt.toString("base64"), key.toString("base64")].join("$");
}

// Yazılan parola saklanan özetle eşleşiyor mu? Karşılaştırma sabit sürede yapılır (süreden ipucu çıkmasın diye).
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, cost, blockSize, parallelization, saltText, keyText] = stored.split("$");
    if (scheme !== "scrypt" || !saltText || !keyText) return false;
    const expected = Buffer.from(keyText, "base64");
    const actual = await derive(
      password,
      Buffer.from(saltText, "base64"),
      Number(cost),
      Number(blockSize),
      Number(parallelization),
      expected.length,
    );
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false; // bozuk kayıt: eşleşme sayılmaz
  }
}

// Kullanıcı bulunamadığında da aynı işi yapıp aynı süreyi harcamak için: "bu e-posta kayıtlı mı" bilgisi
// yanıt süresinden anlaşılmasın.
let dummyHash: Promise<string> | undefined;
export async function verifyAgainstDummy(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
}
