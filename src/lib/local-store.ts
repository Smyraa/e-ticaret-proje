import { useSyncExternalStore } from "react";

// Değeri tarayıcıda (localStorage) tutan küçük bir "depo" üretir; favoriler ve sepet bunu kullanır.
// Değer değişince onu kullanan tüm bileşenler güncellenir; başka açık sekmelerde de eşitlenir.
// Giriş gerekmez, ama veri başka cihaza ya da tarayıcıya taşınmaz.
// Yalnızca tarayıcı bileşenlerinden (use client) çağrılmalıdır.
export function createLocalStore<T>(key: string, empty: T, parse: (raw: unknown) => T) {
  let loaded = false;
  let current = empty; // son okunan değer (değişmedikçe aynı nesne döner)
  const listeners = new Set<() => void>();

  function read(): T {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? empty : parse(JSON.parse(raw));
    } catch {
      return empty; // depolama kapalı ya da kayıt bozuk
    }
  }

  function get(): T {
    if (!loaded) {
      current = read();
      loaded = true;
    }
    return current;
  }

  function emit() {
    listeners.forEach((listener) => listener());
  }

  // Başka bir sekmede değişiklik olursa değer burada da güncellenir.
  function onStorage(event: StorageEvent) {
    if (event.key === key || event.key === null) {
      current = read();
      loaded = true;
      emit();
    }
  }

  function subscribe(listener: () => void) {
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  }

  function set(next: T) {
    if (next === get()) return; // değişiklik yok
    current = next;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Depolama yazılamıyorsa değer bu sayfa açıkken geçici kalır.
    }
    emit();
  }

  // Sunucuda her zaman boş değer döner; tarayıcı hazır olunca gerçek değer gelir.
  function useStore(): T {
    return useSyncExternalStore(subscribe, get, () => empty);
  }

  return { get, set, useStore };
}
