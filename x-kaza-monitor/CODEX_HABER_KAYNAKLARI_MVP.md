# Codex Görevi — Haber Kaynakları ve Plaka Eşleştirme MVP

## Amaç

Mevcut `x-kaza-monitor` modülünü yalnız X platformuna bağımlı olmaktan çıkarıp çok kaynaklı **Açık Kaynak Araç Olay Merkezi** haline getir.

İlk gerçek haber kaynağı olarak TRT Haber'in yayınladığı RSS akışını kullan:

- Kaynak adı: TRT Haber — Türkiye
- RSS: `https://www.trthaber.com/turkiye_articles.rss`
- Ana alan adı: `www.trthaber.com`

Bu görevde scraping botu veya browser automation kullanılmayacak. Öncelik RSS + haber sayfasının normal HTTP üzerinden kontrollü okunmasıdır.

## Temel ürün akışı

```text
Haber RSS
  ↓
Kaza anahtar kelimesi filtresi
  ↓
Haber sayfası
  ↓
Haber görselleri
  ↓
Araç/plaka OCR adayları
  ↓
Geçerli Türkiye plakası
  ↓
İnsan moderasyonu
  ↓
Onaylı plaka eşleşme indeksi
  ↓
OtoTR iş emri / usta / alıcı sorgusu
```

## Mimari hedef

X'e özel kodu mümkün olduğunca koru ancak kaynak katmanını genelleştir.

Önerilen yapı:

```text
server/src/sources/
  source-registry.mjs
  x-source.mjs
  rss-news-source.mjs
  trt-haber-source.mjs
```

Ortak kaynak arayüzü aşağıdaki kavramları desteklemeli:

- `id`
- `name`
- `type` (`x_api`, `rss_news`)
- `enabled`
- `baseUrl`
- `feedUrl`
- `allowedHosts`
- `defaultTerms`
- `rateLimitMs`
- `maxArticlesPerScan`
- `supportsDateRange`
- `fetchItems()`
- `fetchArticle()`
- `extractImages()`

Kaynak kodunda yeni haber sitesi eklemek tek bir adapter/config ile mümkün olmalı.

## 1. Kaynak Yönetimi ekranı

Sol menüye `Kaynaklar` bölümü ekle.

Her kaynak kartında:

- Kaynak adı
- Tür
- Aktif / pasif
- Son tarama
- Son başarılı tarama
- Son hata
- Toplam bulunan haber
- Görselli haber
- Plaka adayı bulunan kayıt
- RSS/feed adresi
- Rate limit

TRT Haber varsayılan kaynak olarak seed edilsin fakat kullanıcı isterse pasif yapabilsin.

## 2. TRT Haber RSS taraması

RSS XML'i sunucu tarafında indir.

Güvenlik:

- Yalnız HTTPS
- Yalnız allowlist host
- Redirect sonrası host tekrar doğrulama
- Timeout
- Maksimum gövde boyutu
- User-Agent tanımlı
- Aynı kaynağa agresif istek yok

RSS kayıtlarından en az:

- başlık
- link
- açıklama/özet
- yayın tarihi
- guid

al.

Anahtar kelime filtresi ilk olarak başlık + özet üzerinde çalışsın.

Varsayılan kaza terimleri mevcut `DEFAULT_ACCIDENT_TERMS` ile uyumlu olsun.

Örnek:

- kaza
- trafik kazası
- çarpıştı
- çarpışma
- takla attı
- kontrolden çıktı
- devrildi
- zincirleme kaza

Filtreyi geçen kayıtların haber sayfasını getir.

## 3. Haber sayfası görsel çıkarımı

TRT Haber sayfasından haberin asıl fotoğraflarını çıkar.

Öncelik sırası:

1. `og:image`
2. JSON-LD `image`
3. Haber içeriğindeki büyük görseller

Logo, ikon, avatar, reklam, banner ve 1x1 tracking görsellerini ele.

Aynı görsel URL'sini tekrar işleme.

Her haber için başlangıçta maksimum 8 görsel işle.

## 4. OCR ve plaka zorunluluğu

Mevcut OCR hattını tekrar kullan.

