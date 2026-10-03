import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/auth";
import { ImageError, processImage } from "@/lib/image-process";
import { IMAGE_LIMITS, MAX_MB } from "@/lib/images";
import { deleteMediaFile, writeMediaFile } from "@/lib/media-files";
import { addProductImage, getProductForAdmin } from "@/lib/products-admin";

// Ürüne görsel yükler: istek başına tek dosya (tarayıcı birden çok dosyayı sırayla gönderir).
// Sunucu eylemi yerine yol işleyicisi (route handler) kullanılır: sunucu eylemlerinin gövde sınırı (varsayılan 1 MB)
// tüm eylemler için birlikte yükseltilirdi, ayrıca eylemlerde yetki kontrolü gövde okunduktan sonra yapılır.
// Burada yetki, gövdeye dokunulmadan ÖNCE denetlenir.

// Kabul edilen gövde sınırı: dosya + çok parçalı (multipart) istek başlıkları için pay.
const MAX_BODY = IMAGE_LIMITS.maxBytes + 64 * 1024;

const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status });

// İstek bizim sitemizden mi geldi? Sunucu eylemlerindeki Origin denetiminin aynısı (SameSite çerezine ek koruma).
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Gövdeyi en çok `limit` bayt olacak şekilde okur; aşarsa okumayı keser ve null döner. (Content-Length başlığı
// olmayan ya da yalan söyleyen istekler de belleği dolduramaz.)
async function readLimited(request: Request, limit: number): Promise<Buffer | null> {
  const reader = request.body?.getReader();
  if (!reader) return Buffer.alloc(0);

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(request: Request, { params }: RouteContext<"/yonetim/urunler/[slug]/gorseller">) {
  if (!sameOrigin(request)) return fail(403, "İstek reddedildi.");
  if (!(await getAdmin())) return fail(401, "Oturumunuz kapanmış. Yeniden giriş yapın.");

  const tooBig = fail(413, `Dosya ${MAX_MB} MB'tan büyük olamaz.`);
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_BODY) return tooBig;
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return fail(400, "Geçersiz istek.");

  try {
    const body = await readLimited(request, MAX_BODY);
    if (!body) return tooBig;

    let form: FormData;
    try {
      form = await new Response(new Uint8Array(body), {
        headers: { "content-type": request.headers.get("content-type") ?? "" },
      }).formData();
    } catch {
      return fail(400, "İstek okunamadı.");
    }
    const file = form.get("dosya");
    if (!(file instanceof File) || file.size === 0) return fail(400, "Dosya bulunamadı.");
    if (file.size > IMAGE_LIMITS.maxBytes) return tooBig;

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
