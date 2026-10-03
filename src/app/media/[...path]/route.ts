import { readFile } from "node:fs/promises";
import path from "node:path";
import { MEDIA_DIR } from "@/lib/media-files";

// Medya klasörü media-files.ts'te (git'e girmez). Yayında bu isteği Nginx doğrudan diskten karşılayacak.

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

const notFound = () => new Response("Bulunamadı", { status: 404 });

export async function GET(_request: Request, { params }: RouteContext<"/media/[...path]">) {
  const { path: parts } = await params;
  const file = path.join(MEDIA_DIR, ...parts);

  // Klasörün dışına çıkmaya (../) izin verilmez; yalnızca resim türleri sunulur.
  if (!file.startsWith(MEDIA_DIR + path.sep)) return notFound();
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) return notFound();

  try {
    const data = await readFile(file);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        // Dosya adları içerik izli olduğundan 1 yıl saklanabilir.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
