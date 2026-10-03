import { ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/order-model";

// Durum rozeti (liste ve ayrıntı sayfası). Renk tek başına anlam taşımaz: durum yazıyla da belirtilir.
const TONES: Record<OrderStatus, string> = {
  pending: "border border-ink text-ink",
  paid: "bg-sand text-ink",
  preparing: "bg-sand text-ink",
  shipped: "bg-espresso text-paper",
  delivered: "border border-line bg-soft text-ink",
  cancelled: "border border-danger text-danger",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${TONES[status]}`}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
