"use client";

import { startTransition, useState, type ChangeEvent, type FormEvent } from "react";
import { maskPhone, maskPostalCode } from "@/lib/input-masks";
import { PROVINCES } from "@/lib/tr-places";

// Ödeme formu ve hesaptaki adres formu ortak kullanır.

// Formu sunucu eylemine gönderir ama React 19'un gönderim sonrası otomatik SIFIRLAMASINI yapmaz: hata dönünce müşterinin
// yazdıkları ve seçtikleri (il, ilçe, kayıtlı adres) olduğu gibi kalır. Sayfa betiği yüklenmeden gönderilirse form
// yine `action` ile normal biçimde gider.
export function submitKeepingValues(action: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
}

export const inputClass = "mt-2 w-full rounded-md border bg-paper p-3 text-sm";

const masks = { phone: maskPhone, postal: maskPostalCode };

type FieldProps = {
  label: string;
  name: string; // formdaki alan adı (ve kutunun kimliği)
  error?: string;
  value: string; // kutuda başlangıçta görünen değer
  type?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  placeholder?: string;
  maxLength?: number;
  // Yazarken biçimlendirme (bkz. input-masks.ts). Maskeli kutuda maxLength kullanılmaz: tarayıcı yapıştırılan yazıyı
  // maskeden ÖNCE keser ("06 690" → "06 69"); uzunluğu maske sınırlar.
  mask?: keyof typeof masks;
  multiline?: boolean;
  rows?: number;
  optional?: boolean;
  className?: string;
};

function ErrorText({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={id} className="mt-1 text-sm font-semibold text-danger">
      {error}
    </p>
  ) : null;
}

// Etiket + kutu + hata iletisi. Hata kutuya aria-describedby ile bağlanır.
export function Field({ label, name, error, value, multiline, rows = 3, optional, mask, className = "", ...input }: FieldProps) {
  const errorId = `${name}-hata`;
  const shared = {
    id: name,
    name,
    defaultValue: value,
    required: !optional,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
    className: `${inputClass} ${error ? "border-danger" : "border-field"}${multiline ? " resize-y" : ""}`,
  };
  const onChange = mask
    ? (event: ChangeEvent<HTMLInputElement>) => {
        event.currentTarget.value = masks[mask](event.currentTarget.value);
      }
    : undefined;

  return (
    <div className={className}>
      <label htmlFor={name} className="text-sm">
        {label}
        {optional && <span className="text-muted"> (isteğe bağlı)</span>}
      </label>
      {multiline ? (
        <textarea {...shared} rows={rows} maxLength={input.maxLength} />
      ) : (
        <input {...shared} {...input} onChange={onChange} />
      )}
      <ErrorText id={errorId} error={error} />
    </div>
  );
}

const byName = [...PROVINCES].sort((a, b) => a.name.localeCompare(b.name, "tr"));

type PlaceProps = {
  city: string;
  district: string;
  postalCode: string;
  errors: { city?: string; district?: string; postalCode?: string };
};

// İl, ilçe ve posta kodu. İl listeden seçilir; seçilen ilin ilçeleri ikinci listede çıkar. Posta kodunun ilk iki hanesi
// ilin plaka kodu olduğundan kutuda örnek olarak gösterilir.
export function PlaceFields({ city: initialCity, district: initialDistrict, postalCode, errors }: PlaceProps) {
  const [city, setCity] = useState(initialCity);
  const [district, setDistrict] = useState(initialDistrict);
  const province = PROVINCES.find((item) => item.name === city);
  const plate = province ? String(province.plate).padStart(2, "0") : null;

  const select = (name: string, error?: string) => ({
    id: name,
    name,
    required: true,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${name}-hata` : undefined,
    className: `${inputClass} ${error ? "border-danger" : "border-field"} disabled:opacity-60`,
  });

  return (
    <>
      <div>
        <label htmlFor="il" className="text-sm">
          İl
        </label>
        <select
          {...select("il", errors.city)}
          value={province ? city : ""}
          autoComplete="address-level1"
          onChange={(event) => {
            setCity(event.target.value);
            setDistrict("");
          }}
        >
          <option value="">İl seçin</option>
          {byName.map((item) => (
            <option key={item.plate} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
        <ErrorText id="il-hata" error={errors.city} />
      </div>

      <div>
        <label htmlFor="ilce" className="text-sm">
          İlçe
        </label>
        <select
          {...select("ilce", errors.district)}
          value={province?.districts.includes(district) ? district : ""}
          disabled={!province}
          autoComplete="address-level2"
          onChange={(event) => setDistrict(event.target.value)}
        >
          <option value="">{province ? "İlçe seçin" : "Önce il seçin"}</option>
          {province?.districts.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <ErrorText id="ilce-hata" error={errors.district} />
      </div>

      <Field
        label="Posta kodu"
        name="posta-kodu"
        error={errors.postalCode}
        value={postalCode}
        autoComplete="postal-code"
        inputMode="numeric"
        mask="postal"
        placeholder={plate ? `${plate}000` : "34000"}
      />
    </>
  );
}
