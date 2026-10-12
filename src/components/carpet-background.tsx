// Mağazanın zemini: kullanıcının seçtiği halı fotoğrafı (bordo zemin, lacivert köşeler, krem çiçekli madalyon) açık TABA
// renginde: düz taba zemin, halı deseni üstünde yumuşak ışık (soft-light) karışımıyla açık-koyu taba tonlarında hafifçe seçilir;
// kenarlar hafif koyulaşır. (Önce multiply ile desen koyu kalıyordu; kullanıcı "halı deseni koyu, açık renk olsun" dedi.) Ayar geçmişi (2026-10-11/12): önce koyu espresso katman altında halı fotoğrafı; kullanıcı "çok koyu, açık renk,
// taba rengi gibi olsun" dedi. Ekrana sabittir (iOS'ta da çalışsın diye background-attachment yerine fixed katman); sayfa
// kayarken içerik üzerinden geçer. Yönetim sayfalarında yok. Üzerindeki koyu cam paneller (ana sayfa, üst menü, alt bilgi)
// açık yazının okunması için yeterince koyudur (bkz. page.tsx `glass`).
export function CarpetBackground() {
  return (
    <div aria-hidden="true" data-zemin="hali" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-taba">
      {/* scale: bulanıklığın kenarda bıraktığı açık şeridi ekran dışına iter */}
      <div className="absolute inset-0 scale-110 bg-[url(/images/hali-zemin.webp)] bg-cover bg-center opacity-60 mix-blend-soft-light blur-[1.5px] brightness-125 grayscale-[0.4] sepia-[0.4]" />
      <div className="absolute inset-0 bg-gradient-to-b from-taba-light/30 via-transparent to-taba-dark/25" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_50%,rgb(110_66_36/0.35)_100%)]" />
    </div>
  );
}
