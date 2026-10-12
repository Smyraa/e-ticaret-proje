"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  changeCustomerPassword,
  deleteCustomerAccount,
  endCustomerSession,
  getAccountData,
  getCustomer,
  loginCustomer,
  mergeAccountData,
  registerCustomer,
  saveAccountData,
  updateCustomerName,
  type AccountData,
  type AuthResult,
} from "@/lib/customer-auth";
import { addAddress, ADDRESSES_MAX, cleanTitle, deleteAddress } from "@/lib/customer-addresses";
import { checkAddress, readAddressValues, type AddressErrors, type AddressValues } from "@/lib/order-form";
import { safeReturn } from "@/lib/return-path";
import { multiLine } from "@/lib/form-text";
import { checkReviewInput, deleteMyReview, saveReview } from "@/lib/reviews";

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
  revalidatePath("/hesabim", "layout");
  return { saved: state.saved + 1 };
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const customer = await getCustomer();
  if (!customer) redirect("/giris?donus=/hesabim/adresler");
  const id = String(formData.get("adres") ?? "");
  if (/^[0-9a-f]{16}$/.test(id)) await deleteAddress(customer.id, id);
  revalidatePath("/hesabim", "layout");
}

// ---------- Profil ve güvenlik ----------

export type ProfileState = { message?: string; error?: string; field?: "ad" | "parola" | "yeni" | "onay" | null; name?: string } | undefined;

async function signedIn() {
  const customer = await getCustomer();
  if (!customer) redirect("/giris?donus=/hesabim/profil");
  return customer;
}

const FAILED = "Şu an işlem yapılamıyor. Biraz sonra yeniden deneyin.";

export async function updateNameAction(_state: ProfileState, formData: FormData): Promise<ProfileState> {
  const customer = await signedIn();
  const name = String(formData.get("ad") ?? "").trim().replace(/\s+/g, " ");
  try {
    const result = await updateCustomerName(customer.id, name);
    if (!result.ok) return { error: result.message, field: "ad", name };
  } catch (error) {
    console.error("Ad kaydedilemedi", error);
    return { error: FAILED, name };
  }
  revalidatePath("/", "layout");
  return { message: "Adınız kaydedildi.", name };
}

export async function changePasswordAction(_state: ProfileState, formData: FormData): Promise<ProfileState> {
  const customer = await signedIn();
  const current = String(formData.get("mevcut-parola") ?? "");
  const next = String(formData.get("yeni-parola") ?? "");
  const repeat = String(formData.get("yeni-parola-tekrar") ?? "");
  if (!current) return { error: "Mevcut parolanızı yazın.", field: "parola" };
  if (next !== repeat) return { error: "Yeni parola ile tekrarı aynı değil.", field: "yeni" };
  try {
    const result = await changeCustomerPassword(customer.id, current, next);
    if (!result.ok) return { error: result.message, field: result.field === "parola" ? "parola" : "yeni" };
  } catch (error) {
    console.error("Parola değiştirilemedi", error);
    return { error: FAILED };
  }
  return { message: "Parolanız değiştirildi. Diğer cihazlardaki oturumlar kapatıldı." };
}

export async function deleteAccountAction(_state: ProfileState, formData: FormData): Promise<ProfileState> {
  const customer = await signedIn();
  if (formData.get("onay") !== "evet") return { error: "Hesabınızı silmek için onay kutusunu işaretleyin.", field: "onay" };
  const password = String(formData.get("parola") ?? "");
  if (!password) return { error: "Parolanızı yazın.", field: "parola" };
  try {
    const result = await deleteCustomerAccount(customer.id, password);
    if (!result.ok) return { error: result.message, field: "parola" };
  } catch (error) {
    console.error("Hesap silinemedi", error);
    return { error: FAILED };
  }
  redirect("/?hesap=silindi");
}

// ---------- Yorumlar ----------

export type ReviewFormState =
  | { error?: string; field?: "puan" | "metin" | null; rating?: string; text?: string }
  | undefined;

// Yorum yaz / bekleyen yorumu düzenle. slug sayfada bağlanır (bind) ama güvenilmez: yetki sunucuda yeniden denetlenir.
export async function saveReviewAction(slug: string, _state: ReviewFormState, formData: FormData): Promise<ReviewFormState> {
  const customer = await getCustomer();
  if (!customer) redirect(`/giris?donus=/hesabim/yorum/${encodeURIComponent(String(slug))}`);
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,100}$/.test(slug)) return { error: "Ürün bulunamadı." };

  const rating = String(formData.get("puan") ?? "");
  const text = multiLine(formData.get("metin"));
  const checked = checkReviewInput(rating, text);
  if (!checked.ok || !checked.input) return { error: checked.ok ? FAILED : checked.message, field: checked.ok ? null : checked.field, rating, text };

  try {
    const result = await saveReview(customer, slug, checked.input);
    if (!result.ok) return { error: result.message, field: result.field, rating, text };
  } catch (error) {
    console.error("Yorum kaydedilemedi", error);
    return { error: FAILED, rating, text };
  }
  revalidatePath("/hesabim", "layout");
  redirect("/hesabim/degerlendirmeler?yorum=kaydedildi");
}

export async function deleteReviewAction(formData: FormData): Promise<void> {
  const customer = await getCustomer();
  if (!customer) redirect("/giris?donus=/hesabim/degerlendirmeler");
  await deleteMyReview(customer.id, String(formData.get("yorum") ?? ""));
  revalidatePath("/", "layout"); // onaylı yorum ürün sayfasından da kalkar
  redirect("/hesabim/degerlendirmeler?yorum=silindi");
}
