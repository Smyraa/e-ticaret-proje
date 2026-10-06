import type { ReactNode } from "react";

// Giriş ve kayıt sayfalarının ortak çerçevesi: ortada dar bir kart.
export function AccountCard({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-6 py-16">
      <div className="rounded-lg bg-paper p-6 shadow-sm ring-1 ring-line">
        <h1 className="font-display text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">{intro}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
