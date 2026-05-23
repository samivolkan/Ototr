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
