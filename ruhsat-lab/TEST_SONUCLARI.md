# Prototip doğrulaması

Tarih: 18 Ekim 2026 (Europe/Istanbul). Windows, 16 GB RAM. OCR testlerinde CPU kullanıldı.

## Otomatik kontroller

`python -m pytest -q`: **25 test geçti**. Paket bütünlüğü kontrolü: `pip check` başarılı. Python derleme ve JavaScript sözdizimi kontrolleri geçti.

Kapsanan durumlar: Türkçe etiketler, uzun/kısa etiket çakışması, sütun ayrımı, örtüşen OCR kutuları, tarih ve model yılı, eksik değerler, sıfır yolcu sayısı, tahmini VIN düzeltmesinin engellenmesi, model uyuşmazlığı, isimlerde Türkçe karakter farklarının korunması, adresin ayrı alana aktarılmaması, geçerli/geçersiz API parametreleri, dosya boyutu, bozuk veri, çapraz origin/Host reddi, eşzamanlı istek ve motor hazırlık durumu.

Test araçlarından bir kullanım dışı bırakma uyarısı var: Starlette TestClient gelecekte httpx yerine httpx2 kullanılmasını öneriyor. Testler başarılı; kullanıcı uygulamasının çalışmasını etkilemiyor.

## Gerçek OCR ile kurgusal görsel kontrolleri

Aşağıdakiler önceden hazırlanmış OCR sonuçları değildir; indirilen yerel modeller çalıştırıldı. Bu testler sırasında Python socket bağlantıları engellendi; çıkarım için dış ağ gerekmedi.

| Senaryo | Doğru / beklenen alan | Süre |
|---|---:|---:|
| Normal kurgusal belge, son arayüz okuması | 23 / 23 | 24.99 sn |
| JPEG kalite 65 | 23 / 23 | 24.21 sn |
| 90° döndürülmüş belge | 23 / 23 | 33.79 sn |
| 180° döndürülmüş belge | 23 / 23 | 28.25 sn |
| 270° döndürülmüş belge | 23 / 23 | 30.41 sn |
| Farklı satır içi yerleşim ve farklı değerler | 7 / 7 | 10.28 sn |
| Perspektifi bozulmuş belge, düzeltme açık | 23 / 23 | 23.47 sn |
| Boş görsel | 0 alan üretildi, uyarı gösterildi | 7.83 sn |

Dönüş testleri tek model modunda; JPEG, farklı yerleşim ve perspektif testleri iki model modunda yapıldı. Süreler bu bilgisayardaki tekil ölçümlerdir; hız garantisi veya istatistiksel performans ölçümü değildir.

HEIC bellekte kodlama/açma ve JPEG EXIF yön düzeltmesi ayrıca doğrulandı.

## Tarayıcıdan doğrulanan akış

- Gerçek dosya seçiciyle görsel yükleme ve örnek görsel yükleme.
- API'ye binary görsel gönderilmesi ve 23 alanın gösterilmesi.
- Şasi alanının fotoğraf üzerinde işaretlenmesi ve kaynak kırpımın görüntülenmesi.
- Elle değiştirilmiş değerde ilk OCR değerinin korunması.
- Düzenleme sonrası önceki onayın kaldırılması.
- Kontrol eksikken onaylı JSON indirme düğmesinin kapalı kalması.
- 23 dolu alanın kontrolünden sonra JSON indirme.
- İndirilen dosyada `review_state: human_reviewed`, `synthetic_sample: true`, 23 alan onayı ve doğru plaka kontrolü. Görüntü JSON'a eklenmiyor.
- Son arayüz testinde tarayıcı uyarı/hata günlüğü boş.
- HTTP sağlık uç noktası ve OpenAPI görsel gövde şeması başarılı.

Ekran görüntüsü: `test-results/prototip-ekrani.jpg`. Kurgusal örnek test raporu: `test-results/benchmark.json`. Test JSON çıktısı: `test-results/reviewed-sample.json`.

## Sınırlar

**Bir gerçek ruhsat fotoğrafıyla ilk pilot kontrol yapıldı; eksik, kısmi ve hatalı okumalar görüldü. Gerçek belge ve kişisel çıktı bu rapora veya depoya alınmadı.** İki kurgusal yerleşim ve bunların dönüşümleri, gerçek ruhsatların güvenlik deseni, yansıma, eskime, kat izi ve farklı telefon kameralarını temsil etmez. Bu sonuçlardan üretim doğruluk oranı çıkarılamaz.

El yazısı, bütün tarihsel ruhsat düzenleri ve çok ağır parlamalar için başarı garantisi yoktur. Puanlar kalibre edilmemiştir. Üretime geçmeden önce kullanımına yetkili olunan gerçek örnekler, ayrı bir doğrulama kümesi ve alan bazında hata/düzeltme ölçümü gerekir.

