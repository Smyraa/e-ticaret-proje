"use server";

import { getProductsBySlugs, type Product } from "@/lib/products";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// "Son baktıklarınız" için: tarayıcının gönderdiği adreslerdeki YAYINDAKİ ürünler, gönderilen sırayla (en çok 8).
// Girdi tarayıcıdan geldiği için sıkı süzülür; okunamazsa boş liste döner (bölüm görünmez).
export async function recentProducts(raw: unknown): Promise<Product[]> {
  if (!Array.isArray(raw)) return [];
  const slugs = [
    ...new Set(raw.filter((slug): slug is string => typeof slug === "string" && slug.length <= 80 && SLUG_PATTERN.test(slug))),
  ].slice(0, 8);
  if (slugs.length === 0) return [];
  try {
    const bySlug = new Map((await getProductsBySlugs(slugs)).map((product) => [product.slug, product]));
    return slugs.map((slug) => bySlug.get(slug)).filter((product): product is Product => Boolean(product));
  } catch (error) {
    console.error("Son bakılan ürünler okunamadı", error);
    return [];
  }
}
