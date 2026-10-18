# OTOTR Ruhsat Lab 0.3

Windows üzerinde yerel ruhsat OCR prototipi. Fotoğraf → gerçek OCR → etiket/konum eşlemesi → insan kontrolü → JSON.

## GitHub ve canlı yayın

Bu klasör `samivolkan/Ototr` içindeki bağımsız ruhsat OCR prototipidir. GitHub Pages ERP hızlı iş emrine kontrollü araç aktarımı bağlıdır; üretim oto-tr.com uygulaması bu bağlantıdan ayrıdır. Kaynak kod, kurgusal örnek ve testler bulunur; gerçek belgeler, kişisel OCR sonuçları, yerel günlükler, sanal ortam ve model ağırlıkları depoya alınmaz.

**GitHub Pages bu uygulamanın Python/ONNX motorunu çalıştırmaz.** Ayrı dala push etmek mevcut canlı siteyi değiştirmez ve çalışan bir OCR adresi üretmez. Yerelde aşağıdaki kurulumla çalıştırılabilir. E-posta ile korunan geçici web erişimi için aşağıdaki `WebBaslat.ps1` bölümü eklenmiştir. Kalıcı canlı sürüm için Python 3.12 destekli bir sunucu, model kurulumu, HTTPS ve erişim kontrolü gerekir. Varsayılan API yalnız localhost erişimini kabul eder; doğrudan internete açılmamalıdır.

## Yazılımcı teslimi

0.3 sürümünün kapsamı, API sözleşmesi, karşılaştırmalı ölçüm ve eğitim koşulları [YAZILIMCI_TESLIM.md](deploy/YAZILIMCI_TESLIM.md) içinde. Yeni sürüm ayrı geliştirme dalındadır; bu dal mevcut Pages veya üretim hostingini otomatik güncellemez.

## Açma

`Baslat.cmd` dosyasına çift tıklayın. Uygulama **http://127.0.0.1:8765** adresinde açılır. Model hazırlanırken durum göstergesinin yeşile dönmesini bekleyin. Sunucu yalnız loopback üzerinde dinler; ağdaki diğer cihazlara açık değildir.

`Durdur.cmd` sunucuyu kapatır. Tarayıcıyı kapatmak sunucuyu durdurmaz. Windows yeniden başlatıldıktan sonra `Baslat.cmd` tekrar açılmalıdır. Otomatik başlangıç kurulmamıştır.

## Kullanım

1. JPG, PNG, WebP veya HEIC fotoğrafını seçin, sürükleyin ya da panodan yapıştırın. Sınır: 20 MB / 32 megapiksel.
2. **Ruhsatı oku** düğmesine basın. Ayrıntılı mod iki farklı modelin sonuçlarını karşılaştırır; hızlı mod tek model çalıştırır.
3. Bir alanın adına tıklayarak belgedeki kaynak bölgeyi ve kırpılmış görüntüyü inceleyin. Metin bölgelerini açabilir, görüntüyü büyütebilirsiniz.
4. Gerekirse değerleri düzenleyin. **Kontrol ettim** kutuları kullanıcı kararını kaydeder. Değeri değiştirmek önceki onayı kaldırır.
5. **Taslak JSON** her zaman alınabilir. **Kontrol edilen JSON** için dolu bütün araç alanlarını ve özellikle plaka ile şasiyi onaylayın. Satıcı önerileri bu kontrole dahil değildir ve iki JSON türüne de eklenmez. Okunamayan diğer alanlar `null` kalır. Bu çıktı insan kontrol kaydıdır; resmi kayıt doğrulaması değildir.

Perspektif düzeltme isteğe bağlıdır. Belgenin kenarları görünmüyorsa kapalı tutun. Elle 90° döndürme vardır. Otomatik yön kontrolü metin kutularının geometrisini ve satır yön sınıflandırıcısını birlikte kullanarak 90°/180°/270° düzeltir; kararsız ve az alan bulunan okumada alternatif yönleri dener. Bütün yön hatalarını garanti etmez.

**Örnek belgeyle deneyin** gerçek modele kurgusal bir test görseli gönderir. Önceden hazırlanmış sonuç döndürmez. Örnek, resmi belge değildir. `synthetic_sample` etiketi arayüzden indirilen JSON'a eklenir.

