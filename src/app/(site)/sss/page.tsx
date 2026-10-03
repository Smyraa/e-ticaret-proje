import Link from "next/link";
import type { ReactNode } from "react";
import { StaticPage } from "@/components/static-page";
import { pageMetadata } from "@/lib/metadata";
import { shippingInfo } from "@/lib/shipping";

export const metadata = pageMetadata(
  "Sıkça sorulan sorular",
  "Kargo, iade, hediye paketi ve sipariş hakkında sıkça sorulan sorular (örnek içerik).",
);

// Yalnızca bilinen bilgiler yazılır; belli olmayanlar "henüz belirlenmedi" olarak kalır.
const questions: { question: string; answer: ReactNode }[] = [
  {
    question: "Kargo ücretli mi?",
    answer: shippingInfo,
  },
  {
    question: "İade kabul ediyor musunuz?",
    answer: (
      <>
        Evet, iade kabul edilir. İade koşulları henüz belirlenmedi; belirlendiğinde{" "}
        <Link href="/kargo-ve-iade">Kargo ve iade</Link> sayfasında yazılacak.
      </>
    ),
  },
  {
    question: "Hediye paketi var mı?",
    answer:
      "Evet. Hediye paketi ücretsizdir; sepet sayfasında işaretleyip isteğe bağlı bir not kartı mesajı yazabilirsiniz.",
  },
  {
    question: "Ürün hakkında soru sormak istiyorum, ne yapmalıyım?",
    answer:
      "Ürün sayfasındaki “WhatsApp ile sor” düğmesiyle ürün adı ve bağlantısı hazır bir mesaj gönderebilirsiniz.",
  },
  {
    question: "Siparişim ne zaman teslim edilir?",
    answer: "Teslimat süresi henüz belirlenmedi.",
  },
  {
    question: "Hangi ödeme yöntemleri var?",
    answer: "Ödeme yöntemleri henüz belirlenmedi; ödeme kuruluşu seçildiğinde burada yazılacak.",
  },
];

export default function FaqPage() {
  return (
    <StaticPage title="Sıkça sorulan sorular">
      <div className="divide-y divide-line border-y border-line">
        {questions.map(({ question, answer }) => (
          <details key={question}>
            <summary className="cursor-pointer py-4 font-semibold text-ink marker:text-primary">
              {question}
            </summary>
            <p className="-mt-2 pb-4">{answer}</p>
          </details>
        ))}
      </div>
    </StaticPage>
  );
}