Haber metninde plaka geçmesi tek başına kayıt üretmemeli.

Bir `candidate` oluşması için plaka **fotoğraf üzerinde OCR ile bulunmuş olmalı** veya moderatör tarafından açıkça manuel override ile doğrulanmalı.

Türkiye plaka format doğrulaması mevcut `core.mjs` üzerinden kullanılmalı.

Haber kaynaklı adayda şu alanlar bulunmalı:

- `sourcePlatform: "NEWS"`
- `sourceId: "trt-haber"`
- `sourceName`
- `articleId`
- `articleUrl`
- `articleTitle`
- `articlePublishedAt`
- `imageUrl`
- `imageIndex`
- `ocrText`
- `ocrConfidence`
- `plateCandidates`
- `selectedPlate`
- `status`
- `sourceAvailable`

## 5. Tekilleştirme

Aynı haber veya görsel yeniden tarandığında duplicate üretme.

Önerilen anahtarlar:

- Haber: `sourceId + canonicalArticleUrl`
- Görsel: `articleId + normalizedImageUrl`
- Aday: `sourceId + articleId + imageUrl + plateNormalized`

Aynı kazanın farklı haber sitelerinde çıkması ileride ayrı olay birleştirme katmanına bırakılabilir; bu fazda kaynak bazında ayrı kayıt tutulabilir.

## 6. Moderasyon ekranı

Mevcut X moderasyon ekranını kaynak bağımsız hale getir.

Kartta:

- Kaynak logosu/adı
- Haber başlığı
- Yayın tarihi
- Orijinal haber bağlantısı
- Görsel
- OCR plakası
- OCR güveni
- Kaynak erişim durumu

Zorunlu onaylar aynen korunsun:

- Plaka tam okunuyor
- Plaka kazalı araca ait
- Gerçek trafik kazası bağlamı

Ek olarak:

- `Bu görsel haberin olay görselidir` onayı

Usta görünümü için hepsi zorunlu.

Alıcı görünümü için ayrıca `customerDisplayAuthorized` zorunlu.

## 7. Plaka sorgu ekranı

Mevcut sorgu ekranı X ve haber kaynaklarını birlikte döndürsün.

Örnek kart:

```text
Kaynak: TRT Haber
Tarih: 27.08.2026
Plaka: 16 ABC 123
Durum: Doğrulanmış eşleşme
OCR: %91
[Haberi Aç]
```

Sonuçlar tarih sırasına göre gösterilsin.

Kaynak filtresi ekle:

- Tümü
- X
- Haber Siteleri

Tam plaka eşleşmesi zorunlu olmaya devam etsin; fuzzy plaka kullanılmasın.

## 8. Tarih aralığı

RSS çoğunlukla güncel veri sağlar. Kullanıcı tarih aralığı seçtiğinde:

- RSS kaydının `publishedAt` alanı aralık dışındaysa işleme
- RSS'nin sunmadığı eski içerik için site içi arama scraping'i bu fazda yapma
- Ekranda açıkça `RSS kaynağı mevcut akış kapsamıyla sınırlıdır` uyarısı göster

Gelecekte site arama API'si veya lisanslı arşiv adapteri eklenebilir.

## 9. Kaynak erişilebilirlik kontrolü

Onaylı haber kaydını tekrar kontrol edebilecek endpoint ekle.

Haber URL'si:

- 200 ise aktif
- 404/410 ise kaldırılmış
- kalıcı redirect ise canonical URL güncellenebilir
- diğer hata durumlarında hemen silme; `source_check_failed` olarak işaretle

Tek geçici ağ hatası nedeniyle geçmiş onayı yok etme.

## 10. API

En az şu endpointleri ekle veya mevcut API'yi genişlet:

```text
GET  /api/sources
PATCH /api/sources/:id
POST /api/sources/:id/scan
GET  /api/articles
GET  /api/candidates?source=trt-haber
POST /api/compliance/recheck
```

Mevcut `ADMIN_API_TOKEN` güvenlik mekanizmasını koru.

## 11. Veri modeli

JSON geliştirme deposunu bozmadan schemaVersion artır.