## Teknoloji ve kapsam

- Python 3.12, FastAPI, ONNX Runtime, RapidOCR 3.10.0.
- Birinci model: PP-OCRv5 server metin tespiti + Latin mobile metin tanıma.
- İkinci model: PP-OCRv6 small, Türkçe rotası. Aynı değeri okumak doğruluk garantisi sayılmaz.
- Etiketler, tarihsel alan kodları ve metin kutularının konumu birlikte değerlendirilir. Plaka/VIN biçimi, tarihler, model yılı, sayısal alanlar ve T.C. kontrol basamakları kontrol edilir. VIN için global check-digit kuralı uygulanmaz.
- 24 alan: plaka, şasi, marka, ticari ad, tip, model yılı, motor no, renk, yakıt, sınıf, cins, tescil/ilk tescil tarihleri, belge seri no, kullanım amacı, hacim, güç, ağırlıklar, koltuk/yolcu sayıları, sahip adı/soyadı ve T.C./vergi no.
- Tarihler ISO biçimine çevrilir; plaka/seri numarası boşlukları kaldırılır. Bilinen kategori yazımları standartlaştırılır. İlk OCR değeri korunur. Kimlik, şasi ve motor numarasındaki belirsiz harfler tahminle değiştirilmez.
- `kind` = ticari ad, `vehicle_category` = cins; mevcut Ototr ekranındaki eşleme esas alınmıştır.
- Okuma puanı kalibre edilmiş doğruluk olasılığı değildir. 0.90/0.95 eşikleri yalnız ilk inceleme uyarısıdır. API `confidence_is_calibrated: false` döndürür. Üretim eşikleri gerçek, etiketlenmiş ayrı bir test kümesiyle belirlenmelidir.

## Alan ayarları

Çalışma alanının üstündeki **Alan ayarları** bölümünde araç alanları ve geçici satıcı önerileri ayrı seçilir. **Kokpit seçimi** 17 araç alanı + 3 geçici öneriyle başlar. **Tüm alanları seç** dört ek teknik alanı da açar. **Yalnız plaka ve şasi** kalan alanları kapatır. Plaka ve şasi mevcut doğrulama akışı için zorunludur ve kapatılamaz.

Seçimler anında uygulanır ve yalnız sürüm numarası ile izin verilen alan anahtarları (`ototr.ruhsat.field-selection.v1`) bu tarayıcının `localStorage` alanında tutulur. OCR yanıtı, alan değerleri, dosya adları ve sahip bilgileri buraya yazılmaz. Depolama kapalıysa seçimler yalnız o oturumda çalışır; bu durum ayar bölümünde gösterilir.

Seçilmeyen alanlar sonuç listesine, kontrol sayacına ve iki JSON çıktısına girmez. Mevcut belge yeniden okunmadan alanlar açılıp kapatılabilir; yeni inceleme ve sayfa yenileme alan tercihini korur. Satıcı alanı seçili olsa da dışa aktarıma dahil edilmez. Alan seçimi görüntü/ham OCR metnini maskelemez; bu yerel tanı verisi seçilmeyen bilgileri içerebilir. API'nin ham okuma yanıtı bu tarayıcı tercihinden bağımsızdır; Oto-TR entegrasyonunda alan profili ayrıca aktarılmalıdır.

## Geçici satıcı önerisi

Sahip adı, soyadı/unvanı ve T.C./vergi no, ayrı **Satıcı önerisi** bölümünde gösterilir; düzenlenebilir ve fotoğrafla karşılaştırılabilir. Bu alanlar yalnız mevcut sayfanın belleğindedir. Yeni inceleme, başka fotoğraf seçme, sayfa yenileme ve sayfadan ayrılma sırasında uygulama bunları temizler. Tarayıcı geri/ileri önbelleğinden dönüş de temiz bir incelemeyle başlar.

`schema_version: 1.1` ile araç alanları `fields` ve `analysed.Data` içinde, sahip alanları yalnız `seller_suggestion.fields` içinde döner. `seller_suggestion.persistence` değeri `memory_only` olur. Taslak ve kontrol edilen JSON çıktıları yalnız izin verilen araç alanlarından oluşturulur; sahip alanları, bunların ilk/elle düzeltilmiş/alternatif değerleri, fotoğraf ve ham OCR satırları dahil edilmez. Sahip bilgilerinin onayı araç JSON indirmesini engellemez.

