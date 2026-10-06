"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { SETTINGS_LIMITS, type SettingsFormState, type SettingsValues } from "@/lib/settings-form";
import { Field } from "../form-fields";

type Props = {
  // Sunucu eylemi. Sayfa (sunucu) verir; bu bileşende `.bind` edilmez (bkz. ImageManager'daki açıklama).
  action: (state: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;
  initial: SettingsValues; // kayıtlı ayarlar
  mailNote?: string; // e-posta hizmetinin durumu (sunucu hesaplar); sipariş bildirimi kutusunun ipucuna eklenir
};

// Site ayarları formu (iletişim bilgileri, sipariş bildirimi e-postası ve kargo ücreti). Doğrulama sunucuda yapılır;
// hata varsa yazılanlar korunur, ilk hatalı kutuya odaklanılır.
export function SettingsForm({ action, initial, mailNote }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  // Kaydedildi iletisi, kaydın ardından forma yeniden dokunulana kadar görünür.
  const [editedAfter, setEditedAfter] = useState<SettingsFormState>(undefined);

  const values = state?.values ?? initial;
  const errors = state?.errors ?? {};
  const hasErrors = Object.keys(errors).length > 0;
  const savedVisible = state?.saved === true && editedAfter !== state;

  useEffect(() => {
    if (state?.errors) formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      onChange={() => setEditedAfter(state)}
      className="mt-6 space-y-6"
    >
      <Field
        prefix="ayar"
        name="whatsapp"
        maxLength={24}
        type="tel"
        inputMode="tel"
        label="WhatsApp numarası"
        value={values.whatsapp}
        error={errors.whatsapp}
        hint="Müşteriler ürün sayfasındaki “WhatsApp ile sor” düğmesiyle bu numaraya yazar. Örn. 0555 111 22 33. Boş bırakırsanız düğme demo olarak görünür."
      />
      <Field
        prefix="ayar"
        name="phone"
        maxLength={24}
        type="tel"
        inputMode="tel"
        label="Telefon"
        value={values.phone}
        error={errors.phone}
        hint="İsteğe bağlı: sabit hat ya da ikinci bir numara. İletişim sayfasında ve alt bilgide görünür."
      />
      <Field
        prefix="ayar"
        name="email"
        maxLength={SETTINGS_LIMITS.email}
        type="email"
        inputMode="email"
        label="E-posta"
        value={values.email}
        error={errors.email}
        hint="İsteğe bağlı. İletişim sayfasında ve alt bilgide görünür."
      />
      <Field
        prefix="ayar"
        name="address"
        maxLength={SETTINGS_LIMITS.address}
        label="Adres"
        multiline
        rows={3}
        value={values.address}
        error={errors.address}
        hint="İsteğe bağlı. İletişim sayfasında görünür."
      />
      <Field
        prefix="ayar"
        name="hours"
        maxLength={SETTINGS_LIMITS.hours}
        label="Çalışma saatleri"
        value={values.hours}
        error={errors.hours}
        hint="İsteğe bağlı. Örn. Hafta içi 09:00–18:00. İletişim sayfasında görünür."
      />

      <h2 className="pt-4 font-display text-2xl">Sipariş bildirimleri</h2>
      <Field
        prefix="ayar"
        name="orderEmail"
        maxLength={SETTINGS_LIMITS.email}
        type="email"
        inputMode="email"
        label="Yeni sipariş bildirimi e-postası"
        value={values.orderEmail}
        error={errors.orderEmail}
        hint={`İsteğe bağlı. Yeni bir sipariş geldiğinde bu adrese haber verilir; sitede görünmez. Boş bırakırsanız yukarıdaki e-posta kullanılır.${mailNote ? ` ${mailNote}` : ""}`}
      />

      <h2 className="pt-4 font-display text-2xl">Kargo</h2>
      <Field
        prefix="ayar"
        name="shippingFee"
        maxLength={6}
        label="Kargo ücreti (TL)"
        required
        inputMode="numeric"
        value={values.shippingFee}
        error={errors.shippingFee}
        hint="Tam lira. Ücretsiz için 0 yazın. Sepet ve ödeme özetinde, SSS ve Kargo ve iade sayfalarında bu ücret görünür."
      />

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 bg-espresso px-8 text-xs font-semibold tracking-widest text-paper uppercase transition hover:bg-primary disabled:opacity-60"
        >
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>

      <p role="status" className="min-h-6 text-sm">
        {savedVisible ? "Ayarlar kaydedildi." : ""}
      </p>
      {hasErrors && (
        <p role="alert" className="text-sm font-semibold text-danger">
          Formda düzeltilmesi gereken alanlar var. İlk hatalı alana gidildi.
        </p>
      )}
      {state?.message && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}
