import { redirect } from "next/navigation";
import { AccountCard } from "@/components/account-card";
import { AccountForm } from "@/components/account-form";
import { getCustomer } from "@/lib/customer-auth";
import { pageMetadata } from "@/lib/metadata";
import { CUSTOMER_PASSWORD_MIN_LENGTH } from "@/lib/password";
import { safeReturn } from "@/lib/return-path";
import { register } from "../hesabim/actions";

export const metadata = pageMetadata("Hesap aç", "Yeni bir müşteri hesabı açın.", { noindex: true });

export default async function SignupPage({ searchParams }: PageProps<"/kayit">) {
  const returnTo = safeReturn((await searchParams).donus);
  if (await getCustomer().catch(() => null)) redirect(returnTo);

  return (
    <AccountCard
      title="Hesap aç"
      intro="Hesap açmak isteğe bağlıdır; hesapsız da sipariş verebilirsiniz. Hesapla favorileriniz, sepetiniz ve siparişleriniz her cihazda sizinle olur."
    >
      <AccountForm
        mode="kayit"
        returnTo={returnTo}
        passwordMin={CUSTOMER_PASSWORD_MIN_LENGTH}
        action={register}
      />
    </AccountCard>
  );
}
