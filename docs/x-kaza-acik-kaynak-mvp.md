# OtoTR — X Kaza Görseli / Plaka Eşleştirme MVP Teknik Kararı

Tarih: 28 Ağustos 2026  
Durum: İlk çalışan MVP

## 1. Amaç

Kamuya açık X paylaşımlarındaki trafik kazası fotoğraflarını resmî API üzerinden taramak; fotoğrafta geçerli araç plakası bulunuyorsa kaydı insan moderasyonuna almak; plaka OtoTR iş emrindeki araçla tam eşleştiğinde doğrulanmış kaynak kartını ustaya veya ayrıca yetkilendirilmişse alıcıya göstermek.

Sistem resmî hasar/Tramer kaydı üretmez ve tek başına ağır hasar, pert veya garanti kabul/red kararı vermez.

## 2. MVP akışı

```text
Tarama kuralı
  → X Recent/Full-Archive Search
  → Fotoğraflı gönderiler
  → X CDN görselini geçici indirme
  → OCR
  → Türkiye plaka formatı kontrolü
  → İnsan moderasyonu
  → Usta / alıcı yayın kapısı
  → İş emrinde kesin plaka eşleşmesi
  → Periyodik kaynak erişim denetimi
```

## 3. Temel kararlar

### 3.1 Scraping yok

Tarayıcı otomasyonu veya HTML kazıma yapılmayacak. X API erişimi sunucu tarafında kullanılacak. Bearer Token istemciye, mobil uygulamaya veya Git deposuna konulmayacak.

### 3.2 Plaka fotoğrafta zorunlu

Metinde plaka yazması yeterli değildir. Aday yalnız OCR sonucunda geçerli plaka düzeni bulunursa moderasyon kuyruğuna alınır. Moderatör plakanın kazalı araca ait olduğunu ayrıca işaretlemeden kayıt yayınlanamaz.

### 3.3 Kesin eşleşme

İş emri sorgusunda plaka normalize edilir; yalnız birebir eşleşme kullanılır. Bir karakter eksik, benzer veya olasılıksal plaka eşleşmesi gösterilmez.

### 3.4 İki ayrı yayın yetkisi

- `approved_internal`: Usta/operasyon ekranında kullanılabilir.
- `approved_customer`: Usta ekranına ek olarak alıcıya gösterilebilir.

Alıcı yetkisi, iç onayın otomatik uzantısı değildir.

### 3.5 Kaynak güncelliği

Kaynak paylaşım X üzerinde bulunamazsa kayıt `source_removed` yapılır. Bu kayıt usta ve alıcı plaka sorgusundan düşer. Medya kopyası varsayılan olarak kalıcı saklanmaz.

## 4. MVP veri modeli

Geliştirme sürümü atomik yazılan yerel JSON deposu kullanır:

- `rules`: kelime, konum, tarih ve çalışma periyodu
- `scans`: her taramanın sayısal sonucu ve hata özeti
- `candidates`: Post ID, Media Key, OCR/plaka adayı ve durum
- `audit`: moderasyon ve kaynak kaldırma hareketleri

Üretimde PostgreSQL/Supabase şemasına geçilecek. Plaka düz metin olarak indekslenmeyecek; sunucu tarafı HMAC arama anahtarı ve şifreli değer kullanılacak.

## 5. OtoTR entegrasyon sözleşmesi

İş emri açılırken veya ruhsat OCR ile plaka okunduğunda:

```http
GET /api/plates/{PLAKA}?audience=technician
```

Alıcı rapor/portal gösteriminde:

```http
GET /api/plates/{PLAKA}?audience=customer
```

Yanıt yalnız onaylı ve kaynağı erişilebilir kayıtları içerir. Her kartta kaynak platform, paylaşım tarihi, kaynak bağlantısı ve “resmî hasar kaydı değildir” açıklaması bulunur.

## 6. Güvenlik kontrolleri

- X Token yalnız sunucu `.env` ortamında
- Yönetim API'sinde ayrı Bearer anahtarı ve loopback dışı dinleme kapısı
- HTTPS medya şartı
- X CDN alan adı izin listesi
- Görsel boyutu ve JSON gövde sınırı
- Statik sunucuda server/.env erişimi yok
- Post ID + Media Key tekillik kontrolü
- Onay hareketlerinde denetim kaydı
- Alıcı erişiminde ayrı durum filtresi
- Kaynağı kaldırılan kaydı otomatik engelleme

## 7. Üretime geçiş öncesi zorunlu işler

1. X kullanım senaryosu ve veri gösterim politikasının hukuk/KVKK incelemesi
2. X API erişimi, bütçe limiti ve rate-limit izleme
3. Sunucu tarafı PostgreSQL/Supabase deposu
4. Plaka HMAC + şifreleme anahtar yönetimi
5. Geçici `ADMIN_API_TOKEN` yerine OtoTR oturumu ile rol tabanlı erişim: moderatör, usta, hukuk, yönetici
6. Araç ve plaka nesne tespit modeli
7. Perspektif düzeltme ve çoklu kare doğrulaması
8. Kaynak silme/erişim denetiminin zamanlanmış job olarak işletilmesi
9. Saklama-imha takvimi ve başvuru/itiraz süreci
10. Pilot doğruluk ölçümü ve yanlış eşleşme eşiği

## 8. Pilot KPI'ları

- Taranan paylaşım sayısı
- Fotoğraflı paylaşım sayısı
- OCR ile plaka bulunan görsel oranı
- Moderatörün geçerli kabul ettiği plaka oranı
- Plakanın kazalı araca ait çıkma oranı
- Yanlış pozitif oranı
- OtoTR iş emirlerinde bulunan eşleşme oranı
- Doğrulanmış kayıt başına X API + OCR maliyeti
- Kaynağı sonradan kaldırılan kayıt oranı
- Moderasyon ortalama süresi

## 9. Faz 2 teknik hedefi

Tesseract bütün fotoğraf yerine önce araç ve plaka bölgelerine uygulanacak. Her plaka kutusu araç kutusuyla ilişkilendirilecek; hasarlı araç sınıflandırması ve moderatörün çizdiği/işaretlediği kazalı araç alanı birlikte kullanılacak. Böylece “fotoğrafta herhangi bir plaka var” ile “plaka kazalı araca ait” ayrımı otomatik olarak güçlendirilecek; insan onayı yine korunacak.
