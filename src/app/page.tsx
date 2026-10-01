import { getProducts, type Product } from "@/lib/products";

// Ürünler her istekte MongoDB'den okunur.
export const dynamic = "force-dynamic";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(price);

async function loadProducts(): Promise<{ products: Product[]; failed: boolean }> {
  try {
    return { products: await getProducts(), failed: false };
  } catch (error) {
    console.error("Ürünler okunamadı", error);
    return { products: [], failed: true };
  }
}

export default async function Home() {
  const { products, failed } = await loadProducts();

  return (
    <>
      <div className="bg-espresso px-4 py-2 text-center text-xs tracking-widest text-paper uppercase">
        Demo sürümü · Ürünler ve fiyatlar örnek içeriktir
      </div>

      <header className="border-b border-line py-6 text-center">
        <p className="font-display text-3xl tracking-[0.22em]">TAURA</p>
        <p className="-mt-1 text-[11px] tracking-[0.38em] text-muted uppercase">
          Tesbihçilik
        </p>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 md:grid-cols-2">
          <div className="space-y-6">
            <h1 className="font-display text-5xl leading-tight">
              Detayında zanaat,
              <br />
              <span className="text-primary italic">duruşunda zarafet.</span>
            </h1>
            <p className="max-w-md text-muted">
              Tesbih koleksiyonumuzu keşfedin.
            </p>
            <a
              href="#koleksiyon"
              className="inline-block bg-espresso px-8 py-3 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary"
            >
              Koleksiyonu gör
            </a>
          </div>
          <div className="flex aspect-[4/5] items-center justify-center rounded-xl bg-gradient-to-br from-sand to-soft text-sm text-muted">
            Fotoğraf yakında
          </div>
        </section>

        <section id="koleksiyon" className="bg-soft py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="font-display text-3xl">Koleksiyon</h2>

            {failed ? (
              <p className="mt-8 rounded-md bg-paper p-4 text-sm text-muted">
                Ürünler şu an yüklenemedi. Yerel MongoDB çalışıyor mu? (127.0.0.1:27017)
              </p>
            ) : products.length === 0 ? (
              <p className="mt-8 rounded-md bg-paper p-4 text-sm text-muted">
                Henüz ürün yok. Örnek ürünleri eklemek için <code>npm run seed</code> çalıştırın.
              </p>
            ) : (
              <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {products.map((product) => (
                  <li key={product.slug} className="flex flex-col rounded-lg bg-paper p-4 shadow-sm">
                    <div className="relative mb-4 flex aspect-[4/5] items-center justify-center rounded-md bg-gradient-to-br from-sand to-soft text-xs text-muted">
                      Fotoğraf yakında
                      {product.sample && (
                        <span className="absolute top-3 left-3 rounded-sm bg-espresso px-2 py-1 text-[10px] tracking-wider text-paper uppercase">
                          Örnek
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] tracking-widest text-muted uppercase">
                      {product.material}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">{product.name}</h3>
                    <p className="mt-auto pt-4 font-display text-2xl">
                      {formatPrice(product.price)}
                    </p>
                    <p className="text-xs text-muted">
                      {product.stock > 0 ? `Stokta ${product.stock} adet` : "Tükendi"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        TAURA Tesbihçilik · Demo sürümü. Bu sayfadaki tüm ürün ve fiyatlar örnek içeriktir.
      </footer>
    </>
  );
}
