"use client";

import { useState } from "react";
import { addressLabel } from "@/lib/address-label";
import type { SavedAddress } from "@/lib/customer-addresses";
import { phoneForInput } from "@/lib/input-masks";
import type { CheckoutErrors, CheckoutState } from "@/lib/order-form";
import { formatPhone } from "@/lib/phone";
import { Field, PlaceFields } from "./form-field";

const NEW = "yeni";
const ADDRESS_FIELDS = ["name", "phone", "address", "city", "district", "postalCode"] as const;

type Props = {
  saved: SavedAddress[]; // giriş yapmış müşterinin kayıtlı adresleri (misafirde boş)
  signedIn: boolean;
  defaultName: string; // yeni adreste alıcı adı olarak hesaptaki ad
  state: CheckoutState;
  errors: CheckoutErrors;
};

// Ödeme formunun teslimat bölümü: alıcı adı ve telefonu, adres, il / ilçe / posta kodu. Kayıtlı adresi olan müşteri
// adreslerinden birini seçer (alanlar gizli olarak gönderilir, yeniden yazmak gerekmez) ya da "Yeni adres" der.
// Girişliyken yeni adres "Adresi kaydet" kutusuyla adres defterine eklenir.
export function DeliveryFields({ saved, signedIn, defaultName, state, errors }: Props) {
  const [choice, setChoice] = useState(saved[0]?.id ?? NEW);
  // Seçim, gönderilen formdan SONRA değiştiyse seçilen adres gösterilir; değilse (hata sonrası) müşterinin gönderdiği.
  // null: henüz seçim yapılmadı (sayfa JavaScript'siz gönderilip hatayla döndüyse de gönderilen değerler gösterilir).
  const [choiceState, setChoiceState] = useState<CheckoutState | null>(null);
  const picked = saved.find((address) => address.id === choice) ?? null;
  const typed = choiceState !== state ? state?.values : undefined;

  // Kayıtlı adres seçiliyken alanlar gizlidir; bir alanında hata çıkarsa (adres artık geçersizse) alanlar açılır.
  const addressError = ADDRESS_FIELDS.some((field) => errors[field]);
  const showFields = !picked || addressError;

  const value = {
    name: typed?.name ?? picked?.name ?? defaultName,
    phone: typed?.phone ?? (picked ? phoneForInput(picked.phone) : ""),
    address: typed?.address ?? picked?.line ?? "",
    city: typed?.city ?? picked?.city ?? "",
    district: typed?.district ?? picked?.district ?? "",
    postalCode: typed?.postalCode ?? picked?.postalCode ?? "",
  };

  function choose(id: string) {
    setChoice(id);
    setChoiceState(state);
  }

  return (
    <section aria-labelledby="teslimat-baslik">
      <h2 id="teslimat-baslik" className="font-display text-2xl">
        Teslimat bilgileri
      </h2>

      {saved.length > 0 && (
        <fieldset className="mt-4">
          <legend className="text-sm">Kayıtlı adreslerim</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {[...saved, null].map((address) => {
              const id = address?.id ?? NEW;
              const checked = choice === id;
              return (
                <label
                  key={id}
                  className={`flex cursor-pointer gap-3 rounded-md border p-4 text-sm transition ${
                    checked ? "border-primary bg-soft" : "border-field hover:border-primary"
                  }`}
                >
                  <input
                    type="radio"
                    name="adres-secimi"
                    value={id}
                    checked={checked}
                    onChange={() => choose(id)}
                    className="mt-0.5 size-5 shrink-0 accent-primary"
                  />
                  {address ? (
                    <span className="min-w-0">
                      <span className="block font-semibold">{addressLabel(address)}</span>
                      <span className="block text-muted">
                        {address.name} · <span className="whitespace-nowrap">{formatPhone(address.phone)}</span>
                      </span>
                      <span className="block break-words text-muted">{address.line}</span>
                      <span className="block text-muted">
                        {address.district} / {address.city} · {address.postalCode}
                      </span>
                    </span>
                  ) : (
                    <span className="font-semibold">Yeni adres</span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Seçim değişince alanlar yeni değerlerle yeniden kurulur. */}
      <div key={`${choice}-${showFields}`} className="mt-4 grid gap-4 sm:grid-cols-2">
        {showFields ? (
          <>
            <Field
              label="Alıcının adı soyadı"
              name="ad-soyad"
              error={errors.name}
              value={value.name}
              autoComplete="name"
              maxLength={80}
            />
            <Field
              label="Telefon"
              name="telefon"
              error={errors.phone}
              value={value.phone}
              type="tel"
              autoComplete="tel-national"
              inputMode="tel"
              placeholder="0555 111 22 33"
              mask="phone"
            />
            <Field
              label="Adres"
              name="adres"
              error={errors.address}
              value={value.address}
              multiline
              maxLength={300}
              autoComplete="street-address"
              className="sm:col-span-2"
            />
            <PlaceFields
              city={value.city}
              district={value.district}
              postalCode={value.postalCode}
              errors={errors}
            />
          </>
        ) : (
          <>
            <input type="hidden" name="ad-soyad" value={value.name} />
            <input type="hidden" name="telefon" value={value.phone} />
            <input type="hidden" name="adres" value={value.address} />
            <input type="hidden" name="il" value={value.city} />
            <input type="hidden" name="ilce" value={value.district} />
            <input type="hidden" name="posta-kodu" value={value.postalCode} />
          </>
        )}
      </div>

      {signedIn && !picked && (
        <SaveAddress save={typed?.saveAddress ?? true} title={typed?.addressTitle ?? ""} />
      )}
    </section>
  );
}

// "Adresi kaydet" kutusu (işaretli gelir) ve isteğe bağlı başlık.
function SaveAddress({ save: initialSave, title }: { save: boolean; title: string }) {
  const [save, setSave] = useState(initialSave);
  return (
    <div className="mt-4 rounded-md bg-soft p-4">
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="adresi-kaydet"
          value="evet"
          checked={save}
          onChange={(event) => setSave(event.target.checked)}
          className="size-5 shrink-0 accent-primary"
        />
        Bu adresi sonraki siparişlerim için kaydet
      </label>
      {save && (
        <div className="mt-3 max-w-xs">
          <Field
            label="Adres başlığı"
            name="adres-basligi"
            value={title}
            optional
            maxLength={30}
            placeholder="Ev, İş…"
          />
        </div>
      )}
    </div>
  );
}
