// Örnek (temsili) ürünleri ve örnek görselleri hazırlar. Tekrar çalıştırılabilir.
import path from "node:path";
import { MongoClient } from "mongodb";
import { createSampleImages } from "./sample-images.mjs";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/taura";

const story =
  "Bu alanda ürünün hikâyesi anlatılır: malzemenin nereden geldiği, nasıl işlendiği ve neden özel olduğu. Şu an gösterilen metin örnektir.";
const craft = "Örnek bilgi. Gerçek işçilik açıklaması ürün eklenirken yazılacak.";

const products = [
  { slug: "ornek-damla-kehribar", name: "Örnek Damla Kehribar Tesbih", material: "Damla kehribar", size: "9 mm tane · 33 tane", weight: "48 g", craft, story, price: 8900, stock: 2, sample: true },
  { slug: "ornek-sikma-kehribar", name: "Örnek Sıkma Kehribar Tesbih", material: "Sıkma kehribar", size: "8 mm tane · 33 tane", weight: "44 g", craft, story, price: 4850, stock: 3, sample: true },
  { slug: "ornek-kuka", name: "Örnek Kuka Tesbih", material: "Kuka", size: "8 mm tane · 33 tane", weight: "38 g", craft, story, price: 3400, stock: 1, sample: true },
  { slug: "ornek-narcil", name: "Örnek Narçıl Tesbih", material: "Narçıl", size: "7 mm tane · 33 tane", weight: "30 g", craft, story, price: 2650, stock: 4, sample: true },
];

// Çizim örnek görselleri media/ klasörüne yazılır; veritabanında yalnızca dosya adı tutulur.
const files = await createSampleImages(path.join(process.cwd(), "media"));
for (const product of products) {
  product.images = [files[product.slug]];
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
try {
  await client.connect();
  const collection = client.db().collection("products");
  await collection.deleteMany({ sample: true });
  await collection.insertMany(products);
  console.log(`${products.length} örnek ürün ve ${products.length} örnek görsel yazıldı.`);
} finally {
  await client.close();
}
