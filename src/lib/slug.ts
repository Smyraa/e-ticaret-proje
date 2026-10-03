import { fold } from "./text";

// Ürün adından adres parçası üretir: "Kehribar Tesbih 33'lük" → "kehribar-tesbih-33luk".
// Türkçe harfler sadeleşir, geri kalan her şey tireye dönüşür; boş çıkarsa "urun" kullanılır.
export function slugify(text: string): string {
  const slug = fold(text.normalize("NFC"))
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // â, î, û gibi şapkalı harfler
    .replace(/['’`´]/g, "") // 33'lük → 33luk
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "urun";
}
