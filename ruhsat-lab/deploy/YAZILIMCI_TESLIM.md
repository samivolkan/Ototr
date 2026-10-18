# Ruhsat OCR 0.3.2 yazılımcı teslim kılavuzu

Bu sürüm, GitHub Pages ERP'de ruhsatı okuyup kullanıcı kontrolünden sonra hızlı iş emrini dolduran prototipin geliştirme paketidir. Yeni alan eşlemesi, bölgesel yeniden okuma, koşul bazında anonim geri bildirim ve karşılaştırmalı değerlendirme aracı içerir. Mevcut model ağırlıkları kullanılmaktadır; ruhsatlarla yeniden eğitilmiş model değildir.

Kalıcı sunucu geçişi beklemededir. GitHub Pages ERP prototipi mevcut bilgisayardaki OCR servisine bağlıdır. Ayrı sunucu kurulmadığı sürece bilgisayar kapalıyken OCR çalışmaz. oto-tr.com hostingi bu prototip yayını kapsamında değiştirilmez.

0.3.1, cins ve kullanım metnindeki bilinen terimleri Türkçe yazıma dönüştürür; ham OCR metnini korur ve değişen alanı kullanıcı kontrolüne bırakır. Marka, model kodları, kişi adları ve kimlikler bu sözlüğe dahil değildir. Yeniden okumada çok satırlı cins tek adaydır; komşu etiketli hücreler ve tipi alanına karışan tarihler elenir. Etiketsiz kırpım seçilen değerin çevresine ortalanmalıdır; sonuç her zaman fotoğrafla onaylanır.

## Kurulum ve çalıştırma

Python 3.12 ve Node.js kullanın. Windows'ta `Kurulum.ps1` sanal ortamı, sabitlenmiş bağımlılıkları ve hash kontrolünden geçen modelleri kurar. `Baslat.cmd` yerel ekranı açar. Linux container ve bağımsız HTTPS sunucu planı [DEPLOYMENT.md](DEPLOYMENT.md) içindedir; bu teslimde Linux/container kabul testi yapılmamıştır.

Model dizini isteğe bağlı `OTOTR_MODEL_DIR` ile belirtilebilir. Modeller ZIP/Git içinde bulunmaz; `setup_models.py` ile indirilir. Ortam anahtarları `.env.example` üzerinden sunucuda oluşturulur; web dosyalarına yazılmaz. `requirements-lock.txt` değiştirilmeden kurulum tekrarlanabilir.

```powershell
.\Kurulum.ps1
.\.venv\Scripts\python.exe -m pytest -q
node --test tests/test_export.cjs tests/test_settings.cjs tests/test_quality.cjs tests/test_erp_bridge.cjs
.\.venv\Scripts\python.exe -X utf8 check_ocr.py
.\.venv\Scripts\python.exe -X utf8 benchmark.py
.\Baslat.cmd
```

`check_ocr.py` ağ bağlantısını engeller ve kurgusal örneğin beklenen değerlerinden sapma varsa başarısız çıkar. `benchmark.py` JPEG sıkıştırma, üç döndürme, farklı yerleşim, boş belge ve perspektif koşullarını ölçer. Bunlar sentetik regresyon kontrolleridir.

## Kod haritası

| Dosya | Sorumluluk |
|---|---|
| `app.py` | Ham görüntü API, sınırlar, erişim/origin kontrolleri, tek OCR iş kilidi |
| `ruhsat/engine.py` | Yerel ONNX modelleri, yön düzeltme, ön işleme |
| `ruhsat/parser.py` | Alan etiketleri ve belge geometrisi, biçim doğrulama, model uyuşmazlığı |
| `ruhsat/retry.py`, `web/retry.js` | Seçilen alanı dört yöntem/model bileşimiyle tekrar okuma |
| `ruhsat/feedback.py`, `web/learning.js` | Alan/sürüm/koşul bazında anonim inceleme istatistiği |
| `evaluate.py`, `dataset.example.json` | Özel veri kümesi doğrulama ve değerleri içermeyen test raporu |
| `web/data-policy.js`, `web/erp-bridge.js` | Araç alanı beyaz listesi, onay ve ERP mesaj sınırı |
| Depo kökündeki `ruhsat-erp.js`, `index.html` | Mevcut GitHub Pages hızlı iş emri entegrasyonu |

