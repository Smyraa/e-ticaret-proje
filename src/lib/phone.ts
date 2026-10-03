// Telefon numarasını tek biçime çevirir: ülke koduyla yalnız rakamlar (örn. 905551112233).
// Kabul edilenler: "0555 111 22 33", "555 111 22 33", "+90 555 111 22 33", "0090 555 111 22 33",
// "(0212) 123 45 67", "90 555 111 22 33"; yurtdışı için "+49 …" ya da "0049 …" (ülke koduyla).
// Boş yazı "" döner; geçersizse null. WhatsApp bağlantısı (wa.me) ve tel: bağlantısı bu biçimi kullanır.
export function normalizePhone(input: string): string | null {
  const text = input.trim();
  if (text === "") return "";
  if (/[^\d\s+()\-.]/.test(text) || text.slice(1).includes("+")) return null; // harf vb. ya da ortada artı

  const digits = text.replace(/\D/g, "");
  let number: string;
  if (text.startsWith("+")) number = digits;
  else if (digits.startsWith("00")) number = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) number = `90${digits.slice(1)}`;
  else if (digits.length === 10) number = `90${digits}`;
  else if (digits.length === 12 && digits.startsWith("90")) number = digits;
  else return null;

  // Türkiye numarası: 90 + 10 hane, ilk hane 1-9 ("900000000000" gibi yer tutucular geçersizdir).
  if (number.startsWith("90")) return /^90[1-9]\d{9}$/.test(number) ? number : null;
  return /^[1-9]\d{7,14}$/.test(number) ? number : null;
}

// Okunaklı gösterim: "+90 555 111 22 33" (Türkiye) ya da "+49151…" (diğer ülkeler, olduğu gibi).
export function formatPhone(digits: string): string {
  if (/^90[1-9]\d{9}$/.test(digits)) {
    return `+90 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }
  return digits ? `+${digits}` : "";
}
