import Link from "next/link";

const TABS = [
  { key: "site", href: "/yonetim/ayarlar", label: "Site ayarları" },
  { key: "hesap", href: "/yonetim/hesap", label: "Hesap ve parola" },
] as const;

// Ayarlar menüsünün altındaki iki sayfa arasında geçiş (üst menüde yer kazanmak için "Hesap" burada).
export function SettingsTabs({ current }: { current: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Ayarlar bölümleri" className="mt-6 flex flex-wrap gap-x-6 border-b border-line text-sm">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === current ? "page" : undefined}
          className={`inline-flex min-h-11 items-center border-b-2 transition hover:text-primary ${
            tab.key === current ? "border-primary font-semibold text-primary" : "border-transparent text-muted"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
