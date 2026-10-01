# TAURA Tesbihçilik

TAURA Tesbihçilik için mağaza uygulaması. Next.js, MongoDB ve Tailwind CSS ile geliştiriliyor. Şu an demo aşamasında: ürünler ve fiyatlar örnek içeriktir.

## Çalıştırma

Gerekenler: Node.js 24 ve yerelde çalışan bir MongoDB.

```bash
npm install
npm run seed   # örnek ürünleri MongoDB'ye yazar
npm run dev    # http://localhost:3000
```

Veritabanı adresi varsayılan olarak `mongodb://127.0.0.1:27017/taura`. Değiştirmek için `MONGODB_URI` ortam değişkenini kullanın.
