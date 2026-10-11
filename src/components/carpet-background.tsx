// Mağazanın zemini: kullanıcının seçtiği halı fotoğrafı (koyu bordo/lacivert, krem motifli madalyon; kullanıcı kararı
// 2026-10-11). Zemin "geri planda" durur: çok hafif bulanık, az soluk ve koyulaştırılmış; kenarlar daha koyu (vinyet).
// Ayar geçmişi: önce çok belirgindi (tanıtım fotoğrafıyla karıştı), sonra fazla silikti; şimdiki orta ayar kullanıcı isteği.
// Böylece ana sayfadaki halılı tanıtım fotoğrafı ve ürünlerle yarışmaz, desen yalnız bir doku olarak hissedilir
// (kullanıcı: "arka planla beraber karışık durdu"). Ekrana sabittir (iOS'ta da çalışsın diye background-attachment yerine
// fixed katman); sayfa kayarken içerik üzerinden geçer. Yönetim sayfalarında yok.
export function CarpetBackground() {
  return (
    <div aria-hidden="true" data-zemin="hali" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-espresso">
      {/* scale: bulanıklığın kenarda bıraktığı açık şeridi ekran dışına iter */}
      <div className="absolute inset-0 scale-110 bg-[url(/images/hali-arka-plan.webp)] bg-cover bg-center blur-[1.5px] saturate-[0.9]" />
      <div className="absolute inset-0 bg-gradient-to-b from-espresso/65 via-espresso/35 to-espresso/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_45%,rgb(15_10_8/0.55)_100%)]" />
    </div>
  );
}
