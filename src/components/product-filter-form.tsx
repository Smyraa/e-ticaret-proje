import type { FilterValues } from "@/lib/products";

type Props = {
  action: string; // formun gönderileceği sayfa (koleksiyon ya da kategori)
  values: FilterValues;
  materials?: string[]; // verilirse arama kutusu ve malzeme seçimi de görünür (koleksiyon sayfası)
};

const field = "w-full rounded-md border border-field bg-paper px-4 py-3 text-sm transition focus:border-primary";

// Ürün süzme formu: arama ve malzeme (yalnız koleksiyonda), sıralama, fiyat aralığı, yalnız indirimdekiler.
// Adres çubuğuna yazar (?en-az=…&indirim=1): sayfa paylaşılabilir, JavaScript gerekmez.
export function ProductFilterForm({ action, values, materials }: Props) {
  return (
    <form action={action} className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {materials && (
        <>
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
            className={`${field} scroll-mt-40 lg:col-span-2`}
          />

          <label className="sr-only" htmlFor="malzeme">
            Malzeme
          </label>
          <select id="malzeme" name="malzeme" defaultValue={values.material} className={`${field} lg:col-span-2`}>
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
      <select id="sirala" name="sirala" defaultValue={values.sort} className={`${field} lg:col-span-2`}>
        <option value="">Önerilen sıra</option>
        <option value="fiyat-artan">Fiyat: düşükten yükseğe</option>
        <option value="fiyat-azalan">Fiyat: yüksekten düşüğe</option>
      </select>

      <fieldset className="flex items-center gap-2 sm:col-span-2 lg:col-span-2">
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

      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-field bg-paper px-4 text-sm lg:col-span-2">
        <input type="checkbox" name="indirim" value="1" defaultChecked={values.sale} className="h-4 w-4 accent-bordo" />
        Yalnız indirimdekiler
      </label>

      <button
        type="submit"
        className="min-h-11 bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary lg:col-span-2"
      >
        Uygula
      </button>
    </form>
  );
}
