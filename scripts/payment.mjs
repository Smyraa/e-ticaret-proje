// iyzico DENEME (sandbox) anahtarlarını bu bilgisayardaki `.env.local` dosyasına yazar (git'e girmez):
//   npm run payment:iyzico   anahtarları sorar (yazarken görünmez), kartla ödemeyi iyzico deneme ortamına açar
//   npm run payment:kapat    kartla ödemeyi kapatır (anahtarları ve PAYMENT_PROVIDER satırını siler)
//   npm run payment:durum    ayarın durumunu gösterir (anahtarların kendisini GÖSTERMEZ)
// Anahtarlar sohbete yazılmaz, ekranda gösterilmez, hiçbir yere kopyalanmaz. Değişiklikten sonra geliştirme sunucusu yeniden başlatılır.
// Canlı anahtarlar bu betikle yazılamaz (yalnız sunucunun ortam ayarlarına konur).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describeEnv, keyProblem, removeEnvVars, setEnvVars } from "./payment-env.mjs";

const root = path.resolve(import.meta.dirname, "..");
const envFile = path.join(root, ".env.local");
const command = process.argv[2];

function fail(message) {
  console.error(`\nHata: ${message}`);
  process.exit(1);
}

// .env.local git'e girmemeli: girebiliyorsa anahtar yazılmaz.
function assertIgnored() {
  const result = spawnSync("git", ["check-ignore", "-q", ".env.local"], { cwd: root });
  if (result.error) return; // git yok: .gitignore'a güvenilir
  if (result.status !== 0) fail(".env.local dosyası git tarafından yok sayılmıyor; anahtar yazılmadı. .gitignore dosyasını kontrol edin.");
}

// Yazarken ekranda göstermeden okur (yapıştırma da çalışır).
function askHidden(question) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) fail("Bu komut etkileşimli çalışmalı: terminalde yazın.");
    process.stdout.write(question);
    const typed = [];
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          done();
          process.stdout.write("\n");
          process.exit(130);
        }
        if (char === "\r" || char === "\n") {
          done();
          process.stdout.write("\n");
          return resolve(typed.join("").trim());
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

const current = () => (existsSync(envFile) ? readFileSync(envFile, "utf8") : "");

async function main() {
  if (command === "status") {
    const info = describeEnv(current());
    console.log(`Kartla ödeme (.env.local): ${info.provider ? `PAYMENT_PROVIDER=${info.provider}` : "kapalı (PAYMENT_PROVIDER yok)"}`);
    console.log(`iyzico API anahtarı: ${info.hasApiKey ? (info.sandboxKey ? "tanımlı (deneme/sandbox)" : "tanımlı (CANLI görünüyor!)") : "tanımlı değil"}`);
    console.log(`iyzico gizli anahtar: ${info.hasSecretKey ? "tanımlı" : "tanımlı değil"}`);
    return;
  }

  if (command === "off") {
    assertIgnored();
    if (!existsSync(envFile)) return console.log("Zaten kapalı: .env.local dosyası yok.");
    writeFileSync(envFile, removeEnvVars(current(), ["PAYMENT_PROVIDER", "IYZICO_API_KEY", "IYZICO_SECRET_KEY", "IYZICO_BASE_URL"]));
    return console.log("Kartla ödeme kapatıldı (.env.local'daki iyzico ayarları silindi). Geliştirme sunucusunu yeniden başlatın.");
  }

  if (command === "iyzico") {
    assertIgnored();
    console.log("iyzico DENEME (sandbox) anahtarları. Hesap: https://sandbox-merchant.iyzipay.com/auth/register");
    console.log("Anahtarlar: Ayarlar → Merchant Settings → API Keys → Show detail. Yazarken görünmez; yapıştırabilirsiniz.\n");
    const apiKey = await askHidden("API Key (sandbox- ile başlar): ");
    const secretKey = await askHidden("Secret Key: ");
    const problem = keyProblem(apiKey, secretKey);
    if (problem) fail(`${problem} Hiçbir şey kaydedilmedi.`);
    writeFileSync(envFile, setEnvVars(current(), { PAYMENT_PROVIDER: "iyzico", IYZICO_API_KEY: apiKey, IYZICO_SECRET_KEY: secretKey }));
    console.log("\nKaydedildi (.env.local; git'e girmez). Kartla ödeme iyzico deneme ortamına açıldı.");
    console.log("Geliştirme sunucusunu yeniden başlatın. Kapatmak için: npm run payment:kapat");
    return;
  }

  fail("Kullanım: npm run payment:iyzico | payment:kapat | payment:durum");
}

await main();
