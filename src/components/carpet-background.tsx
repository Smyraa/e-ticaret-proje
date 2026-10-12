// Mağazanın zemini: kullanıcının seçtiği halı fotoğrafı (bordo zemin, lacivert köşeler, krem çiçekli madalyon; kullanıcının
// verdiği üç halıdan ana sayfa fotoğrafındaki klasik çiçekli halıya en uyumlusu). Hafif bulanık, az soluk; üstünde koyu bir
// katman ve kenarlarda vinyet var ki saydam paneller ve yazılar okunsun.
// Ayar geçmişi (2026-10-11/12): çok belirgin → fazla silik → orta → açık taba zemin → bej-taba iki renkli desen; kullanıcı
// "halı eski hâlinde olsun, sadece çok koyu olmasın, bir tık açık kalsın" dedi: renkli halı geri, katman eskisinden hafif
// (70/45/75 → 55/30/60, vinyet 0.55 → 0.4).
// Ekrana sabittir (iOS'ta da çalışsın diye background-attachment yerine fixed katman); sayfa kayarken içerik üzerinden geçer.
// Yönetim sayfalarında yok.
export function CarpetBackground() {
  return (
    <div aria-hidden="true" data-zemin="hali" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-espresso">
      {/* scale: bulanıklığın kenarda bıraktığı açık şeridi ekran dışına iter */}
      <div className="absolute inset-0 scale-110 bg-[url(/images/hali-zemin.webp)] bg-cover bg-center blur-[2px] saturate-[0.85]" />
      <div className="absolute inset-0 bg-gradient-to-b from-espresso/55 via-espresso/30 to-espresso/60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_50%,rgb(15_10_8/0.4)_100%)]" />
    </div>
  );
}
