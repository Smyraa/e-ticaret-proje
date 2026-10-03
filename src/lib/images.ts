// Ürün görsellerinin sınırları ve dosya adı kuralı. Hem sunucuda hem tarayıcıda kullanılır.
export const IMAGE_LIMITS = {
  maxCount: 8, // üründe en çok görsel
  maxBytes: 10 * 1024 * 1024, // yüklenen dosya başına (10 MB)
  maxPixels: 50_000_000, // ≈ 50 megapiksel: küçük dosyada dev boyutlu "sıkıştırma bombası" görsellere karşı
  minEdge: 300, // en uzun kenar (px); daha küçüğü sitede bulanık görünür
  maxEdge: 2400, // saklanan görselin en uzun kenarı (px); büyükler küçültülür
} as const;

export const MAX_MB = IMAGE_LIMITS.maxBytes / (1024 * 1024);

// Dosya seçici yalnız bunları önerir. "image/*" yazılmaz: iPhone, bu kısıtla HEIC fotoğrafı JPG'ye çevirip verir.
export const IMAGE_TYPES: string[] = ["image/jpeg", "image/png", "image/webp"];
export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");

// media/ içindeki bir dosyanın adı güvenli mi? Klasör dışına çıkış (..), yol ayracı ya da garip karakter olmasın.
export function isSafeMediaName(name: unknown): name is string {
  return (
    typeof name === "string" &&
    name.length <= 120 &&
    !name.includes("..") &&
    /^[a-z0-9][a-z0-9._-]*\.(jpe?g|png|webp|avif)$/.test(name)
  );
}
