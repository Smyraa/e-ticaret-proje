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

WhatsApp numarası, iletişim bilgileri ve kargo ücreti ortam değişkeniyle değil, yönetim panelindeki Site ayarları sayfasından girilir (aşağıya bakın). WhatsApp numarası girilmezse geçersiz bir yer tutucu numara kullanılır ve WhatsApp düğmelerinin altında demo uyarısı çıkar.

Demo sürümü arama motorlarına kapalıdır (`noindex`, `/robots.txt` her şeyi engeller). Canlıya çıkarken `SITE_INDEXING=on` ve sitenin tam adresi için `SITE_URL` (örn. `https://ornek.com`) verilir; sonra uygulama yeniden derlenir.

## Yönetim paneli

Adres: `/yonetim`. Girmek için önce bir yönetici hesabı açılır. Komut e-postayı sorar, parolayı ise yazarken göstermeden ister; parola hiçbir yere yazılmaz, veritabanında yalnızca özeti durur:

```bash
npm run admin:create
```

Parolayı değiştirmek için panelde `/yonetim/hesap` (Hesap) sayfası kullanılır: mevcut parola sorulur, parola değişince diğer cihazlardaki ve tarayıcılardaki tüm oturumlar kapanır. Unutulan parolayı sıfırlamak için `npm run admin:reset`, hesapları listelemek için `npm run admin:list` kullanılır. Parola en az 12 karakter olmalı. Aynı e-posta ve aynı adresten art arda 5 yanlış girişten sonra 15 dakika beklenir; adrese bakmadan aynı e-postaya 20 yanlış denemeden sonra da. Oturum 7 gün sürer.

Ürünler `/yonetim/urunler` sayfasında yönetilir: listeden ürün düzenlenir, "Yeni ürün" ile eklenir. Yeni ürün önce taslak olarak kaydedilir; "Yayında" kutusu işaretlenince sitede görünür, işaret kaldırılınca yeniden gizlenir. Ürünün adresi (`/urun/<ad>`) ilk kayıtta addan üretilir ve sonradan değişmez. Fiyat tam lira, stok tam sayıdır. `npm run seed` yalnızca örnek ürünleri (örnek işaretli olanları) yeniden yazar. Bir ürünü kalıcı olarak silmek için düzenleme sayfasının altındaki "Ürünü sil" kullanılır (görselleri de silinir, geri alınamaz; bir siparişte kullanılan görsel dosyaları diskten silinmez); geçici olarak gizlemek için "Yayında" kutusunu kaldırmak yeterlidir. Canlıya çıkmadan önce Ürünler sayfasındaki "Örnek ürünleri sil" düğmesi tüm örnek ürünleri ve görsellerini tek seferde siler (gerçek ürünlere dokunmaz); `npm run seed` yeniden çalıştırılırsa gerçek bir ürünle çakışan örnek adresi varsa hiçbir şey yazmadan durur.

Site ayarları `/yonetim/ayarlar` sayfasındadır: WhatsApp numarası, telefon, e-posta, adres, çalışma saatleri, kargo ücreti (tam lira, 0 = ücretsiz) ve ana sayfa görseli. Telefonlar "0555 111 22 33" gibi yazılır, kaydedilirken ülke koduyla tek biçime çevrilir. Boş bırakılan iletişim bilgisi sitede gösterilmez; ayarlar kaydedilince iletişim sayfası, alt bilgi, ürün sayfasındaki WhatsApp düğmesi, sepet/ödeme özeti ve SSS ile Kargo ve iade sayfaları hemen yeni değerleri kullanır. Ana sayfa görseli ürün görselleriyle aynı işlemden geçer (tür doğrulama, gizli bilgi silme, küçültme).

## Medya

