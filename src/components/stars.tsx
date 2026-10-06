// Puan gösterimi: 5 yıldızdan dolu olanlar gold. Ekran okuyucu "5 üzerinden 4" okur (yıldızlar gizli).
export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`5 üzerinden ${rounded.toLocaleString("tr-TR")} puan`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} fill={rounded >= n ? 1 : rounded >= n - 0.5 ? 0.5 : 0} size={size} />
      ))}
    </span>
  );
}

export function StarIcon({ fill, size = 16 }: { fill: 0 | 0.5 | 1; size?: number }) {
  const id = `yari-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="text-gold">
      {fill === 0.5 && (
        <defs>
          <linearGradient id={id}>
            <stop offset="50%" stopColor="currentColor" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"
        fill={fill === 1 ? "currentColor" : fill === 0.5 ? `url(#${id})` : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