Oto-TR entegrasyonu bu ayrımı korumalı: `seller_suggestion` yalnız geçici form önerisidir; iş emri kaydına, veri tabanına, tarayıcı depolamasına, günlük veya analitiğe yazılmamalıdır. Tam OCR yanıtı `lines` ve `image.preview` nedeniyle kişisel bilgi/adres de içerebilir; tam yanıtın kaydedilmesi uygun değildir. Bu prototipte satıcı kaydı oluşturulmaz. GitHub Pages ERP köprüsünde bu ayrım test edilmiştir; üretim oto-tr.com sunucu uygulamasına kurulmamıştır.

## Gizlilik

Bu bölüm varsayılan `localhost:8765` kullanımı içindir. Aşağıdaki korunan web testi açılırsa fotoğraf ve yanıt HTTPS üzerinden Cloudflare ağına da geçer; OCR yine kendi bilgisayarınızdaki modellerde çalışır. Uygulama fotoğrafı veya sonucu kalıcı kaydetmez. Cloudflare giriş ve bağlantı hizmeti ayrıca kullanılır.

Kurulumda paketler ve yaklaşık 123 MB model indirilir. Modellerin SHA-256 değerleri RapidOCR'nin sabit sürümdeki model kataloğuyla doğrulanır. Normal başlatma ve OCR, yerel model yollarıyla çalışır. Dışarıya görsel/metin gönderen servis, analitik, CDN veya uzaktan font yoktur.

Fotoğraf ham HTTP gövdesiyle belleğe alınır; multipart geçici dosyası oluşturulmaz. Sunucuda belge geçmişi/veritabanı bulunmaz. Görsel ve OCR yanıtları uygulama tarafından dosyaya yazılmaz. Ham OCR metni, fotoğrafta bulunduğu ölçüde kişisel bilgi/adres içerebilir ve yalnız yerel oturumda gösterilir; adres ayrı bir iş alanına aktarılmaz. JSON indirmeniz yalnız araç alanlarını içeren açık bir disk kaydı oluşturur; satıcı önerileri dahil edilmez. İndirilen dosyaların saklanması sizin kontrolünüzdedir.

Yeni inceleme önceki sonucu arayüzden temizler. Bu, işletim sistemi belleği, takas dosyası veya tarayıcının kendi mekanizmaları için adli düzeyde güvenli silme iddiası değildir. HTTP yanıtları `no-store` döner. Günlükler yalnız sunucu başlatma/çalışma hataları içindir; istek içerikleri ve dosya adları loglanmaz.

## API

`GET /api/health` motor durumunu (`loading`, `ready`, `error`) verir.

`POST /api/v1/ruhsat/oku?mode=detailed&rotation=0&rectify=false&auto_rotate=true`

- Gövde: doğrudan görselin binary içeriği; JSON/base64 veya multipart değildir.
- Başlıklar: `Content-Type: image/jpeg` ve `X-OTOTR-Client: ruhsat-lab`.
- Mod: `fast` / `detailed`; dönüş: `0`, `90`, `180`, `270`.
- Yanıt: `fields` (ilk değer, kanıt, puan, uyarılar, alternatifler), `lines`, düzeltilmiş `image.preview`, `quality`, `summary`, `analysed.Data` ve bellekte kullanılacak `seller_suggestion`. `summary` yalnız araç alanlarını sayar.
- `analysed.Data` yalnız Ototr alan adları için bir uyarlama başlangıcıdır; otosorgu API'siyle birebir uyumluluk iddiası yoktur. Ototr'ye henüz bağlantı yapılmamıştır.
- 400 boş veri, 403 farklı origin/eksik istemci başlığı, 413 büyük yükleme, 422 bozuk görsel/parametre, 429 meşgul, 503 motor hazır değil.
- OpenAPI şeması: `/api/openapi.json`.