ERP uygulamasının bütünü Git deposundadır; OCR ZIP'i bağımsız servis ve entegrasyon adaptörü içindir. Paket ve müşteri seçimi ruhsattan türetilmez. ERP'ye aktarım kayıt işlemini kendiliğinden yapmaz; mevcut kayıt düğmesi kullanıcı tarafından çalıştırılır. Bulut oturumu olmadığında kayıt yalnız tarayıcıda tutulabilir ve ekranda açıkça belirtilir. Üretim oto-tr.com farklı uygulamadır; bu depodaki entegrasyon oraya kurulmuş sayılmaz.

## API sözleşmesi

Çalışan servisin OpenAPI tanımı `/api/openapi.json`, teslim anındaki kopyası `openapi.json` dosyasıdır. Tam okuma yanıt şeması `1.1`, motor sürümü `0.3.2`; mevcut `analysed.Data` alanları korunmuştur.

| Uç | Girdi ve sonuç |
|---|---|
| `GET /api/health` | Motor durumu, sürüm, erişim modu, `field_retry: true` |
| `POST /api/v1/ruhsat/oku` | Görüntü baytları, en fazla 20 MB / 32 MP; araç alanları, geçici satıcı önerisi, kanıt görüntüsü |
| `POST /api/v1/ruhsat/tekrar?field=vin` | Yalnız ilgili araç alanının görüntü baytları, 4 MB / 2 MP; aday değerler ve yöntemleri |
| `POST /api/admin/feedback` | Anonim inceleme sonuçları; 12 KB; bilinmeyen/kişisel alanlar reddedilir |
| `GET /api/admin/feedback?synthetic=false` | Alan, yöntem, ön işleme, sürüm ve fotoğraf koşuluna göre sayaçlar |

POST isteklerinde `X-OTOTR-Client: ruhsat-lab` başlığı gerekir. Sunucu modunda ayrıca OCR uçları için OCR bearer anahtarı, yönetim uçları için ayrı yönetim anahtarı gerekir. Tam okuma ve yeniden okuma aynı CPU kilidini ve 10 istek/dakika test sınırını paylaşır. 400 boş girdi, 401 yetkisiz, 403 origin/erişim, 413 boyut, 422 biçim, 429 meşgul/sınır, 503 motor hazır değil durumları arayüzde gösterilir.

```json
{
  "field": "vin",
  "candidates": [{
    "value": "TEST1234567890123",
    "confidence": 0.94,
    "issues": [],
    "sources": [{"model":"v5","variant":"original"}],
    "needs_review": true,
    "model_agreement": false
  }],
  "attempts": 4,
  "elapsed_seconds": 1.2,
  "requires_confirmation": true,
  "confidence_is_calibrated": false,
  "persistent_storage": false,
  "model_trained": false
}
```

Örnek yanıt kurgusaldır. Normal ve yerel kontrast görüntüleri iki modelle okunur. Adaylar otomatik olarak ilk değerin üzerine yazılmaz. “Bu sonucu kullan” alanı değiştirir ve önceki onayı kaldırır; kullanıcı yeniden kontrol eder. Şasi harfleri tahminle düzeltilmez. Tekrar okuma yalnız araç alanlarına açıktır. Yeni inceleme, yeniden yükleme ve sayfadan ayrılma geçici adayları temizler.

## Kalite paneli ve veri gizliliği

Güven eşiği yalnız inceleme uyarısı verir; doğruluğu veya model ağırlıklarını değiştirmez. Fotoğraf koşulu kullanıcı tarafından net, bulanık, yansımalı, eğik, küçük yazılı, birden fazla veya belirtilmedi olarak seçilir. Geri bildirim ilk OCR değeriyle kullanıcının kontrol edilmiş değeri arasındaki değişiklik bayrağını tutar; değerlerin kendisini tutmaz. Aynı inceleme tekrar kaydedilirse önceki anonim sonuçlar değiştirilir.

0.2 geri bildirimleri okunabilir. SQLite'a `condition` sütunu eklenir; mevcut kayıtlar `unknown` olur. Önceki istatistiklerin yedeğini alın; eski sürüme dönerken eski veritabanı kopyasını kullanın. Açık test tünelinde yönetim uçları kapalı kalır.

Sahip adı/soyadı/kimlik ve adres eğitim etiketlerine, feedback'e, ERP mesajına veya JSON indirmesine eklenmez. Tam API yanıtındaki `lines` ve `image.preview` bunları içerebilir; tam yanıtı veritabanına, APM'e veya loga yazmayın. Belge ve alan kırpımı bellekte işlenir. ERP'de kullanıcının açıkça kaydettiği araç alanları ayrı kayıt akışına tabidir.

