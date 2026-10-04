import Link from "next/link";
import { OrderPayment } from "@/components/order-payment";
import type { Order } from "@/lib/order-model";
import { isSessionOpen, paymentsActive, type PayState, type PaymentRecord, type PaymentSetup } from "@/lib/payment-model";

type Action = (state: PayState, formData: FormData) => Promise<PayState>;

type Props = {
  order: Order;
  setup: PaymentSetup;
  latest: PaymentRecord | null; // siparişin en son ödeme denemesi
  startAction: Action;
  checkAction: Action;
};

const box = "mt-4 rounded-md bg-soft p-4 text-sm text-muted";

// Sipariş sayfasının ödeme bölümü. İçerik sipariş ve ödeme kayıtlarının GERÇEK durumundan çıkar (adresteki işaretlere
// bakılmaz): ödeme alınmışsa teşekkür, bekleniyorsa "Kartla öde", başarısızsa nedeniyle yeniden deneme.
export function OrderPaymentSection({ order, setup, latest, startAction, checkAction }: Props) {
  // Ödemesi alınmış / iade edilmiş sipariş: kısa bilgi.
  if (order.status !== "pending") {
    if (latest?.status === "refunded") {
      return (
        <p className={box}>
          Kartla yaptığınız ödeme iade edildi. İadenin hesabınıza yansıması bankanıza göre birkaç gün sürebilir.
        </p>
      );
    }
    if (latest?.status === "refund-failed") {
      return <p className={box}>Ödemenizin iadesi için sizinle iletişime geçeceğiz.</p>;
    }
    if (latest?.status === "paid") return <p className="mt-4 text-sm font-semibold">Ödemeniz alındı. Teşekkür ederiz.</p>;
    return null;
  }

  if (setup.mode === "off") {
    return (
      <p className={box}>
        Demo sürümü: ödeme alınmadı ve ödeme adımı henüz kurulmadı. Canlıda bu adımda ödeme kuruluşunun güvenli formu
        açılacak.
      </p>
    );
  }

  if (!paymentsActive(setup)) {
    return (
      <p className={box}>
        Kartla ödeme şu an alınamıyor. Siparişiniz kaydedildi; ödeme için sizinle iletişime geçeceğiz.{" "}
        <Link href="/iletisim" className="underline transition hover:text-primary">
          İletişim
        </Link>
      </p>
    );
  }

  // Para alınmış ama sipariş "ödendi" olmadı (tutar uyuşmadı ya da işlem yarıda kaldı): yönetim ilgileniyor.
  if (latest?.status === "paid") {
    return (
      <p className={box}>
        Ödemeniz alındı; siparişinize işlenmesi kontrol gerektiriyor. Sizinle iletişime geçeceğiz, ek bir işlem yapmanız
        gerekmiyor.
      </p>
    );
  }

  const open = latest !== null && isSessionOpen(latest);
  return (
    <section aria-labelledby="odeme-baslik" className="mt-6">
      <h2 id="odeme-baslik" className="font-display text-2xl">
        Ödeme
      </h2>
      {open ? (
        <p className="mt-2 text-sm text-muted">
          Ödeme sayfasına yönlendirilmiştiniz. Ödemeyi tamamladıysanız aşağıdaki düğmeyle durumu kontrol edin; tamamlamadıysanız
          ödemeye devam edebilirsiniz.
        </p>
      ) : latest?.status === "failed" ? (
        <p className="mt-2 text-sm text-muted">
          <span className="font-semibold text-danger">Son ödeme denemesi tamamlanamadı.</span>{" "}
          {latest.failure ? `${latest.failure} ` : ""}
          Siparişiniz kayıtlı; aynı sipariş için yeniden deneyebilirsiniz.
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">Siparişiniz kayıtlı, ödeme bekleniyor. Kart bilgileriniz bu sitede girilmez.</p>
      )}
      <OrderPayment
        startAction={startAction}
        checkAction={checkAction}
        canCheck={open}
        startLabel={open ? "Ödemeye devam et" : latest?.status === "failed" ? "Yeniden dene" : "Kartla öde"}
      />
    </section>
  );
}
