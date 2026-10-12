// Mağazanın zemini: kullanıcının seçtiği halının (bordo zemin, lacivert köşeler, krem çiçekli madalyon) BEJ–TABA iki renkli
// hâli: public/images/hali-bej.webp (halı fotoğrafından üretildi: gri ton + normalleştirme + hafif bulanıklık, koyu yerler taba
// #b07f52, açık motifler bej #ecdcbf). Tarayıcıda karışım efekti yok; her tarayıcıda aynı görünür. Kenarlar hafif koyulaşır.
// Ayar geçmişi (2026-10-11/12): koyu espresso katmanlı halı → açık taba zemin → kullanıcı "halı deseni bej tonları olsun" dedi.
// Ekrana sabittir (iOS'ta da çalışsın diye background-attachment yerine fixed katman); sayfa kayarken içerik üzerinden geçer.
// Yönetim sayfalarında yok. Üzerindeki koyu cam paneller (ana sayfa, üst menü, alt bilgi) açık yazının okunması için yeterince
// koyudur (bkz. page.tsx `glass`).
export function CarpetBackground() {
  return (
    <div aria-hidden="true" data-zemin="hali" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-taba">
      <div className="absolute inset-0 bg-[url(/images/hali-bej.webp)] bg-cover bg-center" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_55%,rgb(110_66_36/0.3)_100%)]" />
    </div>
  );
}
