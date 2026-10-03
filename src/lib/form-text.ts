// Form alanlarından gelen metni temizleyen ortak yardımcılar (ürün formu ve site ayarları kullanır).

// Karakter sayısı: emoji gibi karakterler tek sayılır.
export const charCount = (text: string) => [...text].length;

function entry(raw: FormDataEntryValue | null): string {
  return typeof raw === "string" ? raw.normalize("NFC") : "";
}

// Tek satırlık alan: satır sonu ve sekme boşluğa döner, görünmez/denetim karakterleri atılır.
export function oneLine(raw: FormDataEntryValue | null): string {
  return entry(raw)
    .replace(/[​-‏⁠﻿]/g, "")
    .replace(/[\u0000-\u0008\u000e-\u001f\u007f-\u0084\u0086-\u009f]/g, "") // boşluk anlamı olmayan denetim karakterleri
    .replace(/[\s\u0085]+/g, " ")
    .trim();
}

// Çok satırlı alan: satır sonları korunur, üst üste en çok bir boş satır kalır.
export function multiLine(raw: FormDataEntryValue | null): string {
  return entry(raw)
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f​-‏⁠﻿]/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const tooLong = (limit: number, text: string) =>
  `En çok ${limit} karakter olabilir (şu an ${charCount(text)}).`;
