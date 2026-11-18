# Tek yorum çalışma alanı — 19.11.2026

Yorum Sayfası 2 artık tek yorum ekranıdır. Eski reviewPage ve release adres
parametreleri kaldırılarak index.html#google-reviews adresine normalleştirilir.
Altı ana bölüm: Genel Bakış, Yorumlar, İş Takibi, Performans, Şubeler, Ayarlar.

## Veri kapsamı

- Günlük kapsamda Bursa Nilüfer canlıdır. Gebze/İnegöl kayıtları silinmez;
  günlük seçiciden ve Şubeler listesinden çıkarılır.
- Yeni şube kurulum listesinde başlar. Gerçek Google hesap/konum eşleşmesi
  doğrulanıp sunucuda etkinleştirilince canlı seçiciye katılır.
- Test şubesi ayrı işaretlidir; hiçbir canlı toplam, Google yanıtı veya müşteri
  mesajı akışına giremez. Test kaydı canlıya dönüştürülemez.
- Harita yalnız doğrulanmış sayısal koordinatlardan üretilir. Serbest iframe
  veya URL kaydı kullanılmaz. Örnek konum gerçek işletme olarak gösterilmez.

## Şube kurulumu

Şube ekle: ad, il, bölge, harita, başlangıç hedefi, SLA, kontrol aralığı ve
isteğe bağlı Google kimlikleri. Kayıt mevcut yetkili ERP servisine yapılır.
AI, saklama, SLA eskalasyonu, aylık hedef ve kapalı yorum toplama politikası
şubeye özel oluşturulur. Kimlik/harita güncellemesi sürüm kontrolüyle korunur.
Bağlantı sahibinin Google doğrulaması hem mağaza kodunu hem hesap/konum çiftini
kontrol eder; çalışma ayarını da canlı duruma geçirir. Mevcut sırlar korunur.
Yeni bir zamanlanmış görev veya mesaj gönderimi başlatılmaz.

## Doğrulama

- Geçerli yorum altyapısı, yeni kapsam ve şube akışı testleri çalıştırıldı.
- Eski inline index ekranını arayan google-review-card-layout,
  google-review-links ve google-reviews test dosyaları mevcut kod taşınmasına
  uyarlanmamış. Tam eski test keşfinde bu üç dosya başlangıçta hata verir.
  Bunlar başarı olarak sayılmadı; mevcut çalışma alanı testlerine dahil değil.
- Yayınlanan yanıt kartında yeniden gönderim onayı kaldırıldı; değişiklik için
  önce düzenleme/kaydetme gerekir. Yayın doğrulama testleri korunur.
- Yerel masaüstü ve 390 px ekran: tek canlı kapsam, alt menüler, şube formu,
  harita önizleme, yatay taşma ve tarayıcı hataları kontrol edildi.
- Geçerli yorum paketinde 408 test başarılı (390 yorum testi + 18 köprü testi).
- Canlı G715 ekranında altı menü, tek Nilüfer kapsamı, kanonik adres ve yayın
  göstergesi doğrulandı. Şube müdürü oturumu 403 ile reddedildi; mevcut genel
  merkez hesabıyla yeniden giriş yapılması gerekiyor. Yetki genişletilmedi.
- Yorum istekleri ERP giriş denetiminin kullandığı güncel oturumu öncelikler;
  süresi dolan oturumdan eski bayi hesabına geri düşmez. Hedef okunamadığında
  hedef yokmuş gibi sunulmaz; kurulum kontrol hatası açıkça gösterilir.
- Canlı kabul: Pages sürümünü doğrula, örnek şubeyi arayüzden kaydet, yeniden
  yüklemede kaydı/haritayı kontrol et, ana seçicide yalnız Nilüfer'i doğrula.
  Test sırasında gerçek Google yanıtı veya müşteri mesajı gönderme.

Yayın sayacı/tarihi/saati mevcut Pages workflow tarafından release.json ile
üretilir; sol alttaki ERP yayın göstergesinde gösterilir.
