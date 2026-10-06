// Yönetim formlarının ortak alanları (ürün formu ve site ayarları formu kullanır).

type FieldProps = {
  name: string;
  prefix: string; // kutu kimlikleri için ön ek: "urun" → id="urun-name"
  label: string;
  value: string;
  error?: string;
  hint?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  type?: "text" | "email" | "tel";
  inputMode?: "numeric" | "tel" | "email";
  list?: string;
  maxLength?: number; // sunucudaki sınırla aynı (asıl denetim sunucuda)
};

const controlClass = "mt-2 w-full rounded-md border bg-paper p-3 text-sm";

// Etiket + giriş kutusu + ipucu + hata iletisi. Hata ve ipucu kutuya aria-describedby ile bağlanır.
export function Field({
  name,
  prefix,
  label,
  value,
  error,
  hint,
  required,
  multiline,
  rows = 7,
  type = "text",
  inputMode,
  list,
  maxLength,
}: FieldProps) {
  const id = `${prefix}-${name}`;
  const describedBy = [hint && `${id}-ipucu`, error && `${id}-hata`].filter(Boolean).join(" ") || undefined;
  const shared = {
    id,
    name,
    defaultValue: value,
    autoComplete: "off",
    maxLength,
    "aria-required": required || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: `${controlClass} ${error ? "border-danger" : "border-field"}`,
  };

  return (
    <div>
      <label htmlFor={id} className="text-sm">
        {label}
        {required && <span className="text-muted"> (zorunlu)</span>}
      </label>
      {multiline ? (
        <textarea {...shared} rows={rows} />
      ) : (
        <input {...shared} type={type} inputMode={inputMode} list={list} />
      )}
      {hint && (
        <p id={`${id}-ipucu`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-hata`} className="mt-1 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Check({
  name,
  prefix,
  label,
  hint,
  checked,
}: {
  name: string;
  prefix: string;
  label: string;
  hint: string;
  checked: boolean;
}) {
  const id = `${prefix}-${name}`;
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={checked}
        aria-describedby={`${id}-ipucu`}
        className="mt-0.5 size-6 shrink-0 accent-primary"
      />
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-semibold">
          {label}
        </label>
        <p id={`${id}-ipucu`} className="text-xs text-muted">
          {hint}
        </p>
      </div>
    </div>
  );
}