```python
from pathlib import Path
import httpx

response = httpx.post(
    "http://127.0.0.1:8765/api/v1/ruhsat/oku",
    params={"mode": "detailed"},
    headers={"X-OTOTR-Client": "ruhsat-lab", "Content-Type": "image/jpeg"},
    content=Path("ruhsat.jpg").read_bytes(),
    timeout=180,
)
response.raise_for_status()
result = response.json()
```

Bu yerel API'yi doğrudan internete açmayın. Ototr aşamasında sunucular arası kimlik doğrulama, şube yetkilendirmesi, iş kuyruğu, zaman aşımı ve denetim kaydı ayrıca eklenecektir.

## E-posta ile korunan web testi (Windows)

### ERP içindeki girişsiz test (18 Ekim güncellemesi)

Kullanıcı isteğiyle ERP demosunda ayrı e-posta girişi kaldırıldı. `WebBaslat.ps1 -PublicTest` açık test API'si başlatır. Bu bir kimlik doğrulama mekanizması değildir; API'ye ulaşabilen kişiler kendi yükledikleri görselleri okutabilir. Başka incelemeleri listeleme/okuma veya kayıt geçmişi ucu yoktur. Dakikada toplam 10 OCR isteği, aynı anda tek okuma ve 20 MB sınırı uygulanır. CORS yalnız `https://samivolkan.github.io` için açıktır; CORS/origin kontrolleri kimlik doğrulama yerine geçmez. Sunucu yine sadece loopback üzerinde dinler; tünel yalnız bu OCR uygulamasını açar.

ERP yolu: `index.html#ruhsat` → **Ruhsat Oku**. Arayüz dosyaları `ruhsat/` altında yayımlanır; Python motoru GitHub Pages'te çalışmaz. Motor bağlantı hatası artık açıklanır ve yeniden deneme düğmesi gösterilir. Fotoğraf seçili ve motor hazırsa okuma düğmesi etkinleşir.

Kontrol edilen araç bilgileri, kullanıcının aktar düğmesiyle iş emri taslağına gider: plaka, şasi, motor no, marka, ticari ad/model, model yılı, yakıt. Diğer seçili araç alanları JSON çıktısında mevcuttur; ERP formunun henüz alanı yoktur. İş emri otomatik kaydedilmez. Sahip/satıcı önerileri, fotoğraf ve ham metin ERP mesajına veya iş emri formuna aktarılmaz. Modülden ayrılınca iframe boşaltılarak inceleme temizlenir.

Tünel yeniden başlatıldığında adresi değişir. `publish_web.py --api-base <yeni-https-origin> --output <depo>/ruhsat` komutuyla yalnız izin verilen statik dosyalar ve `ruhsat/config.js` güncellenir, ardından `main` yayımlanır. Adres kaynak yapılandırmasıdır; anahtar veya müşteri verisi içermez. Kalıcı kullanımda sabit OCR sunucusu ve gerçek ERP yetkilendirmesi gerekir. Mevcut Supabase girişine, kullanıcılarına ve veri tabanına değişiklik yapılmadı.

### İsteğe bağlı e-posta koruması

GitHub kod sayfası uygulamayı çalıştırmaz; GitHub Pages Python/ONNX sunucusunu barındırmaz. `WebBaslat.ps1`, mevcut bilgisayarınızda ikinci bir OCR sunucusunu yalnız `127.0.0.1:8766` üzerinde başlatır ve Cloudflare Quick Tunnel ile geçici HTTPS adresi verir. Sadece belirttiğiniz e-posta adresi tek kullanımlık kodla erişebilir. E-posta koruması Cloudflare tarafındadır; uygulamanın origin/host kontrolleri ayrıca korunur ve kendi başına kimlik doğrulama yerine geçmez.

```powershell
.\WebBaslat.ps1 -Email 'kendi-adresiniz@example.com'
# Test bitince:
.\WebDurdur.ps1
```

Başlatıcı resmi `cloudflared` 2026.10.1 Windows x64 sürümünü indirir, SHA-256 değerini doğrular ve e-posta koruma özelliği bulunmazsa yayını durdurur. Program ve geçici süreç bilgileri git dışında kalan `runtime/` dizinindedir. E-posta adresinizi kaynak koda veya GitHub'a eklemeyin. Tarayıcıdan giriş yapılması gerekir; bu bağlantı Ototr'nin sunucular arası API entegrasyonu için değildir.

