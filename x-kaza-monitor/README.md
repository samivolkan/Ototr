# OtoTR Açık Kaynak Araç Olay Merkezi — MVP

Bu modül, X üzerindeki fotoğraflı trafik kazası paylaşımlarını resmî X API ile tarar; görsellerde OCR çalıştırır; geçerli Türkiye plakası bulunan kayıtları insan onayına gönderir ve yalnız kesin plaka eşleşmesi bulunan onaylı kayıtları OtoTR iş emrine açar.

> Bu sürüm bir üretim öncesi MVP'dir. X'ten HTML kazıma/scraping yapmaz. X Bearer Token yalnız sunucuda tutulur.

## Çalışan kapsam

- Anahtar kelime, hariç kelime, konum ve tarih aralığı ile X sorgusu oluşturma
- Recent Search veya Full-Archive Search uç noktası seçimi
- Yalnız fotoğraflı paylaşımları işleme
- X medya görselini sunucuda geçici olarak indirme; kalıcı kopyayı varsayılan olarak saklamama
- Tesseract.js ile OCR
- Türkiye plaka formatı doğrulaması ve aday çıkarma
- Aynı `Post ID + Media Key` kaydını tekilleştirme
- Plakanın tam görünürlüğü, kazalı araca aidiyeti ve kaza bağlamı için zorunlu insan onayı
- Usta ve alıcı için ayrı yayın kapıları
- İş emri plakasında yalnız kesin eşleşme
- Kaynağı X üzerinde yeniden kontrol etme; silinen kaydı otomatik olarak kullanımdan düşürme
- Demo veriyle anahtarsız çalışma

## Yerel çalıştırma

Gereksinimler: Node.js 20 veya üzeri.

```bash
cd x-kaza-monitor/server
cp .env.example .env
npm install
npm test
npm start
```

Ardından tarayıcıda `http://127.0.0.1:8787` adresini açın.

`X_BEARER_TOKEN` boş bırakılırsa panel demo modunda çalışır. Gerçek tarama için `.env` içinde yalnız sunucuda tanımlayın:

```dotenv
X_BEARER_TOKEN=BURAYA_X_BEARER_TOKEN
ADMIN_API_TOKEN=UZUN_RASTGELE_YONETIM_ANAHTARI
DEMO_MODE=false
```

X anahtarını `app.js`, HTML, mobil uygulama veya Git deposuna koymayın. `ADMIN_API_TOKEN` X anahtarı değildir; yönetim API'sini korur. Panel bu değeri yalnız sekme oturumunda tutar. Üretimde ortak bir sabit anahtar yerine OtoTR oturum/rol doğrulamasına geçilmelidir.

## Docker

Dockerfile, `x-kaza-monitor` klasörünü build context olarak kullanır:

```bash
cd x-kaza-monitor
docker build -f server/Dockerfile -t ototr-x-kaza-monitor .
docker run --rm -p 8787:8787 \
  -e HOST=0.0.0.0 \
  -e X_BEARER_TOKEN='...' \
  -e ADMIN_API_TOKEN='uzun-rastgele-yonetim-anahtari' \
  -v ototr-x-data:/app/server/data \
  ototr-x-kaza-monitor
```

## X sorgu örneği

Panelde girilen bilgiler şu yapıya çevrilir:

```text
(kaza OR kazalı OR "trafik kazası" OR çarpıştı)
(Bursa OR Nilüfer OR Osmangazi)
has:images lang:tr -is:retweet -oyun -film
```

Tarih aralığı sorgu metnine yazılmaz; X API isteğinde `start_time` ve `end_time` parametreleri olarak gönderilir.

## Yönetim API erişimi

`ADMIN_API_TOKEN` tanımlıysa panelde **Sistem ve OCR → Yönetim API erişimi** alanına anahtarı girin. Değer `sessionStorage` içinde yalnız açık sekme süresince tutulur. OtoTR portal entegrasyonunda bu geçici mekanizma, mevcut kullanıcı oturumu ve rol yetkisiyle değiştirilmelidir.

Sunucu varsayılan olarak `127.0.0.1` üzerinde dinler. `0.0.0.0` gibi uzak ağ dinlemesinde yönetim anahtarı tanımlı değilse güvenlik nedeniyle açılmaz.

## API özeti

