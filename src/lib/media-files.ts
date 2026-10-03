import "server-only";
import { randomBytes } from "node:crypto";
import { access, mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSafeMediaName } from "./images";

// Görsellerin durduğu klasör (git'e girmez). Yayında bu klasörü Nginx doğrudan diskten sunar. MEDIA_DIR ile
// uygulama klasörünün dışında kalıcı bir yere alınabilir; böylece yeni sürüm kurulunca yüklemeler kaybolmaz.
// (turbopackIgnore: klasör çalışma anında belirlenir; derleyici "tüm projeyi izle" uyarısı vermesin.)
export const MEDIA_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.MEDIA_DIR ?? path.join(process.cwd(), "media"));

function fileOf(name: string) {
  if (!isSafeMediaName(name)) throw new Error("Güvenli olmayan dosya adı");
  return path.join(/*turbopackIgnore: true*/ MEDIA_DIR, name);
}

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

// Dosyayı yazar. Adlar içerik izli olduğundan aynı ad = aynı içerik: dosya zaten varsa dokunmaz ve false döner.
// Önce geçici dosyaya yazılıp yeniden adlandırılır; yazma yarıda kesilse bile eksik bir görsel yayına çıkmaz.
export async function writeMediaFile(name: string, data: Buffer): Promise<boolean> {
  const file = fileOf(name);
  if (await exists(file)) return false;

  await mkdir(MEDIA_DIR, { recursive: true });
  const temp = `${file}.${randomBytes(4).toString("hex")}.tmp`;
  try {
    await writeFile(temp, data);
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
  return true;
}

export async function deleteMediaFile(name: string): Promise<void> {
  await rm(fileOf(name), { force: true });
}
