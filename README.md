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

## Yönetim paneli

Adres: `/yonetim`. Girmek için önce bir yönetici hesabı açılır. Komut e-postayı sorar, parolayı ise yazarken göstermeden ister; parola hiçbir yere yazılmaz, veritabanında yalnızca özeti durur:

```bash
npm run admin:create
```

Parolayı değiştirmek ya da unutulan parolayı sıfırlamak için `npm run admin:reset`, hesapları listelemek için `npm run admin:list` kullanılır. Parola en az 12 karakter olmalı; art arda 5 yanlış girişten sonra 15 dakika beklenir. Oturum 7 gün sürer.

Ürünler `/yonetim/urunler` sayfasında yönetilir: listeden ürün düzenlenir, "Yeni ürün" ile eklenir. Yeni ürün önce taslak olarak kaydedilir; "Yayında" kutusu işaretlenince sitede görünür, işaret kaldırılınca yeniden gizlenir. Ürünün adresi (`/urun/<ad>`) ilk kayıtta addan üretilir ve sonradan değişmez. Fiyat tam lira, stok tam sayıdır. `npm run seed` yalnızca örnek ürünleri (örnek işaretli olanları) yeniden yazar.

## Medya

Görseller `media/` klasöründe tutulur (git'e girmez) ve `/media/...` adresinden sunulur; veritabanında yalnızca dosya adı saklanır. Dosya adlarına içerik izi (hash) eklenir, böylece 1 yıl önbelleğe alınabilirler. Sayfalarda görseller `next/image` ile ekrana uygun boyutta ve WebP olarak gösterilir.

Ürün görselleri yönetim panelinden yüklenir (ürünü düzenle → Görseller): JPG, PNG veya WebP, dosya başına en çok 10 MB, üründe en çok 8 görsel; ilk görsel ana görseldir, sıralanabilir ve silinebilir. Yüklenen dosyanın türü içeriğinden doğrulanır, fotoğraftaki konum ve tarih gibi gizli bilgiler silinir, en uzun kenar 2400 piksele indirilir ve dosya `media/` klasörüne içerik izli bir adla yazılır. Klasörü `MEDIA_DIR` ortam değişkeniyle başka bir yere alabilirsiniz (canlıda uygulama klasörünün dışında, kalıcı bir yer önerilir; yeni sürüm kurulunca yüklemeler kaybolmasın). Uygulama Nginx'in arkasında çalışacaksa yüklemeler için `client_max_body_size 12m;` gerekir ve Nginx `Host` başlığını uygulamaya iletmelidir.
