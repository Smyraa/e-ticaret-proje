"use client";

import { useEffect } from "react";
import { loadAccount, mergeAccount, saveAccount } from "@/app/(site)/hesabim/actions";
import { cartStore } from "@/lib/cart";
import { EMPTY_CART } from "@/lib/cart-model";
import type { AccountData } from "@/lib/customer-auth";
import { favoritesStore } from "@/lib/favorites";
import { EMPTY_FAVORITES } from "@/lib/favorites-model";

// Bu tarayıcıdaki favori ve sepetin hangi hesapla birleştirildiği (hesap numarası). Birleştirme girişten sonra BİR KEZ
// yapılır; sonra hesaptaki veri esastır (başka cihazda silinen ürün, buradaki eski kopyadan geri gelmesin).
const MARKER = "taura-hesap";
const SAVE_DELAY_MS = 400;

function readMarker(): string | null {
  try {
    return window.localStorage.getItem(MARKER);
  } catch {
    return null;
  }
}

function writeMarker(value: string | null) {
  try {
    if (value) window.localStorage.setItem(MARKER, value);
    else window.localStorage.removeItem(MARKER);
  } catch {
    // Depolama kapalı: her sayfa açılışında yeniden birleştirilir, veri kaybolmaz.
  }
}

const snapshot = () => JSON.stringify({ favorites: favoritesStore.get(), cart: cartStore.get() });

// Favori ve sepeti hesapla eşitler. Ekranda bir şey çizmez; mağaza çerçevesinde bir kez durur.
// - Giriş yapılınca: tarayıcıdakiler hesaptakilerle birleşir.
// - Girişliyken: sayfa açılınca ve sekmeye dönülünce hesaptaki alınır; her değişiklik kısa bir gecikmeyle hesaba yazılır.
// - Çıkış yapılınca (ya da oturum bitince): hesabın favori ve sepeti bu tarayıcıdan silinir (ortak bilgisayarda kalmasın).
export function AccountSync({ customerId }: { customerId: string | null }) {
  useEffect(() => {
    if (!customerId) {
      if (readMarker()) {
        favoritesStore.set(EMPTY_FAVORITES);
        cartStore.set(EMPTY_CART);
        writeMarker(null);
      }
      return;
    }

    let active = true;
    let ready = false; // hesaptaki veri ilk kez alınmadan değişiklik yazılmaz
    let last = ""; // hesaba en son yazılan ya da hesaptan alınan veri
    let timer: ReturnType<typeof setTimeout> | undefined;

    function apply(data: AccountData | null) {
      if (!active || !data) return;
      favoritesStore.set(data.favorites);
      cartStore.set(data.cart);
      last = snapshot();
      ready = true;
    }

    async function pull() {
      try {
        if (readMarker() === customerId) {
          apply(await loadAccount());
        } else {
          apply(await mergeAccount({ favorites: favoritesStore.get(), cart: cartStore.get() }));
          if (active) writeMarker(customerId);
        }
      } catch {
        // Sunucuya ulaşılamadı: tarayıcıdaki veriyle devam edilir, bir sonraki açılışta yeniden denenir.
      }
    }

    function onChange() {
      if (!ready) return;
      const current = snapshot();
      if (current === last) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        last = current;
        saveAccount(JSON.parse(current)).catch(() => {
          last = ""; // yazılamadı: bir sonraki değişiklikte yeniden denenir
        });
      }, SAVE_DELAY_MS);
    }

    // Başka cihazda yapılan değişiklikler, sekmeye dönülünce gelir (bekleyen bir yazma yoksa).
    function onVisible() {
      if (document.visibilityState === "visible" && !timer) void pull();
    }

    void pull();
    const unsubscribe = [favoritesStore.subscribe(onChange), cartStore.subscribe(onChange)];
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearTimeout(timer);
      unsubscribe.forEach((stop) => stop());
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [customerId]);

  return null;
}
