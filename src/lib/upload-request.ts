import "server-only";
import { getAdmin } from "./auth";
import { IMAGE_LIMITS, MAX_MB } from "./images";

// Görsel yükleme yollarının ortak ön denetimi (ürün görseli ve ana sayfa görseli). Sunucu eylemi yerine yol işleyici
// kullanılır: sunucu eylemlerinin gövde sınırı (varsayılan 1 MB) tüm eylemler için birlikte yükseltilirdi, ayrıca
// eylemlerde yetki kontrolü gövde okunduktan sonra yapılır. Burada yetki, gövdeye dokunulmadan ÖNCE denetlenir.

// Kabul edilen gövde sınırı: dosya + çok parçalı (multipart) istek başlıkları için pay.
const MAX_BODY = IMAGE_LIMITS.maxBytes + 64 * 1024;

export const fail = (status: number, error: string) => Response.json({ ok: false, error }, { status });

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

// Sırayla denetler: Origin (403) → yönetici oturumu (401) → gövde boyutu (413) → çok parçalı biçim (400) →
// "dosya" alanı (400/413). Sorun varsa tarayıcıya dönülecek yanıtı verir; yoksa yüklenen dosyayı.
export async function readImageUpload(request: Request): Promise<{ file: File } | { response: Response }> {
  if (!sameOrigin(request)) return { response: fail(403, "İstek reddedildi.") };
  if (!(await getAdmin())) return { response: fail(401, "Oturumunuz kapanmış. Yeniden giriş yapın.") };

  const tooBig = { response: fail(413, `Dosya ${MAX_MB} MB'tan büyük olamaz.`) };
  if (Number(request.headers.get("content-length")) > MAX_BODY) return tooBig;
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    return { response: fail(400, "Geçersiz istek.") };
  }

  const body = await readLimited(request, MAX_BODY);
  if (!body) return tooBig;

  let form: FormData;
  try {
    form = await new Response(new Uint8Array(body), {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    return { response: fail(400, "İstek okunamadı.") };
  }

  const file = form.get("dosya");
  if (!(file instanceof File) || file.size === 0) return { response: fail(400, "Dosya bulunamadı.") };
  if (file.size > IMAGE_LIMITS.maxBytes) return tooBig;
  return { file };
}
