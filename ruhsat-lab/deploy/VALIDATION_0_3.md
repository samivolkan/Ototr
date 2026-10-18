# Ruhsat OCR 0.3 doğrulama sonuçları

19 Ekim 2026. Windows, mevcut yerel ONNX modelleri, CPU çıkarımı. Sonuçlar geliştirme kabulü içindir; üretim doğruluk sertifikası değildir.

## Otomatik kontroller

- 79 Python testi geçti: alan eşleme, eğik kutular, satıra taşan cins, seri işareti, API yetkisi/boyut/kilit, yeniden okuma, kişisel verinin reddi, eski feedback veritabanı geçişi ve değerlendirme verisi ayrımı.
- 23 JavaScript testi geçti: araç alanı beyaz listesi, geçici sahip verileri, ERP taslağı/kayıt sınırları, ayarlar ve anonim fotoğraf koşulu geri bildirimi.
- Değişen JavaScript dosyalarında sözdizimi kontrolü ve Git whitespace kontrolü geçti.
- Starlette test istemcisi mevcut `httpx` kullanımı için kullanımdan kaldırma uyarısı veriyor. Test başarısızlığı yok; kilitli bağımlılık sürümleri bu teslimde değiştirilmedi.

## Gerçek çıkarımla kurgusal belge senaryoları

| Senaryo | Tam eşleşme | Süre saniye |
|---|---:|---:|
| JPEG kalite 65 | 23/23 | 14.29 |
| 90 derece | 23/23 | 27.65 |
| 180 derece | 23/23 | 20.15 |
| 270 derece | 23/23 | 18.79 |
| Farklı satır içi yerleşim | 7/7 | 6.72 |
| Perspektif düzeltme | 23/23 | 11.01 |
| Boş görüntü | 0 yanlış alan | 4.16 |

Toplam 122 beklenen değer eşleşti. Aynı kurgusal belgenin dönüşümleri bağımsız belge örnekleri sayılmaz. Süreler bu bilgisayarın o andaki yüküne bağlıdır; servis kapasitesi veya SLA ölçümü değildir. Kurgusal sahip alanları bu tabloda test kapsamına dahildir; gerçek belge ölçümü yalnız araç alanlarını kapsar.

## İki gerçek geliştirme belgesi

Her belgede Kokpit profilindeki 17 araç alanı değerlendirildi. Beklenen değerleri yardımcı hazırladı; etiketlerin insan kontrolü henüz tamamlanmadı. Belgeler düzeltme sırasında görüldü; bağımsız test veya eğitim yapılmış model kanıtı değildir. Tam eşleşme Türkçe karakterleri ve eksik kelimeleri de kontrol eder.

| Belge | Önce değer bulunan | Sonra değer bulunan | Önce tam eşleşme | Sonra tam eşleşme |
|---|---:|---:|---:|---:|
| Renault, eğik fotoğraf | 9/17 | 17/17 | 6/17 | 15/17 |
| Chery, kadrajda küçük belge | 13/17 | 15/17 | 11/17 | 12/17 |
| Toplam | 22/34 | 32/34 | 17/34 | 27/34 |

Eski `5dddd7e` ayrıştırıcısı ve yeni ayrıştırıcı aynı OCR kanıtlarıyla karşılaştırıldı; önceki kullanıcı ekranındaki sayıyla birebir aynı çalıştırma değildir. Yeni sürümün son bağımsız tekrarında yine 27/34 tam eşleşme bulundu. Önceden doğru eşleşip sonradan bozulan alan görülmedi. Son tekrar süreleri Renault 25.80 sn, Chery 12.02 sn.

Renault'ta kalan iki fark cins/kullanım metninin Türkçe karakterleridir. Chery'de ticari ad ve yakıt ilk tam okumada boştur; cins/kullanım metni ve seri numarası ayrıca kontrol gerektirir. Seri numarasında basılı No işareti harf sanılabilir; alışılmadık biçim incelemeye gönderilir, otomatik harf silinmez.

İnsan tarafından seçilen Chery alan kırpımlarında yeniden okuma ticari adı 0.80 sn, yakıtı 0.79 sn içinde doğru aday olarak verdi. Her iki aday iki modelin normal ve kontrast okumalarında aynı çıktı. Bu adaylar otomatik uygulanmadı ve ana tabloya başarı olarak eklenmedi. Seri alanını aynı şekilde tekrar okumak hatayı tek başına çözmedi; fotoğrafla kontrol/elle düzeltme gerekir.

