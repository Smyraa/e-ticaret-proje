import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatPrice } from "@/lib/format";
import { filterByKey, STATUS_FILTERS } from "@/lib/order-status";
import { countByStatus, countTestOrders, listOrders } from "@/lib/orders-admin";
import { DeleteButton } from "../urunler/delete-button";
import { removeTestOrders } from "./actions";
import { StatusBadge } from "./status-badge";

export const metadata: Metadata = { title: "Siparişler · Yönetim · TAURA" };

const PAGE_SIZE = 20;

const badgeClass = "ml-2 rounded-sm px-2 py-1 align-middle text-[10px] font-normal tracking-wider uppercase";
const chipClass = "inline-flex min-h-11 items-center rounded-full px-4 text-xs font-semibold transition";

// Test siparişleri temizlenince adrese eklenen sayıdan gösterilecek ileti (yalnız 1–4 haneli sayı kabul edilir).
function noticeFor(cleared: string | string[] | undefined) {
  if (typeof cleared !== "string" || !/^\d{1,4}$/.test(cleared)) return null;
  return Number(cleared) === 0 ? "Silinecek test siparişi yoktu." : `${Number(cleared)} test siparişi silindi.`;
}

function listHref(filterKey: string | undefined, page: number) {
  const params = new URLSearchParams();
  if (filterKey) params.set("durum", filterKey);
  if (page > 1) params.set("sayfa", String(page));
  const query = params.toString();
  return query ? `/yonetim/siparisler?${query}` : "/yonetim/siparisler";
}

// Sipariş listesi: yeniden eskiye, durum süzgeciyle. Sipariş numarası siparişin ayrıntı sayfasına götürür.
export default async function AdminOrdersPage({ searchParams }: PageProps<"/yonetim/siparisler">) {
  await requireAdmin();
  const { durum, sayfa, temizlendi } = await searchParams;
  const filter = filterByKey(durum);
  const requested = typeof sayfa === "string" && /^\d{1,4}$/.test(sayfa) ? Math.max(1, Number(sayfa)) : 1;

  const [counts, testCount] = await Promise.all([countByStatus(), countTestOrders()]);
  let { orders, total } = await listOrders({ statuses: filter?.statuses, page: requested, pageSize: PAGE_SIZE });
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requested, lastPage);
  if (page !== requested) ({ orders, total } = await listOrders({ statuses: filter?.statuses, page, pageSize: PAGE_SIZE }));

  const all = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const chips = [
    { key: undefined, label: "Tümü", count: all },
    ...STATUS_FILTERS.map((item) => ({
      key: item.key as string | undefined,
      label: item.label,
      count: item.statuses.reduce((sum, status) => sum + counts[status], 0),
    })),
  ];
  const notice = noticeFor(temizlendi);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="font-display text-4xl">Siparişler</h1>
      <p className="mt-3 text-sm text-muted">Toplam {all} sipariş.</p>

      {notice && (
        <p role="status" className="mt-6 rounded-md bg-paper p-4 text-sm">
          {notice}
        </p>
      )}

      <nav aria-label="Sipariş süzgeci" className="mt-6 flex flex-wrap gap-2">
        {chips.map((chip) => {
          const active = (filter?.key ?? undefined) === chip.key;
          return (
            <Link
              key={chip.label}
              href={listHref(chip.key, 1)}
              aria-current={active ? "page" : undefined}
              className={`${chipClass} ${active ? "bg-espresso text-paper" : "border border-espresso hover:border-primary hover:text-primary"}`}
            >
              {chip.label} ({chip.count})
            </Link>
          );
        })}
      </nav>

      {testCount > 0 && (
        <section aria-labelledby="test-baslik" className="mt-8 rounded-lg bg-paper p-5 shadow-sm">
          <h2 id="test-baslik" className="text-sm font-semibold">
            Test siparişleri
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Listede {testCount} test siparişi var (yalnız örnek ürünlerle verilen denemeler). Canlıya çıkmadan önce
            hepsini tek seferde silebilirsiniz; gerçek siparişlere dokunulmaz. Ödemesi alınmış olanların düşülen stoğu
            iade edilir.
          </p>
          <div className="mt-4">
            <DeleteButton
              action={removeTestOrders}
              confirmText={`${testCount} test siparişi silinsin mi? Gerçek siparişlere dokunulmaz, bu işlem geri alınamaz.`}
              label={`Test siparişlerini sil (${testCount})`}
            />
          </div>
        </section>
      )}

      {orders.length === 0 ? (
        <p className="mt-8 rounded-lg bg-paper p-6 text-sm text-muted">
          {all === 0
            ? "Henüz sipariş yok. Müşteriler ödeme sayfasında “Siparişi tamamla”ya bastığında siparişler burada görünür."
            : "Bu süzgeçte sipariş yok."}
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-line rounded-lg bg-paper shadow-sm">
          {orders.map((order) => (
            <li key={order.number} className="p-4 md:flex md:items-center md:gap-4">
              <div className="min-w-0 md:flex-1">
                <p className="text-sm font-semibold">
                  <Link
                    href={`/yonetim/siparisler/${order.number}`}
                    className="tracking-wider transition hover:text-primary hover:underline"
                  >
                    {order.number}
                  </Link>
                  {order.test && <span className={`${badgeClass} bg-espresso text-paper`}>Test</span>}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {order.customerName} · {formatDateTime(order.createdAt)}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 md:mt-0 md:shrink-0">
                <p className="text-xs text-muted md:w-16 md:text-right">{order.unitCount} adet</p>
                <p className="font-display text-xl md:w-28 md:text-right">{formatPrice(order.total)}</p>
                <StatusBadge status={order.status} />
                <Link
                  href={`/yonetim/siparisler/${order.number}`}
                  className="inline-flex min-h-11 items-center text-[11px] tracking-wider uppercase underline transition hover:text-primary md:text-xs md:tracking-widest"
                >
                  Ayrıntı
                  <span className="sr-only">: {order.number}</span>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {lastPage > 1 && (
        <nav aria-label="Sayfalar" className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs tracking-widest uppercase">
          {page > 1 ? (
            <Link href={listHref(filter?.key, page - 1)} className="inline-flex min-h-11 items-center underline transition hover:text-primary">
              ← Önceki
            </Link>
          ) : (
            <span className="inline-flex min-h-11 items-center text-muted">← Önceki</span>
          )}
          <span aria-current="page" className="text-muted">
            Sayfa {page} / {lastPage}
          </span>
          {page < lastPage ? (
            <Link href={listHref(filter?.key, page + 1)} className="inline-flex min-h-11 items-center underline transition hover:text-primary">
              Sonraki →
            </Link>
          ) : (
            <span className="inline-flex min-h-11 items-center text-muted">Sonraki →</span>
          )}
        </nav>
      )}
    </div>
  );
}
