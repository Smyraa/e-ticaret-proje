import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { ImageError, processImage } from "@/lib/image-process";
import { IMAGE_LIMITS } from "@/lib/images";
import { deleteMediaFile, writeMediaFile } from "@/lib/media-files";
import { addProductImage, getProductForAdmin } from "@/lib/products-admin";
import { fail, readImageUpload } from "@/lib/upload-request";

// Ürüne görsel yükler: istek başına tek dosya (tarayıcı birden çok dosyayı sırayla gönderir).
// İstek ön denetimi (Origin, yönetici, boyut, biçim) upload-request.ts'te.
export async function POST(request: Request, { params }: RouteContext<"/yonetim/urunler/[slug]/gorseller">) {
  const upload = await readImageUpload(request);
  if ("response" in upload) return upload.response;
  const { file } = upload;

  try {
    const { slug } = await params;
    const product = await getProductForAdmin(slug);
    if (!product) return fail(404, "Ürün bulunamadı.");
    if (product.images.length >= IMAGE_LIMITS.maxCount) {
      return fail(409, `Bir ürüne en çok ${IMAGE_LIMITS.maxCount} görsel eklenebilir.`);
    }

    let image;
    try {
      image = await processImage(Buffer.from(await file.arrayBuffer()));
    } catch (error) {
      if (error instanceof ImageError) return fail(422, error.message);
      throw error;
    }

    // Ad: ürün adresi + içerik izi. Aynı görsel aynı ürüne ikinci kez eklenirse adı da aynı çıkar.
    const hash = createHash("sha256").update(image.data).digest("hex").slice(0, 8);
    const name = `${slug}-${hash}.${image.ext}`;

    const created = await writeMediaFile(name, image.data);
    const result = await addProductImage(slug, name);
    if (result !== "added") {
      if (created) await deleteMediaFile(name); // kayda girmeyen dosya diskte kalmasın
      if (result === "duplicate") return fail(409, "Bu görsel zaten ekli.");
      if (result === "full") return fail(409, `Bir ürüne en çok ${IMAGE_LIMITS.maxCount} görsel eklenebilir.`);
      return fail(404, "Ürün bulunamadı.");
    }

    revalidatePath("/", "layout");
    return Response.json({ ok: true, name });
  } catch (error) {
    console.error("Görsel yüklenemedi", error);
    return fail(500, "Görsel kaydedilemedi. Biraz sonra yeniden deneyin.");
  }
}
