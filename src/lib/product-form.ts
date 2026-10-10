// Ürün formunun alanları, doğrulaması ve durum türleri. Hem sunucu eylemlerinde hem formda kullanılır
// (tarayıcıya yalnızca türler gider). Doğrulama sunucuda yapılır; tarayıcıdaki kontrole güvenilmez.
import { barcodeProblem, normalizeBarcode } from "./barcode";
import { charCount, multiLine, oneLine, tooLong } from "./form-text";
import { parseLira } from "./money";
import type { Product } from "./products";

export const LIMITS = {
  name: 80,
  material: 40,
  size: 80,
  weight: 40,
  craft: 200,
  story: 2000,
  priceMax: 10_000_000,
  stockMax: 100_000,
} as const;

// Formdaki alanlar; fiyat ve stok yazıldığı gibi (metin) tutulur ki hata sonrası kullanıcının yazdığı geri gelsin.
export type ProductFormValues = {
  name: string;
  material: string;
  size: string;
  weight: string;
  craft: string;
  story: string;
  price: string;
  oldPrice: string; // boş = indirim yok
  stock: string;
  barcode: string; // boşsa kayıtta sistem üretir
  category: string; // kategorinin adresi; boş = kategorisiz
  published: boolean;
  sample: boolean;
};

// Yeni ürün formunun başlangıç değerleri: taslak olarak başlar.
export const EMPTY_VALUES: ProductFormValues = {
  name: "",
  material: "",
  size: "",
  weight: "",
  craft: "",
  story: "",
  price: "",
  oldPrice: "",
  stock: "",
  barcode: "",
  category: "",
  published: false,
  sample: false,
};

// Var olan ürünün değerleriyle formu doldurmak için.
export function valuesOf(product: Product): ProductFormValues {
  return {
    name: product.name,
    material: product.material,
    size: product.size,
    weight: product.weight,
    craft: product.craft,
    story: product.story,
    price: String(product.price),
    oldPrice: product.oldPrice === null ? "" : String(product.oldPrice),
    stock: String(product.stock),
    barcode: product.barcode,
    category: product.category,
    published: product.published,
    sample: product.sample,
  };
}

export type ProductField = Exclude<keyof ProductFormValues, "published" | "sample">;
export type ProductFormErrors = Partial<Record<ProductField, string>>;

export type ProductFormState =
  | {
      values?: ProductFormValues; // son gönderilen (düzeltilmiş) değerler
      errors?: ProductFormErrors; // alan başına hata iletisi
      message?: string; // genel hata (ör. veritabanına yazılamadı)
      saved?: boolean; // değişiklikler kaydedildi
      created?: string; // yeni ürün kaydedildi, seçilen fotoğraflar yüklenecek (ürünün adresi)
    }
  | undefined;

// Silme düğmelerinin sonucu (başarıda sayfa yönlendirildiği için yalnız hata döner).
export type DeleteState = { error?: string } | undefined;

// Doğrulanmış, veritabanına yazılmaya hazır ürün bilgisi.
export type ProductData = {
  name: string;
  material: string;
  size: string;
  weight: string;
  craft: string;
  story: string;
  price: number;
  oldPrice: number | null; // indirim öncesi fiyat; null = indirim yok
  stock: number;
  barcode: string; // boşsa kayıtta sistem üretir
  category: string; // var olduğu sunucu eyleminde denetlenir
  published: boolean;
};

function parseStock(text: string): number | null {
  const digits = text.replace(/\s/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : null;
}

export function readProductForm(formData: FormData): {
  values: ProductFormValues;
  errors: ProductFormErrors;
  data?: ProductData;
} {
  const values: ProductFormValues = {
    name: oneLine(formData.get("name")),
    material: oneLine(formData.get("material")),
    size: oneLine(formData.get("size")),
    weight: oneLine(formData.get("weight")),
    craft: oneLine(formData.get("craft")),
    story: multiLine(formData.get("story")),
    price: oneLine(formData.get("price")),
    oldPrice: oneLine(formData.get("oldPrice")),
    stock: oneLine(formData.get("stock")),
    barcode: normalizeBarcode(oneLine(formData.get("barcode"))),
    category: oneLine(formData.get("category")).slice(0, 80),
    published: formData.get("published") === "on",
    sample: formData.get("sample") === "on",
  };
  const errors: ProductFormErrors = {};

  if (!values.name) errors.name = "Ürün adını yazın.";
  else if (charCount(values.name) < 2) errors.name = "Ürün adı en az 2 karakter olmalı.";
  else if (charCount(values.name) > LIMITS.name) errors.name = tooLong(LIMITS.name, values.name);

  if (!values.material) errors.material = "Malzemeyi yazın.";
  else if (charCount(values.material) > LIMITS.material) errors.material = tooLong(LIMITS.material, values.material);

  for (const field of ["size", "weight", "craft", "story"] as const) {
    if (charCount(values[field]) > LIMITS[field]) errors[field] = tooLong(LIMITS[field], values[field]);
  }

  const price = parseLira(values.price);
  if (!values.price) errors.price = "Fiyatı yazın.";
  else if (price === null) errors.price = "Fiyatı tam lira olarak, yalnız rakamla yazın (örn. 3500).";
  else if (price < 1) errors.price = "Fiyat 0'dan büyük olmalı.";
  else if (price > LIMITS.priceMax) {
    errors.price = `Fiyat en çok ${LIMITS.priceMax.toLocaleString("tr-TR")} TL olabilir.`;
  }

  // Eski fiyat isteğe bağlıdır; doluysa satış fiyatından yüksek olmalı (yoksa indirim olmaz).
  const oldPrice = values.oldPrice ? parseLira(values.oldPrice) : null;
  if (values.oldPrice) {
    if (oldPrice === null) errors.oldPrice = "Eski fiyatı tam lira olarak, yalnız rakamla yazın (örn. 4200).";
    else if (oldPrice > LIMITS.priceMax) {
      errors.oldPrice = `Eski fiyat en çok ${LIMITS.priceMax.toLocaleString("tr-TR")} TL olabilir.`;
    } else if (price !== null && oldPrice <= price) errors.oldPrice = "Eski fiyat, satış fiyatından yüksek olmalı (yoksa boş bırakın).";
  }

  const stock = parseStock(values.stock);
  if (!values.stock) errors.stock = "Stok adedini yazın (yoksa 0).";
  else if (stock === null) errors.stock = "Stok adedini yalnız rakamla yazın (örn. 3).";
  else if (stock > LIMITS.stockMax) {
    errors.stock = `Stok en çok ${LIMITS.stockMax.toLocaleString("tr-TR")} olabilir.`;
  }

  const barcode = barcodeProblem(values.barcode);
  if (barcode) errors.barcode = barcode;

  if (Object.keys(errors).length > 0 || price === null || stock === null) return { values, errors };

  return {
    values,
    errors,
    data: {
      name: values.name,
      material: values.material,
      size: values.size,
      weight: values.weight,
      craft: values.craft,
      story: values.story,
      price,
      oldPrice,
      stock,
      barcode: values.barcode,
      category: values.category,
      published: values.published,
    },
  };
}
