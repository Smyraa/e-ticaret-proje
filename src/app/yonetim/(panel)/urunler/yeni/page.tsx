import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { EMPTY_VALUES } from "@/lib/product-form";
import { listMaterials } from "@/lib/products-admin";
import { createProduct } from "../actions";
import { ProductForm } from "../edit-form";

export const metadata: Metadata = { title: "Yeni ürün · Yönetim · TAURA" };

export default async function NewProductPage() {
  await requireAdmin();
  const materials = await listMaterials();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href="/yonetim/urunler"
        className="inline-flex min-h-11 items-center text-xs tracking-widest text-muted uppercase transition hover:text-primary"
      >
        ← Ürünlere dön
      </Link>
      <h1 className="mt-4 font-display text-4xl">Yeni ürün</h1>
      <p className="mt-3 text-sm text-muted">
        Ürün önce taslak olarak kaydedilir. Hazır olunca “Yayında” kutusunu işaretleyin; o zaman sitede görünür. Fotoğrafları formun sonunda seçebilirsiniz.
      </p>

      <ProductForm action={createProduct} initial={EMPTY_VALUES} materials={materials} submitLabel="Ürünü ekle" pickImages />
    </div>
  );
}
