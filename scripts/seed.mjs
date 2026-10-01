// Örnek (temsili) ürünleri ve örnek görselleri (ürün görselleri + ana sayfa görseli) hazırlar. Tekrar çalıştırılabilir.
import path from "node:path";
import { MongoClient } from "mongodb";
import { createHeroImage, createSampleImages } from "./sample-images.mjs";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/taura";

const story =
  "Bu alanda ürünün hikâyesi anlatılır: malzemenin nereden geldiği, nasıl işlendiği ve neden özel olduğu. Şu an gösterilen metin örnektir.";
const craft = "Örnek bilgi. Gerçek işçilik açıklaması ürün eklenirken yazılacak.";

const products = [
  { slug: "ornek-damla-kehribar", name: "Örnek Damla Kehribar Tesbih", material: "Damla kehribar", size: "9 mm tane · 33 tane", weight: "48 g", craft, story, price: 8900, stock: 2, sample: true },
  { slug: "ornek-sikma-kehribar", name: "Örnek Sıkma Kehribar Tesbih", material: "Sıkma kehribar", size: "8 mm tane · 33 tane", weight: "44 g", craft, story, price: 4850, stock: 3, sample: true },
  { slug: "ornek-kuka", name: "Örnek Kuka Tesbih", material: "Kuka", size: "8 mm tane · 33 tane", weight: "38 g", craft, story, price: 3400, stock: 1, sample: true },
  { slug: "ornek-narcil", name: "Örnek Narçıl Tesbih", material: "Narçıl", size: "7 mm tane · 33 tane", weight: "30 g", craft, story, price: 2650, stock: 4, sample: true },
  { slug: "ornek-damla-kehribar-acik", name: "Örnek Damla Kehribar Tesbih (Açık Ton)", material: "Damla kehribar", size: "10 mm tane · 33 tane", weight: "56 g", craft, story, price: 12400, stock: 1, sample: true },
  { slug: "ornek-oltu-tasi", name: "Örnek Oltu Taşı Tesbih", material: "Oltu taşı", size: "8 mm tane · 33 tane", weight: "36 g", craft, story, price: 3900, stock: 3, sample: true },
  { slug: "ornek-abanoz", name: "Örnek Abanoz Tesbih", material: "Abanoz", size: "8 mm tane · 33 tane", weight: "40 g", craft, story, price: 3100, stock: 5, sample: true },
  { slug: "ornek-narcil-koyu", name: "Örnek Narçıl Tesbih (Koyu Ton)", material: "Narçıl", size: "7 mm tane · 33 tane", weight: "31 g", craft, story, price: 2950, stock: 0, sample: true },
];

// Çizim örnek görselleri media/ klasörüne yazılır; veritabanında yalnızca dosya adı tutulur.
const mediaDir = path.join(process.cwd(), "media");
const files = await createSampleImages(mediaDir);
const heroImage = await createHeroImage(mediaDir);
for (const product of products) {
  product.images = [files[product.slug]];
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
try {
  await client.connect();
  const collection = client.db().collection("products");
  await collection.deleteMany({ sample: true });
  await collection.insertMany(products);
  // Ana sayfa görselinin adı ayarlarda tutulur; diğer ayarlara dokunulmaz.
  await client.db().collection("settings").updateOne({ _id: "site" }, { $set: { heroImage } }, { upsert: true });
  console.log(`${products.length} örnek ürün, ${products.length} örnek görsel ve ana sayfa görseli yazıldı.`);
} finally {
  await client.close();
}
