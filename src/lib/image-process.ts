import sharp from "sharp";
import { IMAGE_LIMITS } from "./images";

// Kullanıcıya olduğu gibi gösterilebilecek (Türkçe) görsel hatası.
export class ImageError extends Error {}

export type ProcessedImage = { data: Buffer; ext: "jpg" | "webp"; width: number; height: number };

const ALLOWED = new Set(["jpeg", "png", "webp"]);

function describe(error: unknown): ImageError {
  const text = error instanceof Error ? error.message : String(error);
  if (/pixel limit/i.test(text)) {
    return new ImageError(`Görsel çok büyük (en çok ${IMAGE_LIMITS.maxPixels / 1_000_000} megapiksel).`);
  }
  if (/unsupported image format|buffer is empty/i.test(text)) {
    return new ImageError("Bu dosya bir görsel değil ya da desteklenmiyor. JPG, PNG veya WebP yükleyin.");
  }
  if (/corrupt|premature end|bad seek|truncated|vips/i.test(text)) {
    return new ImageError("Görsel dosyası bozuk görünüyor.");
  }
  console.error("Görsel işlenemedi", error);
  return new ImageError("Görsel işlenemedi.");
}

// Yüklenen dosyayı sitede saklanacak hâline getirir:
// - türü dosya içeriğinden anlar (uzantıya/başlığa güvenmez); yalnız JPG, PNG, WebP kabul edilir
// - EXIF yönünü uygular, sonra konum, tarih, telefon modeli gibi TÜM gizli bilgileri siler (yeniden kodlama)
// - en uzun kenarı maxEdge px'e indirir (küçükleri büyütmez)
// - şeffaflık varsa WebP, yoksa JPEG olarak yazar
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const options = { limitInputPixels: IMAGE_LIMITS.maxPixels };

  let format: string | undefined;
  let hasAlpha = false;
  let longest = 0;
  try {
    const meta = await sharp(input, options).metadata();
    format = meta.format;
    hasAlpha = meta.hasAlpha === true;
    longest = Math.max(meta.width ?? 0, meta.height ?? 0);
  } catch (error) {
    throw describe(error);
  }

  if (!format || !ALLOWED.has(format)) {
    throw new ImageError(`Yalnız JPG, PNG veya WebP yüklenebilir (bu dosya: ${(format ?? "bilinmiyor").toUpperCase()}).`);
  }
  if (longest < IMAGE_LIMITS.minEdge) {
    throw new ImageError(`Görsel çok küçük: en uzun kenarı en az ${IMAGE_LIMITS.minEdge} piksel olmalı.`);
  }

  try {
    const pipeline = sharp(input, options)
      .rotate()
      .resize({ width: IMAGE_LIMITS.maxEdge, height: IMAGE_LIMITS.maxEdge, fit: "inside", withoutEnlargement: true });
    const { data, info } = await (hasAlpha
      ? pipeline.webp({ quality: 85 })
      : pipeline.jpeg({ quality: 85, mozjpeg: true })
    ).toBuffer({ resolveWithObject: true });
    return { data, ext: hasAlpha ? "webp" : "jpg", width: info.width, height: info.height };
  } catch (error) {
    throw describe(error);
  }
}
