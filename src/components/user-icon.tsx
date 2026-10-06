// Kişi simgesi (üst menüdeki hesap bağlantısı için). Giriş yapılmışsa dolu çizilir.
export function UserIcon({ filled = false, size = 22 }: { filled?: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="8" r="4" fill={filled ? "currentColor" : "none"} />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}
