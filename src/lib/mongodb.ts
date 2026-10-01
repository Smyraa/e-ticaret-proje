import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/taura";

// Geliştirme sırasında sayfa her yenilendiğinde yeni bağlantı açılmasın diye istemci globalde tutulur.
const globalForMongo = globalThis as unknown as {
  mongoClient?: Promise<MongoClient>;
};

export async function getDb() {
  try {
    globalForMongo.mongoClient ??= new MongoClient(uri, {
      serverSelectionTimeoutMS: 3000,
    }).connect();
    return (await globalForMongo.mongoClient).db();
  } catch (error) {
    globalForMongo.mongoClient = undefined; // bir sonraki istekte yeniden denensin
    throw error;
  }
}
