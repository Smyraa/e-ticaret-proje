# TAURA Tesbihçilik

TAURA Tesbihçilik için mağaza uygulaması. Next.js, MongoDB ve Tailwind CSS ile geliştiriliyor. Şu an demo aşamasında: ürünler, fiyatlar ve görseller örnek içeriktir.

## Çalıştırma

Gerekenler: Node.js 24 ve yerelde çalışan bir MongoDB.

```bash
npm install
npm run seed   # örnek ürünleri ve ana sayfa görselinin adını MongoDB'ye, örnek görselleri media/ klasörüne yazar
npm run dev    # http://localhost:3000
```

Veritabanı adresi varsayılan olarak `mongodb://127.0.0.1:27017/taura`. Değiştirmek için `MONGODB_URI` ortam değişkenini kullanın.

WhatsApp numarası için `NEXT_PUBLIC_WHATSAPP_NUMBER` ortam değişkenini kullanın (`.env.local` dosyasına, ülke koduyla ve artı/boşluk olmadan; örn. `905551112233`). Tanımlanmazsa geçersiz bir yer tutucu numara kullanılır. Değişkeni değiştirince geliştirme sunucusunu yeniden başlatın ya da uygulamayı yeniden derleyin.

Demo sürümü arama motorlarına kapalıdır (`noindex`, `/robots.txt` her şeyi engeller). Canlıya çıkarken `SITE_INDEXING=on` ve sitenin tam adresi için `SITE_URL` (örn. `https://ornek.com`) verilir; sonra uygulama yeniden derlenir.

## Medya

Görseller `media/` klasöründe tutulur (git'e girmez) ve `/media/...` adresinden sunulur; veritabanında yalnızca dosya adı saklanır. Dosya adlarına içerik izi (hash) eklenir, böylece 1 yıl önbelleğe alınabilirler. Sayfalarda görseller `next/image` ile ekrana uygun boyutta ve WebP olarak gösterilir.