Görseller `media/` klasöründe tutulur (git'e girmez) ve `/media/...` adresinden sunulur; veritabanında yalnızca dosya adı saklanır. Dosya adlarına içerik izi (hash) eklenir, böylece 1 yıl önbelleğe alınabilirler. Sayfalarda görseller `next/image` ile ekrana uygun boyutta ve WebP olarak gösterilir.

Ürün görselleri yönetim panelinden yüklenir (ürünü düzenle → Görseller): JPG, PNG veya WebP, dosya başına en çok 10 MB, üründe en çok 8 görsel; ilk görsel ana görseldir, sıralanabilir ve silinebilir. Yüklenen dosyanın türü içeriğinden doğrulanır, fotoğraftaki konum ve tarih gibi gizli bilgiler silinir, en uzun kenar 2400 piksele indirilir ve dosya `media/` klasörüne içerik izli bir adla yazılır. Klasörü `MEDIA_DIR` ortam değişkeniyle başka bir yere alabilirsiniz (canlıda uygulama klasörünün dışında, kalıcı bir yer önerilir; yeni sürüm kurulunca yüklemeler kaybolmasın). Uygulama Nginx'in arkasında çalışacaksa yüklemeler için `client_max_body_size 12m;` gerekir ve Nginx `Host` başlığını uygulamaya iletmelidir.

## Siparişler

Üyelik yoktur: müşteri misafir olarak sipariş verir, sepet ve favoriler müşterinin tarayıcısında durur. Ödeme sayfasındaki "Siparişi tamamla" siparişi kaydeder. Ürünler, fiyatlar ve kargo ücreti sunucuda veritabanından yeniden okunur (tarayıcıdan gelen tutara güvenilmez); ürünün adı, fiyatı ve görseli siparişe anlık kopya olarak yazılır, ürün sonradan değişse ya da silinse de sipariş bozulmaz. Sipariş "ödeme bekleniyor" durumunda açılır; stok ödeme alınınca düşer (ödeme henüz kurulmadı, demo). Sipariş numarası rastgele ve okunaklıdır (`TA-7KQ2-X9DM`). Müşteri `/siparis/<gizli anahtar>` sayfasına yönlenir: anahtar tahmin edilemez uzunlukta rastgele bir metindir, sayfa telefon ve e-postayı kısmen gizler, arama motorlarına kapalıdır ve adresi kaydedilerek sonradan açılabilir. Aynı bağlantı adresinden 30 dakikada en çok 5 sipariş açılabilir.

## Güvenlik

- **Başlıklar:** her yanıtla güvenlik başlıkları gider (`next.config.ts`): sayfanın başka bir sitenin içine gömülmesi, dosya türünün tahmin edilmesi ve gereksiz yönlendiren bilgisi engellenir; yayında HTTPS zorunluluğu (HSTS) da eklenir. `X-Powered-By` gönderilmez.
- **İçerik güvenlik politikası (CSP):** `src/proxy.ts` her sayfa isteği için yeni bir tek kullanımlık anahtar (nonce) üretir; tarayıcı yalnızca bu anahtarı taşıyan, yani sitenin kendi komut dosyalarını çalıştırır, sayfaya sızdırılmış bir `<script>` çalışmaz. Bu yüzden sayfalar her istekte çizilir (kök düzende `dynamic = "force-dynamic"`). İki görsel yükleme adresi proxy'nin dışındadır (Next.js proxy'li yollarda istek gövdesini 10 MB'ta keser). Ödeme sağlayıcısı gibi dışarıdan bir komut dosyası eklenirse politika ve `x-nonce` başlığı birlikte düşünülmelidir.
- **Giriş:** yönetim sayfalarının, eylemlerinin ve yükleme adreslerinin her biri kendi giriş kontrolünü yapar. Oturum anahtarı veritabanında yalnızca özet olarak durur. Giriş denemesi sınırı bağlantı adresini `X-Forwarded-For` başlığının **son** değerinden alır; bu, Nginx'in kendi gördüğü adrestir (baştaki değerleri istemci yazabilir). Nginx'te `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` (ekler) ya da `proxy_set_header X-Forwarded-For $remote_addr;` (üzerine yazar) kullanılır.
- **Kontroller:** canlıya çıkmadan önce `npm audit --omit=dev` çalıştırılır (yayına giden paketlerde bilinen açık olmamalı).
