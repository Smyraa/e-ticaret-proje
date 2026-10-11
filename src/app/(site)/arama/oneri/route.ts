import { filterProducts, getProducts } from "@/lib/products";

// Üst menüdeki arama kutusunun canlı önerileri: GET /arama/oneri?q=kehr → yayındaki ürünlerden ad ya da malzemesi
// eşleşen ilk 6 tanesi (koleksiyon aramasıyla aynı kural) ve toplam eşleşme sayısı. 2 harften kısa arama boş döner.
export const dynamic = "force-dynamic";

const LIMIT = 6;

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if ([...q].length < 2) return Response.json({ items: [], total: 0 });
  try {
    const found = filterProducts(await getProducts(), { q });
    return Response.json(
      {
        items: found.slice(0, LIMIT).map((product) => ({
          slug: product.slug,
          name: product.name,
          material: product.material,
          price: product.price,
          oldPrice: product.oldPrice,
          image: product.images[0] ?? null,
        })),
        total: found.length,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Arama önerileri okunamadı", error);
    return Response.json({ items: [], total: 0 }, { status: 503 });
  }
}
