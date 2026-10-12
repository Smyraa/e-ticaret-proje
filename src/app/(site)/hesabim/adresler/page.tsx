import { redirect } from "next/navigation";
import { AddressBookForm } from "@/components/address-book-form";
import { addressLabel } from "@/lib/address-label";
import { listAddresses, type SavedAddress } from "@/lib/customer-addresses";
import { getCustomer } from "@/lib/customer-auth";
import { pageMetadata } from "@/lib/metadata";
import { formatPhone } from "@/lib/phone";
import { deleteAddressAction, saveAddressAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("Adreslerim", "Kayıtlı teslimat adresleriniz.", { noindex: true });

// Adreslerim: kayıtlı adresler (ödeme sayfasında seçilir), silme ve yeni adres ekleme.
export default async function AddressesPage() {
  const customer = await getCustomer();
  if (!customer) redirect("/giris?donus=/hesabim/adresler");

  let addresses: SavedAddress[] = [];
  let failed = false;
  try {
    addresses = await listAddresses(customer.id);
  } catch (error) {
    console.error("Adresler okunamadı", error);
    failed = true;
  }

  return (
    <section aria-labelledby="adresler-baslik">
      <h1 id="adresler-baslik" className="font-display text-3xl sm:text-4xl">
        Adreslerim
      </h1>
      <p className="mt-2 text-sm text-muted">Ödeme sayfasında kayıtlı adreslerinizden birini seçebilirsiniz.</p>

      {failed && <p className="mt-6 rounded-md bg-soft p-4 text-sm text-muted">Adresler şu an yüklenemedi. Biraz sonra yeniden deneyin.</p>}

      {!failed && addresses.length > 0 && (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="flex flex-col rounded-xl border border-gold/40 bg-paper/50 p-4 text-sm">
              <p className="font-semibold">{addressLabel(address)}</p>
              <p className="mt-1 text-muted">
                {address.name} · <span className="whitespace-nowrap">{formatPhone(address.phone)}</span>
              </p>
              <p className="break-words text-muted">{address.line}</p>
              <p className="text-muted">
                {address.district} / {address.city} · {address.postalCode}
              </p>
              <form action={deleteAddressAction} className="mt-auto pt-2">
                <input type="hidden" name="adres" value={address.id} />
                <button
                  type="submit"
                  aria-label={`Adresi sil: ${addressLabel(address)}`}
                  className="-ml-2 inline-flex min-h-11 items-center px-2 text-xs tracking-widest text-muted uppercase underline transition hover:text-danger"
                >
                  Sil
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {!failed && (
        <div className="mt-6">
          <AddressBookForm action={saveAddressAction} defaultName={customer.name} />
        </div>
      )}
    </section>
  );
}