Yeni koleksiyonlar:

- `sources`
- `articles`

Mevcut `candidates` geriye uyumlu kalmalı.

Migration/normalizasyon fonksiyonu ekle ki eski store.json açıldığında uygulama çökmesin.

## 12. Windows yerel demo

Mevcut:

- `OTOTR_DEMO_BASLAT.bat`
- `OTOTR_DEMO_BASLAT.ps1`
- `npm run doctor`

akışını bozma.

Tek tıklamalı Windows başlatmada TRT Haber RSS taraması yapılabilmeli.

X token olmadan uygulama açılmalı ve haber kaynağı taraması çalışabilmeli.

Bu kritik kabul ölçütüdür.

## 13. Demo modu

Demo modunda iki seçenek olsun:

1. Sentetik kayıtlar
2. Canlı TRT Haber RSS

Canlı RSS ağ nedeniyle başarısız olursa uygulama kapanmasın; kaynak kartında hata göster.

## 14. Testler

En az aşağıdakiler test edilmeli:

- RSS parser
- RSS tarih filtresi
- anahtar kelime filtresi
- URL/host allowlist
- redirect host doğrulaması
- HTML'den `og:image` çıkarımı
- JSON-LD image çıkarımı
- duplicate haber engeli
- duplicate görsel engeli
- haber metnindeki plakanın OCR yokken aday üretmemesi
- OCR plakasının candidate üretmesi
- moderasyon kapıları
- usta/alıcı ayrımı
- exact plaka lookup
- X token yokken TRT RSS scan çalışabilmesi
- eski `store.json` ile migration

Çalıştır:

```text
npm run check
npm test
npm run doctor
```

Mümkünse gerçek TRT RSS ile bir smoke test yap; ağ yoksa bunu raporda açıkça belirt ve fixture ile doğrula.

## 15. README

README'yi şu yeni ürün adıyla güncelle:

**OtoTR Açık Kaynak Araç Olay Merkezi**

Açıkla:

- X yalnız kaynaklardan biri
- Haber siteleri RSS adapteri
- Plakanın görselde bulunmasının zorunlu olduğu
- İnsan onayı
- Usta / alıcı yayın ayrımı
- Windows tek tık başlatma
- Gerçek haber görsellerinin kalıcı saklama politikasının kaynağın kullanım koşulları ve hukuki değerlendirmeye bağlı olduğu

## 16. Arayüz

Mevcut kırmızı/siyah OtoTR stilini koru.

Dashboard KPI'larına ekle:

- Aktif kaynak sayısı
- Bugün taranan haber
- Plakalı görsel adayı
- Doğrulanmış eşleşme

Tarama kayıtlarında kaynak tipi rozetleri kullan:

- `X`
- `HABER`

## Kabul ölçütleri

Görev tamamlanmış sayılmak için:

1. Windows'ta `OTOTR_DEMO_BASLAT.bat` ile uygulama açılmalı.
2. X Bearer Token olmadan TRT Haber kaynağı taranabilmeli.
3. TRT RSS'de kaza kelimesi geçen haberler filtrelenebilmeli.
4. Haber sayfasındaki fotoğraf URL'leri güvenli biçimde çıkarılabilmeli.
5. Görselde plaka OCR bulunmayan haber kesin eşleşme oluşturmamalı.
6. OCR adayı insan onayına düşmeli.
7. Onaylı kayıt exact plaka sorgusunda görünmeli.
8. Usta ve alıcı yayın kapıları korunmalı.
9. Aynı haber tekrar tarandığında duplicate kayıt oluşmamalı.
10. `npm run check` ve `npm test` tamamen başarılı olmalı.
11. Gizli anahtarlar ve kullanıcı verileri loglara yazılmamalı.
12. Mevcut X modülü çalışmaya devam etmeli.

## Git

Bu dalda çalış:

`codex/haber-kaynaklari-mvp`

Görev bittiğinde:

- değişiklikleri commit et
- test sonuçlarını commit/PR açıklamasına yaz
- PR hedefini `codex/x-kaza-plaka-mvp` yap
- değiştirdiğin dosyaları ve kalan riskleri özetle
