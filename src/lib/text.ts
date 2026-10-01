// Aramada Türkçe harfleri sadeleştirir: "Narçıl", "narcil" ve "NARCIL" aynı sayılır.
export function fold(text: string) {
  return text
    .replace(/[ıİI]/g, "i")
    .replace(/[şŞ]/g, "s")
    .replace(/[ğĞ]/g, "g")
    .replace(/[üÜ]/g, "u")
    .replace(/[öÖ]/g, "o")
    .replace(/[çÇ]/g, "c")
    .toLowerCase();
}
