// WhatsApp numarası tek yerde tutulur. Gerçek numara gelince .env.local dosyasına
// NEXT_PUBLIC_WHATSAPP_NUMBER=... yazılır: ülke koduyla, artı ve boşluk olmadan (örn. 905551112233).
// Değişken derleme sırasında sayfa koduna gömülür; değiştirince geliştirme sunucusu yeniden başlatılır
// ya da uygulama yeniden derlenir.
//
// Numara gelene kadar yer tutucu kullanılır. Yer tutucu geçersizdir (Türkiye numaraları ülke kodundan
// sonra 0 ile başlamaz): WhatsApp "geçersiz numara" der, hiçbir gerçek kişiye ulaşılmaz.
export const PLACEHOLDER_NUMBER = "900000000000";

const configured = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

export const whatsappNumber = configured || PLACEHOLDER_NUMBER;

// Numara henüz tanımlanmadıysa true: arayüzde demo uyarısı gösterilir.
export const usesPlaceholderNumber = whatsappNumber === PLACEHOLDER_NUMBER;

// Yer tutucu numara kullanılırken WhatsApp düğmelerinin altında gösterilen demo uyarısı.
export const placeholderNumberNote =
  "Demo sürümünde WhatsApp numarası henüz tanımlı değil; WhatsApp numaranın geçersiz olduğunu söyleyebilir.";

// wa.me: WhatsApp'ın herkese açık kısayol adresi. Tıklayınca WhatsApp açılır, mesaj kutusu hazır yazılı gelir.
// Mesajdaki boşluk ve Türkçe harfler adreste kodlanır (encodeURIComponent).
export function whatsappLink(message: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

// Ürün sayfasındaki "WhatsApp ile sor" mesajı. productUrl boş ise (adres henüz bilinmiyorsa) bağlantı eklenmez.
export function questionMessage(productName: string, productUrl: string): string {
  return productUrl
    ? `Merhaba, ${productName} hakkında bilgi almak istiyorum: ${productUrl}`
    : `Merhaba, ${productName} hakkında bilgi almak istiyorum.`;
}
