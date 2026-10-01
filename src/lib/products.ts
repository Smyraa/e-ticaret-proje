import { getDb } from "./mongodb";

export type Product = {
  slug: string;
  name: string;
  material: string;
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
