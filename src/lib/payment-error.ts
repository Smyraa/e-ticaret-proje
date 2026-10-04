// Ödeme kuruluşuyla konuşurken bir sorun çıktığında fırlatılır (ağ hatası, beklenmeyen ya da doğrulanamayan yanıt). İleti
// günlüğe yazılır; müşteriye ya da yönetime olduğu gibi gösterilmez. Saf dosya: kuruluşlara özgü saf yardımcılar da kullanır.
export class PaymentError extends Error {}
