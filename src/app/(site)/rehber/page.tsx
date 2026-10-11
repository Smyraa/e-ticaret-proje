import Link from "next/link";
import { StaticPage } from "@/components/static-page";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata(
  "Tesbih rehberi",
  "Tesbihin bölümleri, kehribar, kuka, oltu taşı ve deve kemiği gibi malzemeler, kesim türleri, gerçek kehribarı anlamak ve tesbih bakımı üzerine kısa bir rehber.",
);

// Genel bilgi sayfası (işletmeye özel bilgi içermez, bu yüzden "örnek içerik" uyarısı yok). Alt bilgideki "Yardım" grubundan
// açılır; arama motorlarında "kehribar nasıl anlaşılır" gibi aramalarda bulunmaya da yardım eder.
export default function GuidePage() {
  return (
    <StaticPage title="Tesbih rehberi" notice={false}>
      <p>
        Tesbih seçerken en çok sorulan soruları kısaca bir araya getirdik: tesbihin bölümleri, malzemeler, kesim türleri ve uzun
        yıllar güzel kalması için bakım önerileri.
      </p>

      <h2>Tesbihin bölümleri</h2>
      <p>
        <strong>Taneler:</strong> Çoğunlukla 33 tane kullanılır; 99 taneli tesbihler de vardır. <strong>Durak (nişane):</strong>{" "}
        Taneleri bölümlere ayıran, çoğu zaman farklı biçimdeki ara taneler. <strong>İmame:</strong> Tesbihin başındaki uzun parça.{" "}
        <strong>Püskül:</strong> İmamenin ucundaki süs; ipek örgü (kazaz) ya da gümüş olabilir.
      </p>

      <h2>Malzemeler</h2>
      <p>
        <strong>Damla kehribar:</strong> Milyonlarca yıl önce akan ağaç reçinesinin fosilleşmesiyle oluşan doğal bir malzemedir.
        Hafiftir, ele ılık gelir. Rengi bal sarısından süt beyazına, kırmızımsı tonlara kadar değişir; içinde hava kabarcığı ya da
        küçük doğal kalıntılar görülebilir.
      </p>
      <p>
        <strong>Sıkma kehribar:</strong> Kehribar parçalarının ısı ve basınçla birleştirilmesiyle elde edilir. Renk ve hare
        çeşitliliği fazladır, fiyatı damla kehribara göre daha uygundur.
      </p>
      <p>
        <strong>Kuka:</strong> Bir palmiye ağacı meyvesinin sert çekirdeğinden yapılır. Sert ve dayanıklıdır; kullanıldıkça elin
        yağıyla koyulaşır ve parlar.
      </p>
      <p>
        <strong>Oltu taşı:</strong> Erzurum’un Oltu ilçesi çevresinden çıkan, fosilleşmiş ağaçtan oluşmuş siyah, hafif bir taştır.
        Kullanıldıkça parlaklığı artar.
      </p>
      <p>
        <strong>Deve kemiği:</strong> İşlenmiş kemikten yapılır; beyaz ve fildişi tonlarındadır. Üzerine mine ya da oyma işlenebilir.
      </p>

      <h2>Kesim türleri</h2>
      <p>
        <strong>Arpa kesim:</strong> Arpa tanesine benzeyen uzun oval taneler. <strong>Küre:</strong> Yuvarlak taneler.{" "}
        <strong>Sığırcık kesim:</strong> Kuş yumurtasına benzeyen, bir ucu daha dolgun oval taneler. Tane ölçüsü genellikle milimetre
        olarak verilir (örneğin 11 × 7 mm: boy × en).
      </p>

      <h2>Gerçek kehribar nasıl anlaşılır?</h2>
      <p>
        Kehribar çok hafiftir; aynı boydaki plastik ya da cam taklitler genellikle daha ağır ve daha soğuk gelir. Doymuş tuzlu suda
        kehribar yüzer, birçok taklit batar (püskül ve metal parçalar çıkarılmalıdır). Yine de evde yapılan testler kesin sonuç
        vermez ve sıcak iğne gibi denemeler tesbihe zarar verir. Kesin sonuç için uzmana ya da laboratuvara danışın.
      </p>

      <h2>Bakım</h2>
      <p>
        Parfüm, kolonya, el kremi ve deterjan gibi kimyasallardan uzak tutun; kehribarın parlaklığını bozabilirler. Uzun süre güneşte
        ya da sıcak yerde bırakmayın. Yumuşak, kuru bir bezle silin; gerekirse ılık suyla hafifçe yıkayıp hemen kurulayın. Çizilmemesi
        için diğer takılardan ayrı, bir kesede saklayın.
      </p>

      <p>
        Aklınıza takılan başka bir şey olursa <Link href="/iletisim">bize yazın</Link> ya da{" "}
        <Link href="/koleksiyon">koleksiyonu inceleyin</Link>.
      </p>
    </StaticPage>
  );
}
