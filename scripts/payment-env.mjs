// `.env.local` metnini okuyup değiştiren SAF yardımcılar (dosyaya ve ekrana dokunmaz; scripts/payment.mjs bunları kullanır).

const NAME = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;

// Metindeki değişkenleri günceller ya da sona ekler; diğer satırlara (yorumlar dahil) dokunmaz. Aynı değişken birden çok
// kez tanımlıysa ilki güncellenir, ötekiler silinir. Sonuç tek bir satır sonuyla biter.
export function setEnvVars(text, vars) {
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  const done = new Set();
  const out = [];
  for (const line of lines) {
    const name = NAME.exec(line)?.[1];
    if (name && Object.hasOwn(vars, name)) {
      if (!done.has(name)) out.push(`${name}=${vars[name]}`);
      done.add(name);
      continue;
    }
    out.push(line);
  }
  for (const [name, value] of Object.entries(vars)) if (!done.has(name)) out.push(`${name}=${value}`);
  return out.join("\n") + "\n";
}

// Verilen değişkenlerin tanımlarını siler.
export function removeEnvVars(text, names) {
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  const kept = lines.filter((line) => !names.includes(NAME.exec(line)?.[1] ?? ""));
  return kept.length === 0 ? "" : kept.join("\n") + "\n";
}

// Değişkenin değeri (yoksa undefined). Tırnaklar ve satır sonu yorumları ele alınmaz: bu dosyayı yalnız bu betik yazar.
export function readEnvVar(text, name) {
  for (const line of text.split(/\r?\n/)) {
    const match = NAME.exec(line);
    if (match?.[1] === name) return line.slice(match[0].length).trim();
  }
  return undefined;
}

// Ekrana yazılacak durum özeti: anahtarların kendisi ASLA yazılmaz.
export function describeEnv(text) {
  const provider = readEnvVar(text, "PAYMENT_PROVIDER") ?? "";
  const apiKey = readEnvVar(text, "IYZICO_API_KEY") ?? "";
  const secret = readEnvVar(text, "IYZICO_SECRET_KEY") ?? "";
  return { provider, hasApiKey: apiKey !== "", hasSecretKey: secret !== "", sandboxKey: apiKey.startsWith("sandbox-") };
}

// Girilen anahtarların kabul edilebilirliği: sorun varsa açıklaması, yoksa null. Bu bilgisayarda yalnız deneme anahtarı kullanılır.
export function keyProblem(apiKey, secretKey) {
  if (!apiKey || !secretKey) return "API anahtarı ve gizli anahtar boş olamaz.";
  if (/\s/.test(apiKey) || /\s/.test(secretKey)) return "Anahtarlarda boşluk ya da satır sonu olmamalı; yapıştırırken fazladan karakter kalmış olabilir.";
  if (!apiKey.startsWith("sandbox-")) {
    return "Bu bilgisayarda yalnızca deneme (sandbox) anahtarı kullanılır: API anahtarı 'sandbox-' ile başlamalı. Canlı anahtar yalnız sunucunun ortam ayarlarına yazılır.";
  }
  return null;
}
