import { useSyncExternalStore } from "react";

const subscribeNone = () => () => {};

// Sunucuda ve ilk çizimde false, tarayıcıda hazır olunca true.
// Tarayıcıda saklanan veri (favoriler, sepet) okunmadan "boş" iletisi bir an görünmesin diye kullanılır.
export function useReady(): boolean {
  return useSyncExternalStore(subscribeNone, () => true, () => false);
}
