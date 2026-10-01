// Kalp simgesi: dolu (favori) ya da yalnızca çizgili.
export function HeartIcon({ filled = false, size = 22 }: { filled?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 21C5 15.5 3 12 3 8.8A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 9 1.8C21 12 19 15.5 12 21Z" />
    </svg>
  );
}
