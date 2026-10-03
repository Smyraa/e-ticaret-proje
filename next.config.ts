import type { NextConfig } from "next";

// Her yanıta eklenen güvenlik başlıkları. İçerik güvenlik politikası (CSP) her istek için ayrı üretilen bir
// tek kullanımlık anahtar (nonce) taşıdığından burada değil, src/proxy.ts'te.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" }, // tarayıcı dosya türünü kendi kafasına göre tahmin etmesin
  { key: "X-Frame-Options", value: "DENY" }, // site başka bir sitenin sayfasına gömülemez (tıklama tuzağı)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, // başka sitelere yalnızca alan adı gider
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Tarayıcıya "bu siteye bundan sonra yalnızca HTTPS ile gel" der; HTTP üzerinden gelen yanıtlarda yok sayılır.
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false, // "X-Powered-By: Next.js" bilgisi gereksiz yere paylaşılmasın
  images: {
    // Medya dosya adları içerik izli olduğundan boyutlandırılmış sürümler 1 yıl saklanabilir.
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
