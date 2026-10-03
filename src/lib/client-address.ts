import "server-only";

import { headers } from "next/headers";

// İstemcinin bağlantı adresi (deneme sınırları ve hız sınırları için). Canlıda Nginx, gördüğü adresi
// X-Forwarded-For başlığının SONUNA ekler; baştaki değerleri istemci kendisi yazabilir (taklit). Bu yüzden sondaki
// alınır. Nginx'in kendisi başlığı ezerse (`$remote_addr`) tek değer gelir, o da doğrudur. Adres yine de yalnızca
// bir ipucudur: kullanan her sınır, başlık taklit edilse bile işe yarayan ikinci bir ölçüt de taşımalıdır.
export async function clientAddress(): Promise<string> {
  const forwarded = (await headers()).get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last ? last.slice(0, 64) : "yerel";
}
