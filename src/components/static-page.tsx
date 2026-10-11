import type { ReactNode } from "react";

// Sabit içerik sayfalarının ortak düzeni: başlık, "örnek içerik" uyarısı (notice=false ile kapatılır: genel bilgi sayfaları)
// ve metin alanı.
// Metin alanındaki ara başlık (h2) ve paragraf içindeki bağlantı biçimleri burada verilir; sayfalar yalın etiket yazar.
export function StaticPage({ title, notice = true, children }: { title: string; notice?: boolean; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-4xl">{title}</h1>
      {notice && (
        <p className="mt-4 rounded-md bg-soft p-4 text-sm text-muted">
          Örnek içerik: bu sayfadaki metinler yer tutucudur ve işletmenin gerçek bilgilerini içermez.
        </p>
      )}
      <div className="mt-8 space-y-4 leading-relaxed text-muted [&_h2]:pt-4 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-ink [&_p_a:hover]:text-primary [&_p_a]:underline">
        {children}
      </div>
    </div>
  );
}
