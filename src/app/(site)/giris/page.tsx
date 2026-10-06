import { redirect } from "next/navigation";
import { AccountCard } from "@/components/account-card";
import { AccountForm } from "@/components/account-form";
import { getCustomer } from "@/lib/customer-auth";
import { pageMetadata } from "@/lib/metadata";
import { safeReturn } from "@/lib/return-path";
import { login } from "../hesabim/actions";

export const metadata = pageMetadata("Giriş", "Hesabınıza giriş yapın.", { noindex: true });

export default async function LoginPage({ searchParams }: PageProps<"/giris">) {
  const returnTo = safeReturn((await searchParams).donus);
  // Zaten giriş yapılmışsa forma gerek yok. Veritabanı kapalıysa form yine açılır (eylem hatayı gösterir).
  if (await getCustomer().catch(() => null)) redirect(returnTo);

  return (
    <AccountCard title="Giriş yap" intro="Favorileriniz, sepetiniz ve siparişleriniz hesabınızda saklanır.">
      <AccountForm mode="giris" returnTo={returnTo} action={login} />
    </AccountCard>
  );
}
