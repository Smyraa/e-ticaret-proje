import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccountForm, NameForm, PasswordForm } from "@/components/profile-forms";
import { getCustomer } from "@/lib/customer-auth";
import { pageMetadata } from "@/lib/metadata";
import { CUSTOMER_PASSWORD_MIN_LENGTH } from "@/lib/password";
import { changePasswordAction, deleteAccountAction, updateNameAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata("Profil ve güvenlik", "Adınız, parolanız ve hesabınızın silinmesi.", { noindex: true });

// Profil ve güvenlik (kullanıcı kararı, 2026-10-07): ad soyad değiştirilir, parola değiştirilir, hesap silinir.
// E-posta değiştirme yok (e-posta hizmeti olmadan yeni adres doğrulanamaz).
export default async function ProfilePage() {
  const customer = await getCustomer();
  if (!customer) redirect("/giris?donus=/hesabim/profil");

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <Link
        href="/hesabim"
        className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase transition hover:text-primary"
      >
        ← Hesabıma dön
      </Link>
      <h1 className="mt-4 font-display text-4xl">Profil ve güvenlik</h1>
      <p className="mt-3 text-sm text-muted">
        E-posta: <span className="text-ink">{customer.email}</span> (değiştirilemez)
      </p>

      <section aria-labelledby="profil-baslik" className="mt-10">
        <h2 id="profil-baslik" className="font-display text-2xl">
          Adınız
        </h2>
        <div className="mt-4">
          <NameForm action={updateNameAction} name={customer.name} />
        </div>
      </section>

      <section aria-labelledby="parola-baslik" className="mt-12">
        <h2 id="parola-baslik" className="font-display text-2xl">
          Parola
        </h2>
        <p className="mt-2 text-sm text-muted">Parolanız değişince diğer cihazlardaki oturumlarınız kapanır.</p>
        <div className="mt-4">
          <PasswordForm action={changePasswordAction} minLength={CUSTOMER_PASSWORD_MIN_LENGTH} />
        </div>
      </section>

      <section aria-labelledby="silme-baslik" className="mt-12 rounded-lg border border-danger/40 p-5">
        <h2 id="silme-baslik" className="font-display text-2xl">
          Hesabı sil
        </h2>
        <p className="mt-2 text-sm text-muted">
          Hesabınız, kayıtlı adresleriniz, favorileriniz ve sepetiniz silinir. Verdiğiniz siparişlerin kayıtları yasal
          saklama süresi boyunca tutulur ama hesabınızla bağı kaldırılır; sipariş sayfalarına bağlantıyla ulaşmaya devam
          edebilirsiniz.
        </p>
        <div className="mt-4">
          <DeleteAccountForm action={deleteAccountAction} />
        </div>
      </section>
    </div>
  );
}
