import type { OrderStatus } from "./order-model";

// Siparişin yönetimde yapılabilecek işlemleri (komutlar) ve hangi durumda hangisinin geçerli olduğu.
// Tek kaynak: hem sayfa (hangi düğmeler görünsün) hem sunucu (hangi istek kabul edilsin) buna bakar.
//
// İleri yol: ödeme bekleniyor → ödendi → hazırlanıyor → kargoya verildi → teslim edildi ("ödendi"den doğrudan kargoya da
// verilebilir). İptal, kargoya verilmeden önce mümkündür (kargolanan siparişin iadesi ayrı bir iştir) ve geri alınamaz.
// Yanlış tıklamayı düzeltmek için bir önceki adıma dönülebilir ("back").
export type OrderCommand =
  | "paid" // ödeme alındı: stok düşer
  | "preparing"
  | "ship" // kargoya ver (kargo firması + takip no); kargolanmışsa kargo bilgisini düzeltir
  | "deliver"
  | "cancel" // iptal; stok düşülmüşse iade edilir
  | "back" // bir önceki adıma dön
  | "stock-deduct" // onarım: durum ödenmiş ama stok düşülmemiş
  | "stock-return"; // onarım: durum ödenmemiş/iptal ama stok düşülmüş kalmış

export const COMMANDS: OrderCommand[] = [
  "paid",
  "preparing",
  "ship",
  "deliver",
  "cancel",
  "back",
  "stock-deduct",
  "stock-return",
];

// Stoku düşülmüş olması gereken durumlar (ödeme alındıktan sonrakiler).
export const HOLDS_STOCK: OrderStatus[] = ["paid", "preparing", "shipped", "delivered"];

// "back" komutunun götürdüğü önceki adım.
export const PREVIOUS: Partial<Record<OrderStatus, OrderStatus>> = {
  paid: "pending",
  preparing: "paid",
  shipped: "preparing",
  delivered: "shipped",
};

// Komutun hangi durumlarda kullanılabileceği (onarım komutları durumdan çok stok bayrağına bakar, aşağıda).
const FROM: Record<Exclude<OrderCommand, "stock-deduct" | "stock-return">, OrderStatus[]> = {
  paid: ["pending"],
  preparing: ["paid"],
  ship: ["paid", "preparing", "shipped"],
  deliver: ["shipped"],
  cancel: ["pending", "paid", "preparing"],
  back: ["paid", "preparing", "shipped", "delivered"],
};

export function availableCommands(order: { status: OrderStatus; stockDeducted: boolean }): OrderCommand[] {
  const commands: OrderCommand[] = (Object.keys(FROM) as (keyof typeof FROM)[]).filter((command) =>
    FROM[command].includes(order.status),
  );
  const holds = HOLDS_STOCK.includes(order.status);
  if (holds && !order.stockDeducted) commands.push("stock-deduct");
  if (!holds && order.stockDeducted) commands.push("stock-return");
  return commands;
}

// Komut uygulanınca siparişin varacağı durum (kargo bilgisini düzeltmek ya da onarım için durum değişmez: null).
export function targetStatus(command: OrderCommand, from: OrderStatus): OrderStatus | null {
  switch (command) {
    case "paid":
      return "paid";
    case "preparing":
      return "preparing";
    case "ship":
      return from === "shipped" ? null : "shipped";
    case "deliver":
      return "delivered";
    case "cancel":
      return "cancelled";
    case "back":
      return PREVIOUS[from] ?? null;
    default:
      return null;
  }
}

// Yönetim listesindeki süzgeçler (adreste ?durum=<anahtar>). "Hazırlanacak": ödemesi alınmış, henüz kargoya verilmemiş işler.
export const STATUS_FILTERS: { key: string; label: string; statuses: OrderStatus[] }[] = [
  { key: "beklemede", label: "Ödeme bekleyen", statuses: ["pending"] },
  { key: "hazirlanacak", label: "Hazırlanacak", statuses: ["paid", "preparing"] },
  { key: "kargoda", label: "Kargoda", statuses: ["shipped"] },
  { key: "teslim", label: "Teslim edilen", statuses: ["delivered"] },
  { key: "iptal", label: "İptal", statuses: ["cancelled"] },
];

export const filterByKey = (key: unknown) => STATUS_FILTERS.find((filter) => filter.key === key);
