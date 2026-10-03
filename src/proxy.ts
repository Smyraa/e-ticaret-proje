import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

// İçerik güvenlik politikası (CSP): tarayıcıya "bu sayfada yalnızca şunlar çalışabilir, şuralardan yüklenebilir" der.
// Sayfaya sonradan sızdırılmış bir <script> (XSS) bu yüzden çalışmaz. Her istek için yeni bir tek kullanımlık anahtar
// (nonce) üretilir; Next.js bu anahtarı kendi komut dosyalarına ve stillerine otomatik ekler, başkasının eklediği
// komut dosyasında anahtar olmayacağı için tarayıcı onu reddeder. Bu yöntem sayfaların her istekte çizilmesini
// gerektirir (kök düzende `dynamic = "force-dynamic"` bu yüzden var).
export function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString("base64");
  const development = process.env.NODE_ENV === "development";

  const policy = [
    "default-src 'self'",
    // 'strict-dynamic': anahtarlı bir komut dosyasının yüklediği diğer dosyalar da çalışabilir (Next.js'in parçaları).
    // Geliştirmede React hata ayıklama için eval kullanır; yayında gerekmez.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    // <style> yalnızca anahtarlıysa. Satır içi style="..." özellikleri (next/image kullanır) ayrıca serbest:
    // bu özellikler komut çalıştıramaz.
    `style-src 'self' ${development ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:", // blob: yükleme öncesi önizleme için
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'", // X-Frame-Options ile aynı iş (yeni tarayıcılar bunu kullanır)
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce); // sayfalar gerektiğinde (örn. ödeme sağlayıcısının komut dosyası) buradan okur
  requestHeaders.set("Content-Security-Policy", policy); // Next.js anahtarı bu başlıktan alır

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

// Her sayfa isteğinde çalışır; şunlarda çalışmaz:
// - _next/static, _next/image, media, favicon: sayfa değil dosya (CSP'ye gerek yok);
// - iki görsel yükleme adresi: Next.js proxy kullanılan yollarda istek gövdesini bellekte tutup 10 MB'ta keser,
//   yüklemelerimiz bu sınıra yakın olabilir; bu adresler JSON döndürür, CSP gerekmez;
// - bağlantı önyüklemeleri (prefetch): sayfa gösterilmez.
export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|media/|favicon\\.ico|yonetim/ayarlar/gorsel$|yonetim/urunler/[^/]+/gorseller$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
