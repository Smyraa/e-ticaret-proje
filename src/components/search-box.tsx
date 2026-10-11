"use client";

import Form from "next/form";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FocusEvent, type KeyboardEvent } from "react";
import { formatPrice } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

type Suggestion = { slug: string; name: string; material: string; price: number; oldPrice: number | null; image: string | null };

// Ürün arama kutusu (üst menü). Yazarken 2. harften sonra canlı öneriler açılır: küçük görsel, ad, malzeme ve fiyat
// (/arama/oneri; yazmayı bırakınca 200 ms sonra istenir, eski istek iptal edilir). Ok tuşlarıyla öneriler arasında
// gezilir, Enter seçili ürünü açar; öneri seçilmemişse form koleksiyon sayfasına ?q= ile gider (JavaScript olmadan da
// çalışan sıradan bir GET formu). Escape ya da kutudan çıkmak listeyi kapatır.
export function SearchBox({ onSearch, className = "" }: { onSearch?: () => void; className?: string }) {
  const id = useId();
  const listId = `${id}-oneriler`;
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false); // öneriler isteniyor ("bulunamadı" erken görünmesin)

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const query = q.trim();
      if ([...query].length < 2) {
        setItems([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      fetch(`/arama/oneri?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => response.json())
        .then((data: { items: Suggestion[]; total: number }) => {
          setItems(data.items);
          setTotal(data.total);
          setActive(-1);
          setLoading(false);
        })
        .catch((error) => {
          if (error?.name !== "AbortError") setLoading(false); // ağ hatası: öneri yok, arama yine çalışır
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const showList = open && [...q.trim()].length >= 2;
  const go = (slug: string) => {
    setOpen(false);
    setQ(""); // ürün sayfasına geçince kutu boşalır
    onSearch?.();
    router.push(`/urun/${slug}`);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && items.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % items.length);
    } else if (event.key === "ArrowUp" && items.length > 0) {
      event.preventDefault();
      setActive((index) => (index <= 0 ? items.length - 1 : index - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (event.key === "Enter" && showList && active >= 0 && items[active]) {
      event.preventDefault();
      go(items[active].slug);
    }
  };

  const closeIfOutside = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  };

  return (
    <Form
      action="/koleksiyon"
      role="search"
      onSubmit={() => {
        setOpen(false);
        onSearch?.();
      }}
      onBlur={closeIfOutside}
      className={`relative flex items-center ${className}`}
    >
      <label htmlFor={id} className="sr-only">
        Ürün ara
      </label>
      <div className="flex h-11 w-full items-center rounded-full border border-gold-light/45 bg-paper/10 pl-4 transition focus-within:border-gold-light focus-within:bg-paper/15">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="shrink-0 text-gold-light">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-4.2-4.2" />
        </svg>
        <input
          id={id}
          name="q"
          type="search"
          maxLength={80}
          autoComplete="off"
          placeholder="Tesbih, kehribar, kuka…"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            setOpen(true);
            setLoading(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-paper placeholder:text-paper/55 focus:outline-none"
        />
        <button
          type="submit"
          className="h-full shrink-0 rounded-r-full border-l border-gold-light/45 px-4 text-[11px] font-semibold tracking-[0.22em] text-gold-light uppercase transition hover:bg-gold-light hover:text-espresso"
        >
          Ara
        </button>
      </div>

      {/* Ekran okuyuculara kaç öneri olduğu söylenir */}
      <p role="status" className="sr-only">
        {showList && !loading ? (items.length > 0 ? `${total} ürün bulundu` : "Öneri yok") : ""}
      </p>

      <div
        className={`absolute top-full right-0 left-0 z-50 mt-2 min-w-72 overflow-hidden rounded-xl border border-gold-light/40 bg-espresso/95 shadow-xl shadow-black/40 backdrop-blur-md ${
          showList ? "" : "hidden"
        }`}
      >
        <ul id={listId} role="listbox" aria-label="Arama önerileri">
          {items.map((item, index) => (
            <li
              key={item.slug}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()} // kutu odağı kaybetmesin (liste kapanmasın)
              onMouseEnter={() => setActive(index)}
              onClick={() => go(item.slug)}
              className={`flex cursor-pointer items-center gap-3 px-3 py-2 transition ${index === active ? "bg-gold-light/15" : ""}`}
            >
              <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded bg-sand">
                {item.image && <Image src={mediaUrl(item.image)} alt="" fill sizes="40px" className="object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-paper">{item.name}</span>
                <span className="block text-[11px] tracking-widest text-gold-light uppercase">{item.material}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className={`block font-display text-lg ${item.oldPrice ? "text-gold-light" : "text-paper"}`}>{formatPrice(item.price)}</span>
                {item.oldPrice && <s className="block text-[11px] text-paper/60">{formatPrice(item.oldPrice)}</s>}
              </span>
            </li>
          ))}
        </ul>
        {items.length === 0 && loading ? (
          <p className="px-4 py-3 text-sm text-paper/75">Aranıyor…</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-3 text-sm text-paper/75">“{q.trim()}” için ürün bulunamadı.</p>
        ) : (
          <button
            type="submit"
            onMouseDown={(event) => event.preventDefault()}
            className="block w-full border-t border-gold-light/25 px-4 py-3 text-left text-[11px] font-semibold tracking-[0.2em] text-gold-light uppercase transition hover:bg-gold-light/10"
          >
            Tüm sonuçları gör ({total}) →
          </button>
        )}
      </div>
    </Form>
  );
}
