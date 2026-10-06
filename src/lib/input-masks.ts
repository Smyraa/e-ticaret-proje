// Yazarken uygulanan biçimler (maske): kutuya fazladan ya da yanlış türde karakter girilemez. Sunucu yine kendi
// denetimini yapar; maske yalnızca yazmayı kolaylaştırır.

// Türkiye telefonu: "0555 111 22 33". Başında 0 yoksa eklenir; "+90 …" ya da "0090 …" yapıştırılırsa ülke kodu atılır;
// 11 rakamdan fazlası alınmaz.
export function maskPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("90") && digits.length > 10) digits = digits.slice(2);
  if (digits && !digits.startsWith("0")) digits = `0${digits}`;
  digits = digits.slice(0, 11);
  return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)].filter(Boolean).join(" ");
}

// Kayıtlı telefonu (905551112233) kutudaki biçime çevirir.
export const phoneForInput = (digits: string) => maskPhone(digits.startsWith("90") ? digits.slice(2) : digits);

// Posta kodu: yalnız rakam, en çok 5.
export const maskPostalCode = (value: string) => value.replace(/\D/g, "").slice(0, 5);
