"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearCart } from "@/lib/cart";

// Sipariş sayfasına sipariş verildikten hemen sonra gelinirse (adreste ?yeni=1) teşekkür iletisi gösterir ve sepeti
// boşaltır, sonra işareti adresten kaldırır: sayfa yenilenince ya da sipariş bağlantısı sonradan açılınca müşterinin
// yeni sepeti silinmez. İşaret kalkınca sayfa yeniden çizilir; "ilk açılış" bilgisi bu yüzden durumda tutulur ve ileti
// sayfa açık kaldıkça görünür.
export function NewOrderNotice({ fresh }: { fresh: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNew] = useState(fresh);

  useEffect(() => {
    if (!isNew) return;
    clearCart();
    router.replace(pathname);
  }, [isNew, router, pathname]);

  if (!isNew) return null;
  return (
    <p role="status" className="mt-6 rounded-md bg-soft p-4 text-sm font-semibold">
      Siparişiniz alındı, teşekkür ederiz.
    </p>
  );
}
