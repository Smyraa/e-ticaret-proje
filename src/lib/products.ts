import { cache } from "react";
import { getDb } from "./mongodb";

export type Product = {
  slug: string;
  name: string;
  material: string;
  size: string; // ör. "8 mm tane · 33 tane"
  weight: string; // ör. "42 g"
  craft: string; // işçilik bilgisi
  story: string; // zanaat / koleksiyon hikâyesi
  images: string[]; // media/ klasöründeki dosya adları (ilki ana görsel)
  price: number; // TL
  stock: number;
  sample: boolean; // örnek (temsili) içerik
};

export async function getProducts(): Promise<Product[]> {
  const db = await getDb();
  const products = await db
    .collection<Product>("products")
    .find({}, { projection: { _id: 0 } })
    .sort({ name: 1 })
    .toArray();
  return products;
}

// cache(): aynı istek içinde (sayfa + başlık) tekrar sorgulanmasın.
export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  const db = await getDb();
  return db.collection<Product>("products").findOne({ slug }, { projection: { _id: 0 } });
});
