import { randomBytes, randomInt } from "node:crypto";

// Sipariş numarası: TA-7KQ2-X9DM. Rastgele ve sıra numarası içermez (sipariş sayısını dışarıya söylemesin);
// 0/O ve 1/I/L karışmasın diye bu harfler yok. Telefonda ya da WhatsApp'ta okunabilir.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const ORDER_NUMBER_PATTERN = /^TA-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/;

export function newOrderNumber(): string {
  const chars = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `TA-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

// Müşterinin yazdığı numarayı TA-7KQ2-X9DM biçimine çevirir: büyük/küçük harf, boşluk ve tire farkı önemsizdir,
// "TA" başı yazılmayabilir ("7kq2 x9dm"). Biçime uymuyorsa null (siparişin var olup olmadığı burada bilinmez).
export function parseOrderNumber(raw: string): string | null {
  let chars = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (chars.length === 8) chars = `TA${chars}`;
  const number = `${chars.slice(0, 2)}-${chars.slice(2, 6)}-${chars.slice(6)}`;
  return ORDER_NUMBER_PATTERN.test(number) ? number : null;
}

// Sipariş sayfasının gizli anahtarı: 24 rastgele bayt (192 bit), 32 karakter. Tahmin edilemez.
export const TRACK_KEY_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export const newTrackKey = () => randomBytes(24).toString("base64url");
