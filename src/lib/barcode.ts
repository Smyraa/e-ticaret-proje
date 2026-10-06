// Ürün barkodu (ürün başına tek). Sistem her ürüne mağaza içi bir EAN-13 üretir: "29" + 10 haneli sıra + kontrol hanesi
// (20–29 ile başlayan EAN-13'ler dünya genelinde mağaza içi kullanıma ayrılmıştır; gerçek ürün barkoduyla çakışmaz, her
// okuyucu ve etiket yazıcısı tanır). Yönetici elle de yazabilir: rakamlardan oluşan kodlar (EAN-8, UPC-A, EAN-13)
// kontrol hanesiyle denetlenir; harf içeren kendi etiket kodları da kabul edilir. Sunucu ve form ortak kullanır.

export const BARCODE_MAX = 32;
const INTERNAL_PREFIX = "29";

// Yazılanı tek biçime getirir: boşluklar atılır, harfler büyür ("tr" değil, düz büyük harf: barkodlar ASCII'dir).
export const normalizeBarcode = (input: string) => input.replace(/\s+/g, "").toUpperCase();

// GTIN kontrol hanesi (EAN-8, UPC-A, EAN-13 için aynı kural): sağdan başlayarak 3 ve 1 ile çarpılıp toplanır.
export function gtinCheckDigit(body: string): number {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const digit = Number(body[body.length - 1 - i]);
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

const isValidGtin = (code: string) =>
  /^(\d{8}|\d{12}|\d{13})$/.test(code) && gtinCheckDigit(code.slice(0, -1)) === Number(code.at(-1));

// Sistemin ürettiği kod: sıra numarasından EAN-13.
export function internalBarcode(sequence: number): string {
  const body = INTERNAL_PREFIX + String(sequence).padStart(10, "0");
  return body + gtinCheckDigit(body);
}

// Sorun yoksa null, varsa Türkçe ileti. Boş kod burada sorun sayılmaz (boşsa sistem üretir).
export function barcodeProblem(code: string): string | null {
  if (code === "") return null;
  if (code.length > BARCODE_MAX) return `Barkod en çok ${BARCODE_MAX} karakter olabilir.`;
  if (/^\d+$/.test(code)) {
    if (!/^(\d{8}|\d{12}|\d{13})$/.test(code)) return "Rakamlardan oluşan barkod 8, 12 ya da 13 haneli olmalı.";
    return isValidGtin(code) ? null : "Barkodun son hanesi (kontrol hanesi) tutmuyor. Okutarak ya da yeniden yazın.";
  }
  if (!/^[A-Z0-9][A-Z0-9.\-/]{3,}$/.test(code)) {
    return "Barkod yalnız harf (A–Z), rakam ve - . / içerebilir, en az 4 karakter olmalı.";
  }
  return null;
}
