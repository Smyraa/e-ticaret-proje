// Arama motorlarına açık mı? Demo sürümü kapalıdır (noindex: arama motoruna "beni listeleme" işareti).
// Canlıya çıkarken ortam değişkeni SITE_INDEXING=on yapılır ve uygulama yeniden derlenir.
export const indexingAllowed = process.env.SITE_INDEXING === "on";

// Sitenin yayındaki tam adresi (sonunda / olmadan); yapılandırılmış veri ve paylaşım bağlantıları için.
// Canlıya çıkarken SITE_URL ile verilir (örn. https://ornek.com).
export const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
