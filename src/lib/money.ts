// "3500", "3.500", "₺3.500", "3500 TL" ve "3.500,00" tam lira olarak okunur (0 da geçerlidir);
// kuruşlu ya da başka biçimler null döner. Sınırları (en az/en çok) çağıran denetler.
export function parseLira(text: string): number | null {
  const match = text.replace(/[\s₺]|TL/gi, "").match(/^(\d{1,3}(?:\.\d{3})+|\d+)(?:,0{1,2})?$/);
  return match ? Number(match[1].replace(/\./g, "")) : null;
}
