// Mağazanın zemini: Türk halısı esintili, kendi çizdiğimiz desen (fotoğraf yok, lisans yok). Katmanlar: koyu bordo → lacivert
// geçişli zemin, tekrarlanan döşeme (public/desen/hali-doku.svg: baklava ızgarası, ortada sekiz köşeli yıldız ve gül, köşelerde
// küçük çiçek), kenarlarda gölge, ortada büyük dilimli madalyon (public/desen/hali-madalyon.svg) ve ince çift çerçeve.
// Desenler ayrı dosyadır: her sayfanın HTML'ini büyütmez, tarayıcı önbelleğe alır. Ekrana sabittir; içerik üzerinden kayar.
export function CarpetBackground() {
  return (
    <div aria-hidden="true" data-zemin="hali" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,#6b1a26_0%,#4d121c_40%,#2a0d16_72%,#141629_100%)]" />
      <div className="absolute inset-0 bg-[url(/desen/hali-doku.svg)] bg-[length:140px_140px] opacity-55" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_55%,rgb(0_0_0/0.55)_100%)]" />
      <div className="absolute top-1/2 left-1/2 aspect-[2/3] h-[92vh] max-h-[1100px] -translate-x-1/2 -translate-y-1/2 bg-[url(/desen/hali-madalyon.svg)] bg-contain bg-center bg-no-repeat opacity-45" />
      <div className="absolute inset-2 rounded-sm border border-gold-light/35 sm:inset-3" />
      <div className="absolute inset-3.5 rounded-sm border border-dashed border-gold-light/20 sm:inset-5" />
    </div>
  );
}