## Tarayıcı kabulü

Yerel `127.0.0.1:8769` ekranında kurgusal örnek gerçek OCR ile okundu; 17 seçili araç alanı geldi ve kısa tip alanı RFB doğrulandı. İlk okumadan otomatik bölge, fotoğrafta sürükleyerek elle bölge seçimi ve dört bileşimli yeniden okuma çalıştı. Adayı uygulamak önceki alan onayını kaldırdı. Yeni inceleme/sayfa yenileme belge sonuçlarını temizledi.

0.3.0 / Standart / Net koşuluyla bir kurgusal plaka incelemesi anonim kaydedildi. Önceki 0.2.0 / Kontrast kayıtları korunarak ayrı satırlarda gösterildi; eski koşullar Belirtilmedi oldu. Panel fotoğraf/gerçek değer kaydetmedi. Gerçek belge fotoğrafları, değerleri veya sahip bilgileri teslim paketine/Git'e eklenmedi.

## Teslim sınırı

Model ağırlıkları eğitilmedi. Veri klasöründe iki fotoğraf bulunması ve doğrulanmış etiket dosyasının olmaması, eğitim ve bağımsız genelleme ölçümünün henüz yapılmadığı anlamına gelir. Eğitim/değerlendirme biçimi, insan kontrolü, aynı belgenin bölümler arasında sızmasını engelleyen kontroller ve karşılaştırma aracı hazırdır.

Kalıcı sunucu, Linux container, üretim oto-tr.com entegrasyonu ve bilgisayar kapalıyken erişim bu sürümde kurulmadı/test edilmedi. GitHub Pages main yayını korunmuştur; 0.3 ayrı geliştirme dalı ve teslim ZIP'i üzerinden incelenir. Mevcut ERP aktarımının birim regresyonları geçti; bu turda yeni canlı iş emri oluşturulmadı.


## 0.3.1 — gerçek belge ve yeniden okuma kabulü (19.10.2026)

Renault geliştirme belgesi yeni servisle tekrar okundu: seçili 17 araç alanının 17'si fotoğraftan kontrol edilen değerlerle eşleşti. Bu sonuç, tek geliştirme belgesine aittir; bağımsız test doğruluğu değildir. Tam okuma 34.79 saniye sürdü.

- Cins: iki satır tek tam aday olarak birleştirildi. Dört geçişin üçü aynı doğru adayı destekledi; eksik/bozuk devam satırı ayrı bir değiştirme adayı olmadı.
- Kullanım amacı, tipi ve şasi: dört geçişin tamamı her alan için aynı doğru adayı destekledi.
- Komşu model yılı başlığını içeren elle seçilmiş tipi bölgesinde yalnız hedef değer önerildi; tarih ve komşu başlık önerilmedi.
- Kurgusal referans belgenin 23 beklenen değeri tam eşleşti.
- 93 Python ve 24 Node testi geçti. Yeni testler Türkçe terim sınırlarını, ham metnin korunmasını, çok satırlı/satır içi parçaları, eksik parantezi, komşu tarih ve yıl hücrelerini, anonim geri bildirim sürüm uyumluluğunu kapsar.

Türkçe yazım ve noktalama düzenlemesi yalnız sınırlı ruhsat terimleri sözlüğüne uygulanır. Örneğin açık parantez, ancak gövde kodu ve tam bilinen açıklaması birlikte okunmuşsa tamamlanır. Eksik kelimeler ve bilinmeyen açıklamalar tamamlanmaz. Standartlaştırılan alanlar işaretlenir, ham OCR kanıtı korunur ve kullanıcı onayı gerekir. Kimlikler ve kişi adları bu kurala dahil değildir.

Tarayıcıda alan yeniden okuması için kullanılan hazırlanmış görsel artık kayıpsız PNG'dir. Tam okuma/yeniden okuma fotoğrafları sunucuda saklanmaz. Gerçek belgeler, alan değerleri ve yerel tanılama dosyaları Git/teslim paketine eklenmez. Model ağırlıkları bu sürümde eğitilmedi.
