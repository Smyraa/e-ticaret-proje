"use server";

import { normalizeCode } from "@/lib/coupon-model";
import { checkCoupon } from "@/lib/coupons";
import { getCustomer } from "@/lib/customer-auth";
import { buildOrderItems } from "@/lib/order-build";
import { getProductsBySlugs } from "@/lib/products";
import { allowRequest } from "@/lib/rate-limit";
import { clientAddress } from "@/lib/client-address";

export type CouponPreview =
  | { ok: true; code: string; label: string; discount: number; subtotal: number }
  | { ok: false; code: string; message: string };

// Sepette "Uygula": kodu ve indirimi sunucuda denetler (ayırmaz; asıl ayırma sipariş verilirken). Sepet satırları tarayıcıdan
// gelir: ürün ve fiyatlar veritabanından yeniden okunur, tarayıcının tuttuğu tutara güvenilmez. Kod denemesi sınırlıdır.
export async function previewCoupon(rawCode: string, lines: { slug: string; qty: number }[], email?: string): Promise<CouponPreview> {
  const code = normalizeCode(String(rawCode ?? "")).slice(0, 20);
  if (!/^[A-Z0-9-]{3,20}$/.test(code)) return { ok: false, code, message: "Geçerli bir kupon kodu yazın." };
  if (!(await allowRequest(`kupon|${await clientAddress()}`, 30, 10))) {
    return { ok: false, code, message: "Kısa sürede çok fazla kupon denendi. Biraz sonra yeniden deneyin." };
  }
  const safeLines = (Array.isArray(lines) ? lines : [])
    .filter((line) => typeof line?.slug === "string" && Number.isInteger(line?.qty) && line.qty > 0 && line.qty <= 99)
    .slice(0, 30);
  try {
    const [customer, products] = await Promise.all([
      getCustomer().catch(() => null),
      getProductsBySlugs(safeLines.map((line) => line.slug)),
    ]);
    const built = buildOrderItems(products, safeLines);
    const subtotal = built.ok ? built.subtotal : 0;
    const guestEmail = typeof email === "string" && email.length <= 120 ? email.trim().toLowerCase() : null;
    const result = await checkCoupon(code, subtotal, { customerId: customer?.id ?? null, email: customer ? null : guestEmail });
    return result.ok
      ? { ok: true, code, label: result.label, discount: result.discount, subtotal }
      : { ok: false, code, message: result.message };
  } catch (error) {
    console.error("Kupon denetlenemedi", error);
    return { ok: false, code, message: "Kupon şu an denetlenemedi. Biraz sonra yeniden deneyin." };
  }
}
