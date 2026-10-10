// Mağazanın zemini: kullanıcının seçtiği halı fotoğrafı (koyu bordo/lacivert, krem motifli madalyon; kullanıcı kararı
// 2026-10-11). Üstünde koyu bir geçiş katmanı vardır ki saydam paneller ve yazılar okunsun. Ekrana sabittir (iOS'ta da
// çalışsın diye background-attachment yerine fixed katman); sayfa kayarken içerik üzerinden geçer. Yönetim sayfalarında yok.
export function CarpetBackground() {
  return (
    <div aria-hidden="true" data-zemin="hali" className="pointer-events-none fixed inset-0 -z-10 bg-espresso">
      <div className="absolute inset-0 bg-[url(/images/hali-arka-plan.webp)] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-b from-espresso/50 via-espresso/25 to-espresso/60" />
    </div>
  );
}