## Gerçek belgelerle ölçüm ve eğitim durumu

19 Ekim 2026 tarihinde izin verilen klasörde iki fotoğraf bulundu. Araç alanları için yardımcı bir geliştirme etiketi dosyası oluşturuldu; `label_review: assistant` olarak işaretlendi ve insan kontrolü tamamlanmış eğitim/test etiketi sayılmadı. Gerçek fotoğraflar ve değerler Git'e/teslim ZIP'ine alınmadı. Bu belgeler düzeltmeler sırasında görüldüğü için bağımsız test kümesi değildir.

İlk karşılaştırmada aynı OCR satırları eski alan eşlemesi (`5dddd7e`) ve yeni eşlemeye verilmiştir. Böylece eşleme değişikliği ölçülür; iki ayrı tam motor çalışmasının hız karşılaştırması değildir. Tam metin eşleşmesi Türkçe karakter farklarını da hata sayar. Son ölçüm [VALIDATION_0_3.md](VALIDATION_0_3.md) içindedir.

Özel etiket dosyası biçimi `dataset.example.json` ile gösterilir. Fotoğrafları ve etiketleri erişimi kısıtlı, Git dışındaki aynı ana klasörde tutun. Kişisel sahip alanları şema tarafından reddedilir. Gerçek dosyada yalnız bilinen araç anahtarları ve kontrol edilmiş değerler olmalıdır; boş alan `null` olur.

```powershell
.\.venv\Scripts\python.exe evaluate.py "D:\izinli-veri\labels.json" --split development --output test-results\baseline.json
# Yeni sürümde aynı manifest ve aynı ayarlar ile:
.\.venv\Scripts\python.exe evaluate.py "D:\izinli-veri\labels.json" --split development --output test-results\candidate.json --compare test-results\baseline.json
```

Raporlar gerçek değerleri veya fotoğrafları içermez; alan/koşul bazında tam eşleşme, boş kalma, boş alana yanlış değer koyma ve süreyi içerir. Plaka/şasi gerilemeleri ayrıca listelenir. Dosyalar ve ayarlar değişmişse karşılaştırma reddedilir. Aynı belgenin tekrar çekimleri/kırpımları aynı `document_group` içinde ve aynı veri bölümünde kalmalıdır; grup bölünmesi ve birebir kopyanın farklı grup sayılması reddedilir. Farklı çekimlerin aynı araca ait olduğunu dosya hash'i anlayamaz; gruplamayı veri sorumlusu doğrular. Gerçek/kurgusal sonuçlar ayrı gruplarda raporlanır.

Eğitim için sırayla:

