import { clientAddress } from "@/lib/client-address";
import { getOrderByNumber } from "@/lib/orders";
import { PAYMENT_TOKEN_PATTERN } from "@/lib/payment-model";
import { confirmPaymentByToken } from "@/lib/payments";
import { allowRequest } from "@/lib/rate-limit";

// Ödeme sayfasından dönüş adresi: ödeme kuruluşu müşteriyi buraya, ödeme oturumunun anahtarıyla (token) POST ederek gönderir.
// Bu adres herkese açıktır ve gelen hiçbir şeye güvenilmez: yalnız anahtarın bizim açtığımız bir ödemeye ait olup olmadığına
// bakılır, ödemenin sonucu ise kuruluştan SUNUCUDAN sorulur (confirmPaymentByToken). Yanıt her durumda müşteriyi sipariş
// sayfasına yönlendirir; sayfa gerçek durumu veritabanından gösterir. `?yeni=1`: sipariş artık kesinleştiği için sepet boşaltılır.

const see = (location: string) =>
  new Response(null, { status: 303, headers: { Location: location, "Cache-Control": "no-store" } });

async function readToken(request: Request): Promise<string> {
  try {
    const value = (await request.formData()).get("token");
    return typeof value === "string" ? value.trim() : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const token = await readToken(request);
  if (!PAYMENT_TOKEN_PATTERN.test(token)) return see("/"); // biçimi tutmayan değer veritabanına gitmeden elenir

  try {
    if (!(await allowRequest(`odeme-donus|${await clientAddress()}`, 60, 10))) {
      return new Response("Kısa sürede çok fazla istek geldi. Birkaç dakika sonra yeniden deneyin.", { status: 429 });
    }
    const outcome = await confirmPaymentByToken(token);
    if (outcome.kind === "unknown") return see("/");
    const order = await getOrderByNumber(outcome.payment.orderNumber);
    return see(order ? `/siparis/${order.trackKey}?yeni=1` : "/");
  } catch (error) {
    console.error("Ödeme dönüşü işlenemedi", error);
    return new Response(
      "Ödeme sonucu şu an işlenemedi. Biraz sonra sipariş sayfanızdan “Ödememi kontrol et” düğmesini deneyin.",
      { status: 500 },
    );
  }
}

// Adres tarayıcıda elle açılırsa ana sayfaya gönderilir.
export function GET() {
  return see("/");
}
