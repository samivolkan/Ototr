# Prototip doğrulaması

Tarih: 18 Ekim 2026 (Europe/Istanbul). Windows, 16 GB RAM. OCR testlerinde CPU kullanıldı.

## Otomatik kontroller

Son kontrol: `python -m pytest -q`: **44 test geçti**; Node dışa aktarım/alan ayarı testleri: **9 test geçti**, ERP aktarım sınırı: **2 test geçti** (toplam 55). Paket bütünlüğü kontrolü: `pip check` başarılı. Python derleme ve JavaScript sözdizimi kontrolleri geçti.

## ERP ve girişsiz test güncellemesi

GitHub Pages `main` yayını yeniden etkinleştirildi ve ERP dashboard tarayıcıda açıldı. E-posta kapısının API sağlık isteğini tekrar girişe yönlendirdiği gözlendi; motor yerelde hazır olduğu halde arayüz okuma düğmesini bu nedenle kapatıyordu. Kullanıcının isteğiyle girişsiz test modu eklendi. Dış HTTPS adresinde sağlık sorgusu ve ERP origin CORS preflight 200 döndü; kurgusal belge gerçek modellerle 18.11 saniyede okunup beklenen plaka/şasiyi verdi. Sahip alanları araç verisine girmedi.

İstek origin'i zorunlu, yabancı origin reddediliyor, 10 istek/dakika sınırı test edildi. ERP mesajı ayrı izin listesiyle süzülüyor; sahip, fotoğraf ve ham metin kabul edilmiyor. Bunlar üretim kimlik doğrulaması değildir. Tarayıcıda ERP içi son kullanıcı akışı ayrıca kontrol edilir.

## Korumalı web önizlemesi

- Resmi cloudflared 2026.10.1 Windows x64 paketi SHA-256 ile doğrulandı; `--allowed-mail` ile tek yetkili e-posta yapılandırıldı.
- Anonim GET `/`, `/api/health` ve `/assets/app.js` istekleri giriş ekranına 302 ile yönlendirildi. Anonim OCR POST isteği 401 ile reddedildi.
- Web modu sunucusu yalnız 127.0.0.1:8766 dinliyor. Kurgusal belge, web origin/Host başlıklarıyla yerel bağlantı üzerinden gerçek modellerle 24.65 saniyede okundu; 21 araç alanı döndü, plaka ve şasi beklenen değerlerle eşleşti, sahip alanları `analysed.Data` içine girmedi.
- Yanlış Host 400, yanlış origin 403; yanıt `Cache-Control: no-store`. Boş/geçersiz web origin yapılandırması ve web gizlilik açıklaması test edildi.
- Giriş sonrası dış web adresindeki OCR akışı kullanıcının e-posta koduyla girişini bekler. Yukarıdaki yerel bağlantı testi, internet üzerinden uçtan uca OCR doğrulaması değildir.
- WebBaslat/WebDurdur PowerShell sözdizimi doğrulandı. Başlatma hatasında kapatma akışı çalıştı; varsayılan 8765 uygulaması açık kaldı. Kalıcı sunucu veya uptime garantisi yoktur.

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