1. İzinli belge çeşitliliğini artırın. İki belge yeni modelin genellemesini ölçmek için yeterli değildir. Yüzlerce fotoğraf tek başına yeterlilik garantisi de değildir; farklı belge düzeni, kamera, ışık, açı ve araç grupları gerekir.
2. Doğru araç metinlerini ve yalnız ilgili alan kırpımlarını insan kontrolünden geçirin. Etiketi `human` yapın; sahip bilgilerini kırpımlardan çıkarın. Yanlış kırpım doğru metinle etiketlenmemelidir.
3. Belge/araç grubuna göre train/validation/test ayrımını dondurun. Test belgelerini hata düzeltmek veya eşik seçmek için kullanmayın; kullanıldıysa geliştirme setine taşıyıp yeni bağımsız test toplayın.
4. Aynı mimarinin eğitilebilir kaynak ağırlıkları ve karakter sözlüğüyle ayrı eğitim ortamında ince ayar yapın. Mevcut ONNX çıkarım dosyaları doğrudan bir eğitim düğmesiyle öğrenmez. [PaddleOCR eğitim kaynağını](https://github.com/PaddlePaddle/PaddleOCR/blob/main/docs/version2.x/ppocr/model_train/finetune.md) seçilen mimari/sürüm için doğrulayın.
5. Yeni ağırlıklar ve sözlüğü sürümleyin, ONNX çıktısını karşılaştırın. Bağımsız testte alan hataları, kritik kimlik hataları ve yanlış yüksek güvenli kabul oranını ölçün. Bu aracın mevcut raporu kalibre edilmiş yanlış kabul olasılığı vermez.
6. Başarılı adayı ayrı portta pilotta deneyin; eski ağırlıklar, sözlük ve yapılandırma ile geri dönüşü koruyun. Üretim geçişini ayrı kabul kararıyla yapın.

Bu teslim model eğitimi, otomatik model terfisi veya üretim doğruluğu onayı içermez. Eğitim için gereken veri ayrımı ve ölçüm altyapısı hazırdır. Yeni model seçildiğinde `setup_models.py` kataloğu/hash kontrolü ve `engine.py` model yapılandırması birlikte sürümlenmelidir. RapidOCR'nin [resmi kullanım belgesi](https://rapidai.github.io/RapidOCRDocs/main/en/install_usage/rapidocr/usage/) çıkarım seçeneklerini açıklar.

## Yayına geçiş ve geri dönüş

0.3 frontend, `health.field_retry` olmadan yeniden okumayı etkinleştirmez. Önce ayrı OCR servisini doğrulayın, sonra `publish_web.py` ile ERP'nin `ruhsat/` dizinini üretin. Build kendi başına dağıtım yapmaz. Tam ERP entegrasyonu ve mevcut yerel kayıt sınırları [OTOTR_INTEGRATION.md](OTOTR_INTEGRATION.md) içindedir. Canlı hosting ve veritabanı bu teslim kapsamında değiştirilmez.

Geri dönüşte önceki OCR kodu/model/sözlük seti ve frontend birlikte kullanılmalıdır. Feedback yedeğini önceki sürüme uygun kopyayla geri alın. Kullanıcı belgeleri veya kayıtlı ERP iş emirleri silinmez. Linux kurulumu, kalıcı HTTPS, yeniden başlatma ve bilgisayar kapalıyken erişim testleri hosting geçişinde ayrıca tamamlanmalıdır.


## 0.3.2 — genişletilmiş belge geliştirme turu

- Sayfa yönü belirlendikten sonra satırların ayrı ayrı 180 derece çevrilmesi kapatıldı. Bu, kısa sayılarda 999/666 gibi hataları önler. İlk dik okuma mevcut metin kutularını yeniden kullanır; koordinatlar korunur.
- Ruhsat fotoğrafın küçük bir bölümünü kaplıyorsa etiket kanıtlarından belge alanı bulunur ve yeniden okunur. Yeterli yapı bulunamazsa veya plaka/şasi kaybolursa yakınlaştırma kabul edilmez. Önceki ve yeni araç okumaları çelişirse iki kanıt korunur ve kullanıcı kontrolü istenir. `image.document_crop`, yön/perspektif/ön işlem uygulanmış ara görseldeki kırpım kutusudur; tüm alan kutuları dönen PNG önizlemesinin koordinatlarındadır.
- Yalnız rakamlardan oluşan 7–30 haneli motor seri numaraları desteklenir. Komşu hücredeki kısa güç/ağırlık sayıları bu yolla motor numarası sayılmaz.
- Parantezsiz eski cins satırlarında AA/AB/AC/AF/BA/BB gövde açıklaması aynı hücreden birleştirilir. Devam satırı tek başına tam cins/ticari ad olarak sunulmaz.
- Ticari ad başlığı bozuksa, ancak marka/tipi/model yılı/cins etiketlerinin yerleşimi yeterli kanıt sağlarsa düşük puanlı bir öneri yapılır. Yöntem `layout` ve kontrol açıklamasıyla belirtilir.
- Yakıt açıklamalarındaki Türkçe terimler korunarak standartlaştırılır. Benzin-elektrik ve HEV açıklamaları ERP'deki Hibrit seçeneğine; benzin/LPG açıklaması mevcut LPG seçeneğine aktarılır. ERP'nin mevcut yakıt seçenekleri değiştirilmez.
- `evaluate.py` ve API sürümü tek `ruhsat.__version__` kaynağını kullanır. Gerçek koleksiyon/etiketler kaynak koddan ayrı yerel klasörde kalır; Git ve teslim ZIP'i bunları içermez.

Ölçümün kapsamı ve kalan sınırlamalar [VALIDATION_0_3.md](VALIDATION_0_3.md) dosyasındaki 0.3.2 bölümünde açıklanır. Bu geliştirmeler model ağırlığı eğitimi değildir. Okunmayan veya çelişkili alanlar iş emrinden önce fotoğrafla kontrol edilir; çok bulanık/üst üste basılmış belgelerde yeni fotoğraf gerekir.
