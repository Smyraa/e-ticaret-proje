import { NOTE_MAX } from "./gift-note";
import { EMPTY_CART, parseCart, type Cart } from "./cart-model";
import { createLocalStore } from "./local-store";

export { NOTE_MAX };
export type { Cart, CartItem } from "./cart-model";

// Sepet tarayıcıda tutulur (favorilerle aynı yöntem); giriş yapılınca hesapla eşitlenir. Yalnızca ürün adresi (slug) ve adet saklanır;
// fiyat saklanmaz, böylece fiyat değişirse sepet güncel fiyatı gösterir.
// Hediye paketi ve not kartı tüm sipariş için tek seçenektir; not yalnızca hediye paketi işaretliyken geçerlidir.

const store = createLocalStore("taura-cart", EMPTY_CART, parseCart);

export const useCart = store.useStore;
export const cartStore = store; // hesap eşitlemesi için (account-sync.tsx)

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

// Sipariş verildikten sonra sepet boşaltılır.
export function clearCart() {
  update(() => EMPTY_CART);
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
