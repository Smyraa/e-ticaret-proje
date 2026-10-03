// WhatsApp numarası site ayarlarından gelir (yönetim paneli → Site ayarları): ülke koduyla yalnız rakamlar
// (örn. 905551112233). Numara girilene kadar yer tutucu kullanılır. Yer tutucu geçersizdir (Türkiye numaraları
// ülke kodundan sonra 0 ile başlamaz): WhatsApp "geçersiz numara" der, hiçbir gerçek kişiye ulaşılmaz.
export const PLACEHOLDER_NUMBER = "900000000000";

// Ayarlarda numara yoksa true: arayüzde demo uyarısı gösterilir.
export const usesPlaceholder = (configured: string): boolean => !configured;

// Yer tutucu numara kullanılırken WhatsApp düğmelerinin altında gösterilen demo uyarısı.
export const placeholderNumberNote =
  "Demo sürümünde WhatsApp numarası henüz tanımlı değil; WhatsApp numaranın geçersiz olduğunu söyleyebilir.";

// wa.me: WhatsApp'ın herkese açık kısayol adresi. Tıklayınca WhatsApp açılır, mesaj kutusu hazır yazılı gelir.
// Mesajdaki boşluk ve Türkçe harfler adreste kodlanır (encodeURIComponent).
export function whatsappLink(configured: string, message: string): string {
  return `https://wa.me/${configured || PLACEHOLDER_NUMBER}?text=${encodeURIComponent(message)}`;
}

// Ürün sayfasındaki "WhatsApp ile sor" mesajı. productUrl boş ise (adres henüz bilinmiyorsa) bağlantı eklenmez.
export function questionMessage(productName: string, productUrl: string): string {
  return productUrl
    ? `Merhaba, ${productName} hakkında bilgi almak istiyorum: ${productUrl}`
    : `Merhaba, ${productName} hakkında bilgi almak istiyorum.`;
}
