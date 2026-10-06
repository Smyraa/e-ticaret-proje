import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { RESERVATION_MINUTES, sweepExpiredReservations } from "@/lib/order-flow";
import type { Product } from "@/lib/products";
import { ensureBarcodes } from "@/lib/products-admin";
import { readSettings } from "@/lib/settings";
import { lowStockProducts, reservedQuantities, searchStock } from "@/lib/stock-admin";
import { listStockMoves, STOCK_MOVE_LABELS } from "@/lib/stock-moves";
import { adjustStockAction } from "./actions";
import { AdjustForm } from "./adjust-form";

export const metadata: Metadata = { title: "Stok Takibi · Yönetim · TAURA" };

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value.slice(0, 80) : "");

// Stok Takibi: barkod okutarak ya da adla ürün bulma, stok ekleme/çıkarma, düşük stoklu ürünler ve hareket geçmişi.
// Barkod okuyucu klavye gibi yazıp Enter'a bastığı için arama kutusu sayfa açılınca odaklıdır; okutmak aramak demektir.
export default async function StockPage({ searchParams }: PageProps<"/yonetim/stok">) {
  await requireAdmin();
  const params = await searchParams;
  const query = one(params.q).trim();
  const productFilter = one(params.urun);

  await sweepExpiredReservations(true); // süresi dolan ödeme ayırmaları beklemeden geri konur
  await ensureBarcodes();
  const [settings, search, reserved, moves] = await Promise.all([
    readSettings(),
    query ? searchStock(query) : Promise.resolve(null),
    reservedQuantities(),
    listStockMoves({ slug: productFilter || undefined, limit: 50 }),
  ]);
  const low = await lowStockProducts(settings.lowStockThreshold);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="font-display text-4xl">Stok Takibi</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        Barkod okutun ya da ürün adını yazın. Stok değişiklikleri ve siparişlerin stok hareketleri aşağıdaki geçmişte
        görünür. Kartla ödeme başlarken ürünler <span className="text-ink">{RESERVATION_MINUTES} dakika</span> ayrılır;
        ödenmezse kendiliğinden stoğa geri konur.
      </p>

      <form method="get" role="search" className="mt-6 flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="stok-ara" className="text-sm">
            Barkod ya da ürün adı
          </label>
          {/* Barkod okuyucu için sayfa açılınca odaklı. */}
          <input
            id="stok-ara"
            name="q"
            type="search"
            defaultValue={query}
            autoFocus
            maxLength={80}
            autoComplete="off"
            className="mt-2 w-full rounded-md border border-field bg-paper p-3 text-sm"
          />
        </div>
        <button
          type="submit"
          className="min-h-11 bg-espresso px-6 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
        >
          Ara
        </button>
      </form>

      {search && (
        <section aria-labelledby="sonuc-baslik" className="mt-8">
          <h2 id="sonuc-baslik" className="font-display text-2xl">
            {search.exactBarcode ? "Barkodla bulunan ürün" : `“${query}” için sonuçlar`}
          </h2>
          {search.products.length === 0 ? (
            <p className="mt-3 rounded-md bg-paper p-4 text-sm text-muted">
              Eşleşen ürün yok. Barkodu yeniden okutun ya da adın bir kısmını yazın.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {search.products.slice(0, 20).map((product) => (
                <li key={product.slug} className="rounded-lg bg-paper p-4 shadow-sm">
                  <StockSummary product={product} reserved={reserved.get(product.slug) ?? 0} threshold={settings.lowStockThreshold} />
                  <AdjustForm id={product.slug} name={product.name} action={adjustStockAction.bind(null, product.slug)} />
                </li>
              ))}
            </ul>
          )}
          {search.products.length > 20 && (
            <p className="mt-2 text-sm text-muted">İlk 20 sonuç gösteriliyor; aramayı daraltın.</p>
          )}
        </section>
      )}

      <section aria-labelledby="dusuk-baslik" className="mt-10">
        <h2 id="dusuk-baslik" className="font-display text-2xl">
          Düşük stok
        </h2>
        <p className="mt-1 text-sm text-muted">
          Stoğu {settings.lowStockThreshold} ve altında olan ürünler (eşik{" "}
          <Link href="/yonetim/ayarlar" className="underline hover:text-primary">
            Ayarlar
          </Link>
          {"'dan değişir)."}
        </p>
        {low.length === 0 ? (
          <p className="mt-3 rounded-md bg-paper p-4 text-sm text-muted">Düşük stoklu ürün yok.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-lg bg-paper shadow-sm">
            {low.map((product) => (
              <li key={product.slug} className="p-4">
                <StockSummary product={product} reserved={reserved.get(product.slug) ?? 0} threshold={settings.lowStockThreshold} link />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="gecmis-baslik" className="mt-10">
        <h2 id="gecmis-baslik" className="font-display text-2xl">
          Stok hareketleri
        </h2>
        <p className="mt-1 text-sm text-muted">
          {productFilter ? (
            <>
              Yalnız bu ürünün hareketleri ·{" "}
              <Link href="/yonetim/stok#gecmis-baslik" className="underline hover:text-primary">
                Tümünü göster
              </Link>
            </>
          ) : (
            "Son 50 hareket, yeniden eskiye."
          )}
        </p>
        {moves.length === 0 ? (
          <p className="mt-3 rounded-md bg-paper p-4 text-sm text-muted">Henüz stok hareketi yok.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg bg-paper shadow-sm">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-line text-xs tracking-wider text-muted uppercase">
                <tr>
                  <th scope="col" className="p-3 font-normal">Zaman</th>
                  <th scope="col" className="p-3 font-normal">Ürün</th>
                  <th scope="col" className="p-3 text-right font-normal">Değişim</th>
                  <th scope="col" className="p-3 text-right font-normal">Sonra</th>
                  <th scope="col" className="p-3 font-normal">İşlem</th>
                  <th scope="col" className="p-3 font-normal">Yapan / sipariş</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {moves.map((move) => (
                  <tr key={move.id}>
                    <td className="p-3 whitespace-nowrap text-muted">{formatDateTime(move.at)}</td>
                    <td className="p-3">
                      <Link href={`/yonetim/stok?urun=${encodeURIComponent(move.slug)}#gecmis-baslik`} className="hover:text-primary hover:underline">
                        {move.name}
                      </Link>
                    </td>
                    <td className={`p-3 text-right font-semibold whitespace-nowrap ${move.delta < 0 ? "text-danger" : "text-ink"}`}>
                      {move.delta > 0 ? `+${move.delta}` : `−${-move.delta}`}
                    </td>
                    <td className="p-3 text-right">{move.after ?? "—"}</td>
                    <td className="p-3">
                      {STOCK_MOVE_LABELS[move.kind]}
                      {move.reason && <span className="block text-xs text-muted">{move.reason}</span>}
                    </td>
                    <td className="p-3 break-all text-muted">
                      {move.orderNumber ? (
                        <Link href={`/yonetim/siparisler/${move.orderNumber}`} className="hover:text-primary hover:underline">
                          {move.orderNumber}
                        </Link>
                      ) : (
                        (move.admin ?? "—")
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StockSummary({
  product,
  reserved,
  threshold,
  link,
}: {
  product: Product;
  reserved: number;
  threshold: number;
  link?: boolean;
}) {
  const out = product.stock === 0;
  const low = !out && product.stock <= threshold;
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <div className="min-w-0">
        <p className="font-semibold">
          {link ? (
            <Link href={`/yonetim/stok?q=${encodeURIComponent(product.barcode || product.name)}`} className="hover:text-primary hover:underline">
              {product.name}
            </Link>
          ) : (
            <Link href={`/yonetim/urunler/${product.slug}`} className="hover:text-primary hover:underline">
              {product.name}
            </Link>
          )}
        </p>
        <p className="text-xs text-muted">
          Barkod {product.barcode || "yok"} ·{" "}
          <Link href={`/yonetim/stok?urun=${encodeURIComponent(product.slug)}#gecmis-baslik`} className="underline hover:text-primary">
            Geçmiş
          </Link>
        </p>
      </div>
      <p className="text-sm">
        <span className="font-display text-2xl">{product.stock}</span> adet
        {out && <span className="ml-2 rounded-full border border-danger px-2 py-0.5 text-xs font-semibold text-danger">Tükendi</span>}
        {low && <span className="ml-2 rounded-full border border-ink px-2 py-0.5 text-xs font-semibold">Düşük stok</span>}
        {reserved > 0 && <span className="block text-xs text-muted">{reserved} adet ödeme için ayrılmış (stoktan düşülmüş)</span>}
      </p>
    </div>
  );
}
