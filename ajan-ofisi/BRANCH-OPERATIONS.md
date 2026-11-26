# Şube Operasyon Ajanı — uygulama özeti

## Kaynak incelemesi
- `ajan-ofisi/operations-center.html`: mevcut kaynak/karar kontrol ekranı korundu, görsel operasyon bağlantısı eklendi.
- `assets/app-core.js:7171`: mevcut realtime değişiklikleri bayi senkronunu tetikler.
- `assets/app-core.js:7348`: mevcut iş emri eşlemesi; kaynak açılış zamanı, paket kodu ve mevcut sorumlu kimliklerinin düşmemesi sağlandı.
- `assets/app-core.js:7473`: yetkili mevcut bayi API okuyucusu; yeni rol/anahtar/RLS veya yazma API'si eklenmedi.
- `assets/app-core.js:7915`: mevcut `dealerCompletion` toplam rapor hesabı.
- `assets/app-core.js:7950`: mevcut baskı kapısı değişmedi.
- `assets/app-core.js:8448`: seçilen paketin rapor kontrol maddeleri.
- `assets/app-core.js:8501`: eski genel görev durumundan türetilen yüzdeler yeni istasyon çubuklarında kullanılmaz.

## Kullanım
Ofis → Şube Operasyon Ajanı → üstteki ajan düğmesi → plaka → baş üstü görev etiketi.
Örnek senaryo varsayılan olarak açık ve açıkça etiketlidir. İlayda'nın kabul ve sunum görevleri aynı örnek personel kimliğine bağlı ayrı kayıtlardır. Örnek güncelleme düğmesi sadece bellekteki örnek veriyi değiştirir.

Gerçek veri için `ERP kaynağını bağla`: aynı origin'deki mevcut bayi portalı kaynak sekmesini açar. Kullanıcının kendi ERP oturumu gerekir. Kaynak sekmesi açık tutulur. Görünür takip sayfası 10 saniyede bir veri okur; mevcut realtime akışı korunur, bayi verisi için 30 saniyelik yenileme yedeği vardır. Kaynak sekmesi kapanır, okuma başarısız olur veya veri 90 saniyeyi aşarsa eski detaylar kaldırılır. Bu, bağımsız arka plan ajanı değildir.

PostMessage yalnız aynı origin, beklenen kaynak pencere ve beklenen istek kimliğiyle kabul edilir. Anahtar, müşteri adı, telefon, VIN, cevap metni veya kanıt URL'si takip ekranına aktarılmaz. Ekran yeni kalıcı kişisel veri kaydı oluşturmaz.

## Hesaplama
Görev yüzdesi = tamamlanan uygulanabilir zorunlu madde / uygulanabilir zorunlu madde × 100. Paket dışı veya şeması doğrulanamayan bölüm sıfır tamamlanmış gibi gösterilmez. Teknik kontrol cevapları mevcut API'den taze okunur; eski yerel cevap birleşimi kullanılmaz, böylece silinen/sıfırlanan cevap eski tamamlanmayı taşımaz.
Tüm Rapor = mevcut ERP `dealerCompletion` sonucu. Mevcut ERP hesabı görev/iş emri alanı mantığını korur; teknik madde çubuklarıyla aynı ölçü değildir. Bu değer bulunmazsa rapora dahil tüm zorunlu kalemlerin oranı kullanılır. Örnek: 17 + 11 + 3 tamamlanmış / 124 toplam = %25. Dört kartın basit ortalaması kullanılmaz.
Sunumda ölçülebilir ara madde yok: Başlamadı / Sunumda / Tamamlandı; rastgele ara yüzde yok.
İşlem ve kuyruk süreleri ayrı olay kanıtıyla hesaplanır. Atama zamanı başlangıç yerine kullanılmaz.

## Doğrulanmış / eksik
- Yerel masaüstü ve mobil akış testi geçti; panel ve görsel genişliği sabit; etiketler taşmıyor; gerçek backend yazma isteği yok.
- Mevcut okuyucu bağlantısı sentetik ERP kaynak sayfasıyla test edildi: sahip ve tamamlanan madde değişimi, bağlantı hatası, eski verinin temizlenmesi.
- Gerçek kullanıcı oturumuyla canlı kaynak kabul testi yapılmadı.
- Mevcut bayi okuyucusu çalışan görünen adını, sekreterya sorumlusunu, görev süre olaylarını ve ayrı sunum olayını sağlamıyor. Bu alanlarda doğrulanmadı / kayıt yok gösterilir. İlayda, Vedat ve Gürkan canlı kayıtlara atanmaz.
- Baskı, sunum, teslim, rapor bulgusu/puanı/hasar kaydı ve müşteri gönderim kuralları değiştirilmedi.

## Testler
`node --test tests/branch-operations.test.mjs` (hesaplar, aynı personelin bağımsız görevleri, sunum kapısı, veri alanı azaltma).
Mevcut inspection-demo, operations-api/control, inspection-health, management-office ve agent-office-nav kontrolleri de geçti.
Playwright: masaüstü 1672×1000, mobil 390×844; görsel karşılaştırma 1672×941. Ayrı test tarayıcısı kullanıldı.

## 42 inç müşteri TV görünümü — 2026-11-26
`customer-tv.html` ayrı, demo veri kullanan yatay 16:9 müşteri ekranıdır. Yönetici sayfasına müşteri görünümü bağlantısı eklendi. 1920×1080 tasarım 4K ve 1366×768 ekrana oranı korunarak sığdırılır; güvenli dış boşluk 42–48 px. Fiziksel 42 inç cihazda kontrol yapılmadı, bu çözünürlüklerde tarayıcı ölçümü yapıldı.
Üst ortada büyük plaka, sağda müşteri dilinde aşama, rapor ilerlemesi ve geçen süre; altta dört aşama ve üç örnek plaka bulunur. Çalışan adı, iç bekleme nedeni, bulgu, telefon ve müşteri adı müşteri projeksiyonuna alınmaz. Tahmini teslim saati üretilmez.
Araçlar 12 saniyede bir değişir. Sol/sağ ok: araç seçimi; boşluk: duraklat/devam; F veya Tam ekran: tarayıcı tam ekran isteği. Sekme görünmezken dönüş durur. Ses üretimi ve anons bağlantısı yoktur.
“Sunuma hazır”: yalnız açık hazır teyidi, aynı rapor sürümüne ait baskı ve sunuma uygunluk teyidi ve %100 rapor ilerlemesi birlikte varsa görünür. %100 tek başına çağrı oluşturmaz. Örnek üçüncü araçta bu teyitler sentetik olarak vardır. Gerçek ERP yayını bu TV sayfasına henüz bağlanmadı.
Test: dört model testi; 1080p/4K/768 ölçülerinde taşma, plaka seçimi, durum/renk değişimi, duraklatma, müşteri alanı ayrımı ve JavaScript hata kontrolü geçti. Tasarım ekran görüntüleri outputs/website-review/customer-tv-*.png dosyalarında tutulur.
