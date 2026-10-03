// E-posta adresi denetimi (site ayarları ve ödeme formu ortak kullanır). Gerçek doğrulama, adrese ulaşabilmektir;
// burada yalnızca açık yazım hataları elenir.
export const EMAIL_MAX = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const EMAIL_ERROR = "Geçerli bir e-posta adresi yazın (örn. ad@ornek.com).";

export const isEmail = (value: string) => value.length <= EMAIL_MAX && EMAIL_PATTERN.test(value);
