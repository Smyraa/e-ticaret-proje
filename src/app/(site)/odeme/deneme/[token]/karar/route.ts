import { paymentSetup } from "@/lib/payment-config";
import { decideFake, type FakeDecision } from "@/lib/payment-fake";

// Deneme ödeme sayfasındaki seçimi kaydeder (yalnız deneme ödemesi açıkken var, bkz. payment-config.ts). Gerçek kuruluşlar
// gibi müşteriyi geri dönüş adresine POST ile geri gönderir: 307 yönlendirmesi aynı gövdeyi (gizli "token" alanı) taşır.
const CHOICES: FakeDecision[] = ["approve", "decline", "cancel"];

export async function POST(request: Request, { params }: RouteContext<"/odeme/deneme/[token]/karar">) {
  if (paymentSetup().mode !== "fake") return new Response("Bulunamadı", { status: 404 });
  const { token } = await params;

  let choice: FormDataEntryValue | null = null;
  try {
    choice = (await request.formData()).get("karar");
  } catch {
    // gövde okunamadı: aşağıda geçersiz sayılır
  }
  const decision = CHOICES.find((candidate) => candidate === choice);
  if (!decision) return new Response("Geçersiz seçim", { status: 400 });

  if ((await decideFake(token, decision)) === "missing") return new Response("Bulunamadı", { status: 404 });
  return new Response(null, { status: 307, headers: { Location: "/odeme/geri-donus", "Cache-Control": "no-store" } });
}
