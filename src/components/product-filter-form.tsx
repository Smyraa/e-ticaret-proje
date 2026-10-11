import type { FilterValues } from "@/lib/products";

type Props = {
  action: string; // formun gönderileceği sayfa (koleksiyon ya da kategori)
  values: FilterValues;
  materials?: string[]; // verilirse arama kutusu ve malzeme seçimi de görünür (koleksiyon sayfası)
};

const field = "w-full rounded-md border border-field bg-paper px-4 py-3 text-sm transition focus:border-primary";

// Ürün süzme formu. Arama kutusu (yalnız koleksiyonda) hep görünür; malzeme, sıralama, fiyat aralığı ve "yalnız indirimdekiler"
// açılır "Filtrele ve sırala" bölümündedir (telefonda ekranı kaplamasın; seçili filtre varsa açık gelir, kaç tane seçili olduğu
// başlıkta yazar). Adres çubuğuna yazar (?en-az=…&indirim=1): sayfa paylaşılabilir, JavaScript gerekmez (details/summary).
export function ProductFilterForm({ action, values, materials }: Props) {
  const chosen = [materials && values.material, values.sort, values.min || values.max, values.sale].filter(Boolean).length;

  return (
    <form action={action} className="mt-6 sm:mt-8">
      {materials && (
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="q">
            Ara
          </label>
          <input
            id="q"
            type="search"
            name="q"
            maxLength={80}
            defaultValue={values.q}
            placeholder="Ara (ör. kuka, kehribar)"
            className={`${field} scroll-mt-40`}
          />
          <button
            type="submit"
            className="min-h-11 shrink-0 bg-espresso px-5 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary sm:px-8"
          >
            Ara
          </button>
        </div>
      )}

      <details open={chosen > 0} className="group mt-3">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-gold/60 bg-paper/60 px-4 text-xs font-semibold tracking-widest uppercase transition hover:border-bordo hover:text-bordo [&::-webkit-details-marker]:hidden">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
            <circle cx="16" cy="6" r="2" />
            <circle cx="10" cy="12" r="2" />
            <circle cx="18" cy="18" r="2" />
          </svg>
          Filtrele ve sırala
          {chosen > 0 && <span className="rounded-full bg-bordo px-2 py-0.5 text-[10px] text-paper">{chosen} seçili</span>}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="transition group-open:rotate-180">
            <path d="M5 9l7 7 7-7" />
          </svg>
        </summary>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {materials && (
            <>
              <label className="sr-only" htmlFor="malzeme">
                Malzeme
              </label>
              <select id="malzeme" name="malzeme" defaultValue={values.material} className={field}>
                <option value="">Tüm malzemeler</option>
                {materials.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </>
          )}

          <label className="sr-only" htmlFor="sirala">
            Sırala
          </label>
          <select id="sirala" name="sirala" defaultValue={values.sort} className={field}>
            <option value="">Önerilen sıra</option>
            <option value="fiyat-artan">Fiyat: düşükten yükseğe</option>
            <option value="fiyat-azalan">Fiyat: yüksekten düşüğe</option>
          </select>

          <fieldset className="flex items-center gap-2">
            <legend className="sr-only">Fiyat aralığı (TL)</legend>
            <label className="sr-only" htmlFor="en-az">
              En az fiyat (TL)
            </label>
            <input id="en-az" name="en-az" inputMode="numeric" maxLength={8} defaultValue={values.min} placeholder="En az ₺" className={field} />
            <span aria-hidden="true" className="text-muted">
              –
            </span>
            <label className="sr-only" htmlFor="en-cok">
              En çok fiyat (TL)
            </label>
            <input id="en-cok" name="en-cok" inputMode="numeric" maxLength={8} defaultValue={values.max} placeholder="En çok ₺" className={field} />
          </fieldset>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-field bg-paper px-4 text-sm">
            <input type="checkbox" name="indirim" value="1" defaultChecked={values.sale} className="h-4 w-4 accent-bordo" />
            Yalnız indirimdekiler
          </label>

          <button
            type="submit"
            className="min-h-11 bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary sm:col-span-2 lg:col-span-4"
          >
            Uygula
          </button>
        </div>
      </details>
    </form>
  );
}
