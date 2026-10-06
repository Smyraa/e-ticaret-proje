import { NOTE_MAX } from "./gift-note";

// Sepetin biçimi ve okuyucusu. Hem tarayıcıda (cart.ts) hem sunucuda (hesapta saklanan sepet) kullanılır; bu yüzden
// tarayıcıya özgü bir şey içermez.

export type CartItem = { slug: string; qty: number };
export type Cart = { items: CartItem[]; gift: boolean; note: string; coupon?: string }; // coupon: uygulanan kupon kodu

export const EMPTY_CART: Cart = { items: [], gift: false, note: "" };

// Saklanan veri bozuk ya da elle değiştirilmiş olabilir: geçerli olanları alır, aynı ürünü birleştirir.
export function parseCart(raw: unknown): Cart {
  if (typeof raw !== "object" || raw === null) return EMPTY_CART;
  const { items, gift, note, coupon } = raw as Record<string, unknown>;

  const quantities = new Map<string, number>();
  if (Array.isArray(items)) {
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue;
      const { slug, qty } = item as Record<string, unknown>;
      if (typeof slug !== "string" || typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) continue;
      quantities.set(slug, (quantities.get(slug) ?? 0) + qty);
    }
  }

  return {
    items: [...quantities].map(([slug, qty]) => ({ slug, qty })),
    gift: gift === true,
    note: typeof note === "string" ? note.slice(0, NOTE_MAX) : "",
    ...(typeof coupon === "string" && /^[A-Z0-9-]{3,20}$/.test(coupon) ? { coupon } : {}),
  };
}
