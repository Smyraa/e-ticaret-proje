import type { MetadataRoute } from "next";
import { indexingAllowed } from "@/lib/site";

// /robots.txt: demo sürümünde her şey kapalı; açıkken kişiye özel sayfalar yine kapalı kalır.
export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return { rules: { userAgent: "*", allow: "/", disallow: ["/sepet", "/odeme", "/favoriler"] } };
}
