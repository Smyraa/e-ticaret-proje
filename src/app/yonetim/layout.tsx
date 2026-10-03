import type { Metadata } from "next";

// Yönetim alanı arama motorlarına her zaman kapalıdır (demo ya da canlı fark etmez).
export const metadata: Metadata = {
  title: "Yönetim · TAURA",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/yonetim">) {
  return <div className="flex min-h-screen flex-1 flex-col bg-soft">{children}</div>;
}
