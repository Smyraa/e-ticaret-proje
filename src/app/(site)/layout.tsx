import { SiteShell } from "@/components/site-shell";

// Mağaza sayfaları (rota grubu "(site)": adreste görünmez) ortak çerçeveyi buradan alır.
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <SiteShell>{children}</SiteShell>;
}
