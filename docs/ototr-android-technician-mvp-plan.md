# OTOTR Android Usta MVP Planı

Bu fazın kapsamı sekreteryanın iş emri açma ekranı değildir. İş emri bayi portalında açıldıktan sonra Android uygulama ustanın iş emrini sahiplenmesi, araç başlangıç kanıtlarını alması, kendi teknik rapor başlıklarını doldurması ve kanıt fotoğraflarıyla göndermesi için tasarlanır.

## 1. Rol ve Yetki

- Usta sadece kendisine veya rolüne atanmış iş emirlerini görür.
- Kaporta ustası kaporta/boya başlıklarını, mekanik usta motor/mekanik başlıklarını, OBD ustası elektronik/OBD başlıklarını düzenler.
- Finans, tahsilat, indirim, müşteri pazarlık notu ve sekreterya hassas alanları usta ekranında gösterilmez.
- Formen veya müdür rolü sadece izleme, iade, onay ve kalite kontrol yetkisiyle ayrıca açılır.

## 2. Usta İş Emri Sahiplenme

- İş emri usta kuyruğuna düştüğünde durum `Atandı` olur.
- Usta `Sahiplen` dediğinde iş emri `Usta üzerinde` durumuna geçer.
- Audit kaydı: kullanıcı, cihaz, zaman, yaklaşık lokasyon, iş emri id, rol ve uygulama versiyonu.
- Aynı iş emri aynı modül için başka ustada açık ise çakışma uyarısı verilir.

## 3. Başlangıç Kanıtı

Teknik veri giriş modülleri açılmadan önce usta şu kanıtları tamamlar:

- Şasi/VIN doğrulama.
- Şasi etiketi fotoğrafı.
- Plaka fotoğrafı.
- Giriş kilometre değeri.
- Kilometre ekran fotoğrafı.

Bu alanlar sekreterya iş emri açma alanı değildir; araç başında doğru aracın kontrol edildiğini ispatlayan usta başlangıç kapısıdır.

## 4. Teknik Başlık Girişi

- Her rapor başlığı ayrı görev kartıdır.
- Görev kartı içinde checklist alanları, zorunlu alanlar, riskli bulgu alanları ve müşteri dili notu bulunur.
- Usta `Başlığı Gönder` dediğinde ilgili başlık `Tamamlandı`, `Kanıt eksik` veya `Müdür iadesi` durumuna geçer.
- Riskli bulgu varsa fotoğraf veya cihaz çıktısı zorunlu olur.
- Yapılamayan testte neden alanı zorunlu tutulur.

## 5. Kanıt Fotoğrafları

- Kaporta: genel araç fotoğrafları, şasi etiketi, işlemli parça yakın plan, mikron/cihaz ekranı.
- Mekanik: motor üst, alt takım, kaçak noktası, fren/süspansiyon bulgusu.
- OBD: OBD ekranı, Airbag/SRS ekranı, hata kodu ekranı.
- Test: fren/dyno/süspansiyon cihaz çıktısı, yol testi not kanıtı.
- Fotoğraf kalitesi düşükse bulanıklık veya yanlış açı uyarısı sonraki fazda eklenir.

## 6. Dış Sorgular

- Tramer/SBM ve KM sorguları portal entegrasyonundan otomatik gelir.
- Android uygulama usta ekranında sonucu sadece okur; kaynak, saat ve durum görünür.
- Sonuç rapora otomatik işlenir.
- Portal ulaşılamazsa rapor kapısında `Dış sorgu bekliyor` blokajı görünür.

## 7. Rapor Kapısı

Rapor basıma hazır sayılması için:

- Başlangıç kanıtı tamam.
- Tüm usta modülleri tamam.
- Zorunlu kanıt fotoğrafları tamam.
- Sekreterya müşteri/ödeme/KVKK girişleri tamam.
- Tramer ve KM sorgu verileri işlenmiş.
- Müdür onayı verilmiş.

## 8. Offline ve Senkron

- Usta uygulaması bağlantı yokken formu ve fotoğraf metadatasını cihazda saklar.
- Fotoğraflar tekrar bağlantı geldiğinde sırayla yüklenir.
- Aynı görev iki cihazdan düzenlenirse sunucu revizyon farkı üretir; eski kayıt silinmez.
- Başlık gönderimi idempotent olmalıdır; aynı gönderim iki kez rapora yazılmamalıdır.

## 9. İlk MVP Ekranları

- Usta İşleri.
- Usta İşe Başlama.
- Görevlerim.
- Kontrol Formu.
- Kanıt Fotoğrafları.
- Tramer / KM.
- Rapor Kapısı.
- Senkron ve Audit.

## 10. Sonraki Fazlar