**Bu kalıcı barındırma değildir:** bilgisayar, internet ve iki arka plan işlemi açık kalmalı; bilgisayar uyursa bağlantı kesilir. Her yeniden başlatmada URL değişir. Otomatik Windows başlangıcı veya uyku ayarı değiştirilmez. WebDurdur yalnız bu projeye ait doğrulanmış süreçleri durdurur; yerel 8765 ekranını etkilemez.

Web görünümü Cloudflare aktarımını belirtir. Fotoğraf ve sonuçlar yine uygulama tarafından kaydedilmez; sahip bilgileri geçici satıcı önerisidir. E-posta modu seçilmişse Cloudflare girişinin API çağrılarında da geçerli olması gerekir. ERP testinde yukarıdaki açık test modu kullanılır.

Kalıcı yayın için Python 3.12 ve ONNX modellerini çalıştırabilen bir sunucu, sabit alan adı/TLS ve sunucu tarafı kimlik doğrulama gerekir. Cloudflare Quick Tunnel kullanım ve sınırları: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

## Kurulum ve test

İlk yerel prototip bilgisayarında `.venv` ve modeller hazırlanmıştır. GitHub kopyası sanal ortamı ve model ağırlıklarını içermez. Yeniden kurulum için PowerShell'de `./Kurulum.ps1` çalıştırılır. Python 3.12 gerekir; script varsa Codex'in mevcut Python 3.12 çalışma ortamını kullanır. Ortam dizinini taşırsanız sanal ortamı yeniden oluşturun. Bağımlılıkların tamamı `requirements-lock.txt` ile sabitlenmiştir.

```powershell
.\.venv\Scripts\python.exe -m pytest -q
node --test tests/test_export.cjs tests/test_settings.cjs tests/test_quality.cjs tests/test_erp_bridge.cjs
.\.venv\Scripts\python.exe -X utf8 check_ocr.py
.\.venv\Scripts\python.exe -X utf8 benchmark.py
```

`check_ocr.py` gerçek çıkarımı ağ bağlantılarını engelleyerek çalıştırır ve kurgusal örneği beklenen alanlarla karşılaştırır. `test-results/` Git dışında tutulur. Kurgusal testler ayrıntılı tanı üretebilir; gerçek belge değerlendirmesi yalnız anonim sayaçlar üretir. Tek örnekteki sonuç gerçek müşteri ruhsatları için başarı oranı değildir. Bir gerçek fotoğrafla yapılan ilk kontrolde eksik ve hatalı alanlar görüldü. Gerçek fotoğraf çeşitliliğiyle pilot test ve OCR iyileştirmesi gereklidir; mevcut sürüm üretim doğruluğu iddiası taşımaz.

Doğrulanan kontroller ve sınırlar [TEST_SONUCLARI.md](TEST_SONUCLARI.md) dosyasındadır.

## İncelenen projeler ve kaynaklar

- [RapidOCR](https://github.com/RapidAI/RapidOCR): kullanılan yerel ONNX çıkarım motoru; Apache-2.0.
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR): kullanılan PP-OCR model ailesinin kaynağı; Apache-2.0.
- [RapidOCR model matrisi](https://rapidai.github.io/RapidOCRDocs/main/model_list/): Türkçe/Latin rotaları ve sürüm seçimi.
- [RapidOCRWeb](https://github.com/RapidAI/RapidOCRWeb): mevcut yerel yükleme/önizleme yaklaşımı incelendi. Bu prototipin arayüzü ve ruhsat ayrıştırıcısı ayrıca yazıldı; projenin arayüz kodu kopyalanmadı.
- [AB Bakanlığı teknik koşullar sunumu, araç tescil belgesi modeli](https://www.ab.gov.tr/files/tarama/tarama_files/14/SC14DET_Road-Technical%20Conditions.pdf): tarihsel alan kodları için başvuruldu. Güncel bütün ruhsat düzenlerini kapsadığı varsayılmadı.

Kütüphane/model hakları ilgili sahiplerindedir. Model kökenleri ve doğrulama değerleri `models/manifest.json` içindedir. Bu prototip belge sahteliği, mülkiyet veya resmi araç kaydı doğrulaması yapmaz.