| Yöntem | Yol | Amaç |
|---|---|---|
| GET | `/api/health` | Sunucu ve X bağlantı durumu |
| GET/POST | `/api/rules` | Tarama kurallarını listeleme/oluşturma |
| PATCH/DELETE | `/api/rules/:id` | Kural güncelleme/silme |
| POST | `/api/scans` | Seçilen kuralı hemen çalıştırma |
| GET | `/api/candidates` | OCR ile plakası bulunan adaylar |
| PATCH | `/api/candidates/:id/review` | Moderasyon kararı |
| GET | `/api/plates/:plate?audience=technician` | Usta için kesin eşleşme |
| GET | `/api/plates/:plate?audience=customer` | Alıcı için ayrıca yetkilendirilmiş kesin eşleşme |
| POST | `/api/ocr` | Yüklenen fotoğrafta OCR testi |
| POST | `/api/compliance/recheck` | X kaynağının erişilebilirliğini yeniden doğrulama |

## Kayıt kabul kapısı

Bir adayın usta kullanımına açılması için hepsi zorunludur:

1. Geçerli ve tam Türkiye plakası seçilmiş olmalı.
2. Plakanın tamamı görselde okunabilir olmalı.
3. Plaka, polis/çekici/üçüncü araç yerine kazalı araca ait olmalı.
4. Görselin gerçek trafik kazası bağlamında olduğu doğrulanmalı.
5. Kaynak paylaşım erişilebilir olmalı.
6. Yetkili moderatör işlemi kaydetmeli.

Alıcı görünümü için bunlara ek olarak `customerDisplayAuthorized` onayı gerekir.

## Veri saklama davranışı

Varsayılan ayar:

```dotenv
STORE_MEDIA=false
```

Bu durumda görsel OCR sırasında bellekte işlenir; kalıcı ana kayıt olarak Post ID, Media Key, kaynak URL, OCR sonucu ve moderasyon kararı tutulur. Kaynak denetimi çalıştırıldığında X'te bulunmayan kayıt `source_removed` durumuna alınır ve plaka sorgusundan düşer.

MVP'nin JSON deposu geliştirme içindir. Üretimde `docs/migrations/2026-08-28-open-source-vehicle-incidents.sql` ile sunucu tarafı Supabase/PostgreSQL deposuna geçilmelidir. Plaka araması için düz metin yerine sunucuda hesaplanan HMAC ve şifreli plaka değeri kullanılmalıdır.

## Güvenlik sınırları

- Medya indirme yalnız izinli X CDN alan adlarından ve HTTPS üzerinden yapılır.
- Görsel boyutu sınırlandırılır.
- Statik sunucu `.env` ve `server/` içeriğini yayınlamaz.
- X anahtarı hiçbir API yanıtında yer almaz.
- `ADMIN_API_TOKEN` tanımlandığında sağlık kontrolü dışındaki bütün API yolları Bearer doğrulaması ister.
- Sunucu loopback dışındaki bir adreste dinleyecekse yönetim anahtarı olmadan başlamayı reddeder; yalnız bilinçli `ALLOW_INSECURE_REMOTE=true` istisnası vardır.
- Alıcı sorgusu, yalnız `approved_customer` durumundaki kaydı döndürür.
- Usta sorgusu, bekleyen veya reddedilen kaydı döndürmez.
- Benzer/fuzzy plaka eşleşmesi yapılmaz.

## OCR hakkında önemli sınır

Tesseract.js, MVP'de bütün fotoğraf üzerinde OCR çalıştırır. Uzak, eğik, hareket bulanıklığı olan veya kısmen kapalı plakaları kaçırabilir. Üretim kalitesi için sonraki teknik aşama:

1. Araç nesne tespiti
2. Plaka bölgesi tespiti
3. Perspektif düzeltme ve görüntü iyileştirme
4. Plakanın hangi araca ait olduğunu geometrik olarak ilişkilendirme
5. Birden fazla kare/görsel arasında doğrulama
6. İnsan moderasyonu

Bu nedenle otomatik sonuç tek başına “araç kazalıdır” hükmü üretmez.

## Testler

```bash
cd x-kaza-monitor/server
npm run check
npm test
```

Testler plaka normalizasyonunu, format doğrulamasını, OCR aday çıkarımını, X sorgu üretimini, moderasyon kapısını, kalıcı veri deposunu ve statik panelin zorunlu ekranlarını kapsar.

## Resmî kaynaklar

- X API v2: https://docs.x.com/x-api
- Recent Search: https://docs.x.com/x-api/posts/search-recent-posts
- Full-Archive Search: https://docs.x.com/x-api/posts/search-all-posts
- Tesseract.js: https://github.com/naptha/tesseract.js