- Native Android kamera entegrasyonu.
- Fotoğraf kalite kontrolü.
- Barkod/VIN OCR okuma.
- Cihaz Bluetooth/Wi-Fi veri alma.
- Push notification.
- Müdür iade akışı.
- Usta performans ve Academy yetki kilidi.

## 11. Paket -> Görev -> Usta Matrisi

| Paket | Açılacak teknik görevler | Sorumlu rol | Not |
| --- | --- | --- | --- |
| Mini Ekspertiz | Araç başlangıç kanıtı, motor/mekanik temel, fren/süspansiyon temel | Kaporta Ustası, Mekanik Usta, Test Operatörü | Hızlı kontrol. Kanıt eşiği temel bulgu ve cihaz çıktısıyla sınırlı. |
| Esnaf Ekspertiz | Araç başlangıç kanıtı, kaporta hızlı tarama, motor/mekanik temel, OBD kısa tarama | Kaporta Ustası, Mekanik Usta, OBD Ustası | Galeri/esnaf al-sat hızına uygun. Riskli bulgu varsa fotoğraf zorunlu. |
| Standart Ekspertiz | Kaporta/boya 0-58, motor/mekanik, fren/süspansiyon | Kaporta Ustası, Mekanik Usta, Test Operatörü | Raporun ana teknik omurgası. |
| Full Ekspertiz | Kaporta/boya 0-58, motor/mekanik, OBD/elektronik, fren/dyno/yol testi | Kaporta Ustası, Mekanik Usta, OBD Ustası, Test Operatörü | İlk canlı MVP için ana paket. |
| OTOTR Premium 360 | Full kapsam + kalite ikinci kontrol | İlgili ustalar + Formen | Riskli bulgular formen tarafından ikinci kez kontrol edilir. |

## 12. Rapor Alan Eşleşmesi

| Usta görevi | Rapor hedefi | Veri tipi |
| --- | --- | --- |
| Kaporta / Boya 0-58 | Rapor sayfa 4-6; kaporta harita, parça tablosu, mikron, kod ve fotoğraf no | Parça bazlı yapılandırılmış veri |
| Motor / Mekanik | Rapor sayfa 7; motor, şanzıman, yürüyen, sıvı/kaçak, risk seviyesi ve usta notu | Checklist + müşteri dili |
| OBD / Elektronik | Rapor sayfa 8; modül listesi, aktif/geçmiş hata, Airbag/SRS yöntemi | Cihaz sonucu + hata kodu |
| Fren / Dyno / Yol Testi | Rapor sayfa 9; fren, süspansiyon, dyno, yol testi ölçümleri | Ölçüm değeri + cihaz çıktısı |
| Tramer / KM | Rapor hasar/KM bölümü; kaynak, sorgu zamanı, sonuç ve kapsam uyarısı | Portal entegrasyon verisi |

## 13. Fotoğraf / Kanıt Zorunluluk Matrisi

| Durum | Zorunlu kanıt | Kural |
| --- | --- | --- |
| Her iş emri başlangıcı | Şasi etiketi, plaka fotoğrafı, KM ekranı | Teknik modüller bu kapı tamamlanmadan açılmaz. |
| Kaporta işlemli parça | Parça yakın plan, genel açı, mikron/cihaz ekranı | Boyalı/değişen/işlem şüphesinde fotoğrafsız kapanmaz. |
| Mekanik risk | Bulgu noktası fotoğrafı veya kısa video | Yağ kaçağı, ses, alt takım, servis önerisi varsa zorunlu. |
| OBD hata | OBD ekranı, hata kodu ekranı, Airbag/SRS ekranı | Aktif/geçmiş hata müşteri rapor diline bağlanır. |
| Fren/dyno/süspansiyon | Cihaz çıktısı veya yapılamadı nedeni | Cihaz sonucu yoksa neden ve müdür onayı gerekir. |
| Yapılamayan test | Yapılamadı nedeni, sorumlu onayı | Boş bırakma yok; gerekçe rapor kapsam uyarısına düşer. |

## 14. Canlı Sisteme Bağlanırken Kabul Kriterleri

- Paket seçimi backend'de görev setine dönüşmeli; Android sadece kendisine gelen görevleri göstermeli.
- Her mobil alanın `report_field_key` karşılığı olmalı.
- Her kanıt dosyası `work_order_id`, `task_id`, `field_key`, `evidence_type`, `uploaded_by`, `captured_at` ile saklanmalı.
- Riskli bulgu fotoğrafsız gönderilememeli.
- Müdür iadesinde eski kayıt silinmeden revizyon açılmalı.
- Tramer/KM portal verisi rapora otomatik işlenmeli; ulaşılamazsa rapor kapısı açıkça blokaj üretmeli.
