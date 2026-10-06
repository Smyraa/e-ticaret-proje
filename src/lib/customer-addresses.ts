import "server-only";

import { randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { oneLine } from "./form-text";
import { getDb } from "./mongodb";

// Müşterinin kayıtlı adresleri (adres defteri). Müşteri kaydının "addresses" alanında durur; ödeme formunda seçilir,
// "Hesabım"dan eklenir ve silinir. Alıcının adı ve telefonu da adresin parçasıdır (hediye gönderimi için).

export const ADDRESSES_MAX = 10;
export const TITLE_MAX = 30;

export type SavedAddress = {
  id: string;
  title: string; // "Ev", "İş" gibi; boşsa ilçe / il gösterilir
  name: string;
  phone: string; // 905551112233
  line: string;
  city: string;
  district: string;
  postalCode: string;
};

type Doc = { _id: ObjectId; addresses?: (SavedAddress & { createdAt: Date })[] };

const customersOf = async () => (await getDb()).collection<Doc>("customers");

export const cleanTitle = (value: FormDataEntryValue | null) => [...oneLine(value)].slice(0, TITLE_MAX).join("");

// Kayıtlı adresler, eklenme sırasıyla.
export async function listAddresses(customerId: string): Promise<SavedAddress[]> {
  const doc = await (await customersOf()).findOne({ _id: new ObjectId(customerId) }, { projection: { addresses: 1 } });
  return (doc?.addresses ?? []).map(({ id, title, name, phone, line, city, district, postalCode }) => ({
    id, title, name, phone, line, city, district, postalCode,
  }));
}

export type AddResult = "added" | "exists" | "full";

// Doğrulanmış adresi ekler. Aynısı (başlık hariç bütün alanlar) zaten varsa eklemez; en çok ADDRESSES_MAX adres.
// Denetim ve ekleme tek güncellemede yapılır: aynı anda gelen iki istek sınırı aşamaz, aynı adresi iki kez yazamaz.
export async function addAddress(customerId: string, address: Omit<SavedAddress, "id">): Promise<AddResult> {
  const customers = await customersOf();
  const _id = new ObjectId(customerId);
  const { title, ...same } = address;
  const result = await customers.updateOne(
    {
      _id,
      addresses: { $not: { $elemMatch: same } },
      [`addresses.${ADDRESSES_MAX - 1}`]: { $exists: false },
    },
    { $push: { addresses: { id: randomBytes(8).toString("hex"), title, ...same, createdAt: new Date() } } },
  );
  if (result.modifiedCount === 1) return "added";
  const doc = await customers.findOne({ _id }, { projection: { addresses: 1 } });
  return (doc?.addresses?.length ?? 0) >= ADDRESSES_MAX ? "full" : "exists";
}

export async function deleteAddress(customerId: string, addressId: string): Promise<void> {
  await (await customersOf()).updateOne({ _id: new ObjectId(customerId) }, { $pull: { addresses: { id: addressId } } });
}
