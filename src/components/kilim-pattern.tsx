// Türk kilimi esintili geometrik desen (basamaklı göz motifi, iç baklava, uçlarda koç boynuzu kıvrımları). YALNIZ ana sayfanın
// tanıtım alanında, düşük opaklıkta arka plan dokusu olarak kullanılır (kullanıcı kararı): içerik ve ürün görselleri önde
// kalır; kategori, ürün, sepet ve ödeme yüzeylerinde kullanılmaz. Hafif bir satır içi SVG'dir (görsel dosyası, lisans yok).
// Renkler globals.css'teki bordo (#7a2232) ve gold (#a8842f) ile aynı (tema değişkenleri SVG'de her zaman çıkmayabilir).
export function KilimPattern({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      <defs>
        <pattern id="kilim-desen" width="96" height="96" patternUnits="userSpaceOnUse">
          {/* Basamaklı dış göz */}
          <path
            d="M48 10 L54 16 L54 22 L60 22 L66 28 L66 34 L72 34 L86 48 L72 62 L66 62 L66 68 L60 74 L54 74 L54 80 L48 86 L42 80 L42 74 L36 74 L30 68 L30 62 L24 62 L10 48 L24 34 L30 34 L30 28 L36 22 L42 22 L42 16 Z"
            fill="none"
            stroke="#7a2232"
            strokeWidth="2"
          />
          {/* İç baklava ve göz */}
          <path d="M48 30 L66 48 L48 66 L30 48 Z" fill="none" stroke="#a8842f" strokeWidth="2" />
          <path d="M48 42 L54 48 L48 54 L42 48 Z" fill="#7a2232" />
          {/* Uçlarda koç boynuzu kıvrımları */}
          <path d="M48 10 V4 H54 M48 86 V92 H42 M10 48 H4 V42 M86 48 H92 V54" fill="none" stroke="#7a2232" strokeWidth="2" />
          {/* Köşelerde küçük baklavalar (desen birleşir) */}
          <path d="M0 6 L6 0 M90 0 L96 6 M96 90 L90 96 M6 96 L0 90" stroke="#a8842f" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kilim-desen)" />
    </svg>
  );
}
