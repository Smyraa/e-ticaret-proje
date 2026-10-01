// Örnek (temsili) ürünleri yerel MongoDB'ye yazar. Tekrar çalıştırılabilir.
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/taura";

const products = [
  { slug: "ornek-damla-kehribar", name: "Örnek Damla Kehribar Tesbih", material: "Damla kehribar", price: 8900, stock: 2, sample: true },
  { slug: "ornek-sikma-kehribar", name: "Örnek Sıkma Kehribar Tesbih", material: "Sıkma kehribar", price: 4850, stock: 3, sample: true },
  { slug: "ornek-kuka", name: "Örnek Kuka Tesbih", material: "Kuka", price: 3400, stock: 1, sample: true },
  { slug: "ornek-narcil", name: "Örnek Narçıl Tesbih", material: "Narçıl", price: 2650, stock: 4, sample: true },
];

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
try {
  await client.connect();
  const collection = client.db().collection("products");
  await collection.deleteMany({ sample: true });
  await collection.insertMany(products);
  console.log(`${products.length} örnek ürün yazıldı.`);
} finally {
  await client.close();
}
