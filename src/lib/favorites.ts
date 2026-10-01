import { useSyncExternalStore } from "react";

// Favoriler tarayıcıda (localStorage) tutulur: giriş gerekmez, başka cihaza taşınmaz.
// Küçük bir "depo": kartlardaki kalpler, üst menüdeki sayı ve favoriler sayfası aynı listeyi paylaşır.
// Yalnızca tarayıcı bileşenlerinden (use client) çağrılmalıdır.
const KEY = "taura-favorites";
const EMPTY: string[] = [];

let cache: string[] | null = null; // son okunan liste (değişmedikçe aynı nesne döner)
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return []; // depolama kapalı ya da bozuk: boş liste
  }
}

function getSnapshot(): string[] {
  cache ??= read();
  return cache;
}

function emit() {
  listeners.forEach((listener) => listener());
}

// Başka bir sekmede değişiklik olursa liste burada da güncellenir.
function onStorage(event: StorageEvent) {
  if (event.key === KEY || event.key === null) {
    cache = read();
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

export function toggleFavorite(slug: string) {
  const current = getSnapshot();
  const next = current.includes(slug)
    ? current.filter((item) => item !== slug)
    : [...current, slug];
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Depolama yazılamıyorsa favoriler bu sayfa açıkken geçici kalır.
  }
  emit();
}

// Sunucuda boş liste döner; tarayıcı hazır olunca gerçek liste gelir.
export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
