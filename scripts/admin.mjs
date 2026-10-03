// Yönetici hesaplarını komut satırından yönetir:
//   npm run admin:create   yeni yönetici hesabı açar (e-posta sorar, parolayı gizli sorar)
//   npm run admin:reset    var olan yöneticinin parolasını değiştirir ve açık oturumlarını kapatır
//   npm run admin:list     yönetici e-postalarını listeler
// Parola hiçbir yere yazılmaz ve ekranda gösterilmez; veritabanına yalnızca özeti (hash) kaydedilir.
// Otomatik kullanım için ADMIN_EMAIL ve ADMIN_PASSWORD ortam değişkenleri de verilebilir.
import { createInterface } from "node:readline/promises";
import { MongoClient } from "mongodb";
import { hashPassword, passwordProblem, PASSWORD_MIN_LENGTH } from "../src/lib/password.ts";

const uri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/taura";
const command = process.argv[2];

function fail(message) {
  console.error(`\nHata: ${message}`);
  process.exit(1);
}

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();
const isEmail = (value) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

async function askVisible(question) {
  if (!process.stdin.isTTY) fail("Bu komut etkileşimli çalışmalı (terminalde yazın) ya da ADMIN_EMAIL / ADMIN_PASSWORD verin.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

// Parolayı yazarken ekranda göstermeden okur (yapıştırma da çalışır).
function askHidden(question) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) fail("Bu komut etkileşimli çalışmalı (terminalde yazın) ya da ADMIN_EMAIL / ADMIN_PASSWORD verin.");
    process.stdout.write(question);
    const typed = [];
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          // Ctrl+C
          done();
          process.stdout.write("\n");
          process.exit(130);
        }
        if (char === "\r" || char === "\n") {
          done();
          process.stdout.write("\n");
          return resolve(typed.join(""));
        }
        if (char === "\u007f" || char === "\b") typed.pop();
        else typed.push(char);
      }
    };
    const done = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off("data", onData);
    };
    process.stdin.on("data", onData);
  });
}

async function readNewPassword() {
  if (process.env.ADMIN_PASSWORD !== undefined) return process.env.ADMIN_PASSWORD;
  const password = await askHidden(`Parola (en az ${PASSWORD_MIN_LENGTH} karakter; yazarken görünmez): `);
  const again = await askHidden("Parolayı tekrar yazın: ");
  if (password !== again) fail("Parolalar aynı değil. Hiçbir şey kaydedilmedi.");
  return password;
}

async function ensureIndexes(db) {
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await db.collection("loginAttempts").createIndex({ resetAt: 1 }, { expireAfterSeconds: 0 });
}

async function main() {
  if (!["create", "reset", "list"].includes(command)) {
    fail("Kullanım: npm run admin:create | admin:reset | admin:list");
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection("users");

    if (command === "list") {
      const all = await users.find({}, { projection: { email: 1, createdAt: 1 } }).sort({ createdAt: 1 }).toArray();
      if (all.length === 0) console.log("Henüz yönetici hesabı yok. Açmak için: npm run admin:create");
      for (const user of all) console.log(`${user.email}  (açılış: ${user.createdAt?.toISOString().slice(0, 10) ?? "?"})`);
      return;
    }

    const email = normalizeEmail(process.env.ADMIN_EMAIL ?? (await askVisible("Yönetici e-postası: ")));
    if (!isEmail(email)) fail("Geçerli bir e-posta adresi yazın.");

    if (command === "create") {
      if (await users.findOne({ email })) fail(`${email} için hesap zaten var. Parolayı değiştirmek için: npm run admin:reset`);
      const password = await readNewPassword();
      const problem = passwordProblem(password);
      if (problem) fail(problem);
      await ensureIndexes(db);
      await users.insertOne({ email, passwordHash: await hashPassword(password), role: "admin", createdAt: new Date() });
      console.log(`\nYönetici hesabı oluşturuldu: ${email}\nGiriş sayfası: /yonetim/giris`);
    } else {
      const user = await users.findOne({ email });
      if (!user) fail(`${email} için hesap yok. Açmak için: npm run admin:create`);
      const password = await readNewPassword();
      const problem = passwordProblem(password);
      if (problem) fail(problem);
      await users.updateOne({ _id: user._id }, { $set: { passwordHash: await hashPassword(password), updatedAt: new Date() } });
      const closed = await db.collection("sessions").deleteMany({ userId: user._id });
      console.log(`\nParola değiştirildi: ${email}\nAçık oturumlar kapatıldı (${closed.deletedCount}); yeniden giriş yapılmalı.`);
    }
  } catch (error) {
    if (error?.name === "MongoServerSelectionError") fail("MongoDB'ye bağlanılamadı. Veritabanı çalışıyor mu? (127.0.0.1:27017)");
    throw error;
  } finally {
    await client.close();
  }
}

await main();
