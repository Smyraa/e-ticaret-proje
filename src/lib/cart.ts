import { createLocalStore } from "./local-store";

// Sepet tarayıcıda tutulur (favorilerle aynı yöntem). Yalnızca ürün adresi (slug) ve adet saklanır;
// fiyat saklanmaz, böylece fiyat değişirse sepet güncel fiyatı gösterir.
// Hediye paketi ve not kartı tüm sipariş için tek seçenektir; not yalnızca hediye paketi işaretliyken geçerlidir.
export const NOTE_MAX = 200;

export type CartItem = { slug: string; qty: number };
export type Cart = { items: CartItem[]; gift: boolean; note: string };

const EMPTY_CART: Cart = { items: [], gift: false, note: "" };

// Saklanan veri bozuk ya da elle değiştirilmiş olabilir: geçerli olanları alır, aynı ürünü birleştirir.
function parseCart(raw: unknown): Cart {
  if (typeof raw !== "object" || raw === null) return EMPTY_CART;
  const { items, gift, note } = raw as Record<string, unknown>;

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
  };
}

const store = createLocalStore("taura-cart", EMPTY_CART, parseCart);

export const useCart = store.useStore;

function update(change: (cart: Cart) => Cart) {
  store.set(change(store.get()));
}

// stock: ürünün stok adedi. Sepetteki adet stoku aşamaz.
export function addToCart(slug: string, stock: number) {
  update((cart) => {
    const current = cart.items.find((item) => item.slug === slug)?.qty ?? 0;
    const qty = Math.min(current + 1, stock);
    if (qty <= current) return cart; // stok yok ya da sınıra ulaşıldı
    return {
      ...cart,
      items:
        current === 0
          ? [...cart.items, { slug, qty }]
          : cart.items.map((item) => (item.slug === slug ? { ...item, qty } : item)),
    };
  });
}

export function setQuantity(slug: string, qty: number, stock: number) {
  const next = Math.max(1, Math.min(qty, stock));
  update((cart) => ({
    ...cart,
    items: cart.items.map((item) => (item.slug === slug ? { ...item, qty: next } : item)),
  }));
}

export function removeFromCart(slug: string) {
  update((cart) => {
    const items = cart.items.filter((item) => item.slug !== slug);
    return items.length === 0 ? EMPTY_CART : { ...cart, items }; // son ürün çıkınca hediye seçimi de sıfırlanır
  });
}

export function setGift(gift: boolean) {
  update((cart) => ({ ...cart, gift }));
}

export function setNote(note: string) {
  update((cart) => ({ ...cart, note: note.slice(0, NOTE_MAX) }));
}

// Sepetteki toplam adet (ekran okuyucu etiketi için).
export function cartCount(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.qty, 0);
}