Ototr/otosorgu sistemlerinde ayar veya kod değişikliği yapılmadı. Üretim bağlantısı ayrıca ele alınacaktır.


## Geçici satıcı önerisi güncellemesi — 18 Ekim 2026

Önceki 25 testlik sürümün üstüne üç Python testi eklendi: sahip alanlarının ayrılması, gerçek motor yanıtının araç verisine sahip alanlarını koymaması ve geçici API yanıtında `no-store`. Python testlerinin tamamı başarılı (27 testlik tam koşu ve son eklenen testi de içeren 12 testlik API/gizlilik koşusu). Node.js tarafında eski/yeni yanıt ve taslak/kontrol edilmiş çıktı kombinasyonlarını kapsayan 4 dışa aktarım testi başarılı.

Tarayıcıda kurgusal belge gerçek OCR ile 25.25 saniyede okundu: 21 araç alanı ve ayrı satıcı önerisinde 2 dolu, 1 boş sahip alanı. Kurgusal sahip adı ve kimlik alanı elle değiştirildi. Sahip önerileri onaylanmadan 21 araç alanının onayıyla kontrol edilmiş JSON indirilebildi. İndirilen gerçek dosyada sahip anahtarları, ilk ve düzeltilmiş sahip değerleri, fotoğraf ve ham OCR satırlarının bulunmadığı doğrulandı. Çıktı: `test-results/seller-private-reviewed.json`.

Yeni inceleme sonrasında satıcı alanları DOM'dan kaldırıldı; kaynak metin, ham metin, görüntü kırpımı, fotoğraf önizlemesi ve dosya seçimi temizlendi. Bu kontroller gerçek kişi verisiyle yapılmadı. Oto-TR üretim entegrasyonu henüz değişmedi.

İkinci kurgusal OCR okumasından sonra sayfa yenileme ayrıca denendi: satıcı bölümü gizli, alan sayısı sıfır, fotoğraf ve ham metin temiz; yeni belge bekleniyor. Tarayıcı uyarı/hata günlüğü boş. Ekran kanıtı: `test-results/satici-onerisi.jpg` (kurgusal belge).


## Alan seçimi ayarları — 18 Ekim 2026

JavaScript sözdizimi kontrolleri ve 9 Node.js testi başarılı. Yeni testler: 17 araç + 3 geçici önerilik Kokpit profili, 24 alanlık tüm seçim, zorunlu plaka/şasi, bilinmeyen/tekrarlı anahtarların reddi, yalnız tercih anahtarlarının kalıcı depolanması, bozuk/engellenen depolamadan güvenli dönüş ve seçilmeyen alanların JSON dışına çıkarılması.

Tarayıcıda motor no kapatılıp koltuk sayısı açıldı ve T.C./vergi no önerisi kapatıldı. Yenilemeden sonra üç seçimin de korunduğu doğrulandı. Kurgusal belge gerçek OCR ile 8.65 saniyede okundu; Kokpit profilinde 17 araç ve 3 öneri alanı gösterildi. Okuma sırasında ayar değişikliği kapalıydı.

Mevcut sonuç yeniden okunmadan tüm seçimde 21 araç + 3 öneri, minimal seçimde 2 araç ve gizli satıcı bölümü doğrulandı. Sonrasında sahip adı önerisi açılıp yalnız plaka/şasi onaylandı. Gerçek indirilen JSON'da sadece bu iki araç alanı bulundu; kapatılan marka ve açık sahip önerisi dahil edilmedi. Çıktı: `test-results/selected-fields-reviewed.json`. Marka tekrar açılınca onay ilerlemesi 2/3 oldu ve kontrol edilmiş indirme yeniden kapandı.

Yeni inceleme belgeyi temizlerken 17 araç + 3 önerilik varsayılan tercih korundu. Ekran `Alan ayarları` açık halde bırakıldı. Tarayıcı uyarı/hata günlüğü boş. Ekran kanıtı: `test-results/alan-ayarlari.jpg`. Ham OCR API'si değişmedi; tercihler yerel arayüz ve JSON dışa aktarımına uygulanır.


## GitHub gönderimi öncesi son doğrulama

32 Python testi ve 9 Node.js testi başarılı. Adres hücresindeki devam satırlarının araç alanlarına karışmasını önleme, adres benzeri metinleri aday/alternatiflerden çıkarma, yakıt ve araç sınıfı biçim kontrolleri, yanlış başlıkların motor/hacim alanına alınmaması ve eksik parantezli metnin incelemeye işaretlenmesi test edildi. Bu kontroller bütün belge düzenlerinde kusursuz okuma veya veri ayıklama garantisi değildir.

Yalnız kod, bağımlılık listeleri, kurgusal örnek ve testler yayınlanır. `test-results/`, `runtime/`, `models/`, `.venv/` ve gerçek belge dosyaları Git kapsamı dışındadır. Bu dalın gönderilmesi bir canlı OCR dağıtımı değildir.
