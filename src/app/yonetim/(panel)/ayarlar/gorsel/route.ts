import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ImageError, processImage } from "@/lib/image-process";
import { writeMediaFile } from "@/lib/media-files";
import { replaceHeroImage } from "@/lib/settings-admin";
import { fail, readImageUpload } from "@/lib/upload-request";

// Ana sayfa görselini yükler (tek dosya). İstek ön denetimi (Origin, yönetici, boyut, biçim) upload-request.ts'te.
// Görsel ürün görselleriyle aynı işlemden geçer (tür doğrulama, gizli bilgi silme, küçültme); adı hero-<iz>.jpg|webp.
export async function POST(request: Request) {
  const upload = await readImageUpload(request);
  if ("response" in upload) return upload.response;

  try {
    let image;
    try {
      image = await processImage(Buffer.from(await upload.file.arrayBuffer()));
    } catch (error) {
      if (error instanceof ImageError) return fail(422, error.message);
      throw error;
    }

    const hash = createHash("sha256").update(image.data).digest("hex").slice(0, 8);
    const name = `hero-${hash}.${image.ext}`;
    await writeMediaFile(name, image.data);
    await replaceHeroImage(name); // eski görselin dosyası başka yerde kullanılmıyorsa silinir

    revalidatePath("/", "layout");
    return Response.json({ ok: true, name });
  } catch (error) {
    console.error("Ana sayfa görseli yüklenemedi", error);
    return fail(500, "Görsel kaydedilemedi. Biraz sonra yeniden deneyin.");
  }
}
