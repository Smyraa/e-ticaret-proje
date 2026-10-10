// İnce gold süs çizgisi: iki yanda çizgi, ortada baklava. Başlıkların altında ve panellerde ayraç olarak kullanılır.
export function GoldOrnament({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`flex items-center gap-2 text-gold-light ${className}`}>
      <span className="h-px w-10 bg-gradient-to-r from-transparent to-current" />
      <svg width="8" height="8" viewBox="0 0 10 10">
        <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" />
      </svg>
      <span className="h-px w-16 bg-current" />
      <svg width="12" height="12" viewBox="0 0 10 10">
        <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M5 3 L7 5 L5 7 L3 5 Z" fill="currentColor" />
      </svg>
      <span className="h-px w-16 bg-current" />
      <svg width="8" height="8" viewBox="0 0 10 10">
        <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" />
      </svg>
      <span className="h-px w-10 bg-gradient-to-l from-transparent to-current" />
    </span>
  );
}

// Saydam yuvarlak içinde ileri oku (kategori kutuları, "Tümünü gör"). Üst öğe "group" ise üzerine gelince sağa kayar.
export function ArrowBubble({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold-light/60 bg-paper/10 text-gold-light backdrop-blur-sm transition duration-300 group-hover:border-gold-light group-hover:bg-gold-light/20 motion-safe:group-hover:translate-x-1 ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}
