// Girişten sonra dönülecek sayfa: yalnızca bu sitenin bir sayfası olabilir (başka siteye yönlendirme yapılamasın).
export function safeReturn(value: unknown): string {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : "/hesabim";
}
