"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  endCustomerSession,
  getAccountData,
  getCustomer,
  loginCustomer,
  mergeAccountData,
  registerCustomer,
  saveAccountData,
  type AccountData,
  type AuthResult,
} from "@/lib/customer-auth";
import { addAddress, ADDRESSES_MAX, cleanTitle, deleteAddress } from "@/lib/customer-addresses";
import { checkAddress, readAddressValues, type AddressErrors, type AddressValues } from "@/lib/order-form";
import { safeReturn } from "@/lib/return-path";

// Form durumu: hata iletisi, hatanın ait olduğu kutu ve (hata sonrası boşalmasın diye) yazılan ad ve e-posta.
export type AccountFormState =
  | { message: string; field: "ad" | "eposta" | "parola" | null; name?: string; email?: string }
  | undefined;

async function finish(
  run: () => Promise<AuthResult>,
  formData: FormData,
  values: { name?: string; email: string },
): Promise<AccountFormState> {
  let result: AuthResult;
  try {
    result = await run();
  } catch (error) {
    console.error("Hesap işlemi yapılamadı", error);
    return { message: "Şu an işlem yapılamıyor. Biraz sonra yeniden deneyin.", field: null, ...values };
  }
  if (!result.ok) return { message: result.message, field: result.field, ...values };
  redirect(safeReturn(formData.get("donus")));
}

export async function login(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const email = String(formData.get("eposta") ?? "").trim().toLowerCase();
  const password = String(formData.get("parola") ?? "");
  if (!email || !password) return { message: "E-posta ve parolayı yazın.", field: null, email };
  return finish(() => loginCustomer(email, password), formData, { email });
}

export async function register(_state: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const name = String(formData.get("ad") ?? "").trim().replace(/\s+/g, " ");
  const email = String(formData.get("eposta") ?? "").trim().toLowerCase();
  const password = String(formData.get("parola") ?? "");
  return finish(() => registerCustomer(name, email, password), formData, { name, email });
}

export async function logout(): Promise<void> {
  await endCustomerSession();
  redirect("/");
}

// Favori ve sepet eşitlemesi (account-sync.tsx). Giriş yoksa null döner ya da hiçbir şey yapmaz.
export async function loadAccount(): Promise<AccountData | null> {
  const customer = await getCustomer();
  return customer ? getAccountData(customer.id) : null;
}

export async function mergeAccount(local: { favorites: unknown; cart: unknown }): Promise<AccountData | null> {
  const customer = await getCustomer();
  return customer ? mergeAccountData(customer.id, local) : null;
}

export async function saveAccount(data: { favorites: unknown; cart: unknown }): Promise<void> {
  const customer = await getCustomer();
  if (customer) await saveAccountData(customer.id, data);
}

// Adres defteri formu ("Hesabım"). Başarıda form boşalsın diye `saved` artar (form bu sayıyla yeniden kurulur).
export type AddressFormState = {
  values?: AddressValues & { title: string };
  errors?: AddressErrors;
  message?: string;
  saved: number;
};

export async function saveAddressAction(state: AddressFormState, formData: FormData): Promise<AddressFormState> {
  const customer = await getCustomer();
  if (!customer) redirect("/giris?donus=/hesabim");

  const values = { ...readAddressValues(formData), title: cleanTitle(formData.get("adres-basligi")) };
  const { errors, phone } = checkAddress(values);
  if (!phone) return { ...state, values, errors };

  let result;
  try {
    result = await addAddress(customer.id, {
      title: values.title,
      name: values.name,
      phone,
      line: values.address,
      city: values.city,
      district: values.district,
      postalCode: values.postalCode,
    });
  } catch (error) {
    console.error("Adres kaydedilemedi", error);
    return { ...state, values, message: "Adres şu an kaydedilemedi. Biraz sonra yeniden deneyin." };
  }
  if (result === "full") return { ...state, values, message: `En çok ${ADDRESSES_MAX} adres kaydedilebilir. Önce birini silin.` };
  if (result === "exists") return { ...state, values, message: "Bu adres zaten kayıtlı." };
  revalidatePath("/hesabim");
  return { saved: state.saved + 1 };
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const customer = await getCustomer();
  if (!customer) redirect("/giris?donus=/hesabim");
  const id = String(formData.get("adres") ?? "");
  if (/^[0-9a-f]{16}$/.test(id)) await deleteAddress(customer.id, id);
  revalidatePath("/hesabim");
}
