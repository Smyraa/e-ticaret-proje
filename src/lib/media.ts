// Veritabanında yalnızca dosya adı tutulur; adres burada üretilir.
// Geliştirmede /media isteğini uygulama (src/app/media) karşılar; yayında Nginx doğrudan diskten verecek.
export const mediaUrl = (file: string) => `/media/${file}`;
