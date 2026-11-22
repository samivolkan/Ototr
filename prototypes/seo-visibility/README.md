# OTOTR SEO ve Görünürlük — çalışan prototip

Canlı kokpit kaynak koduna erişilemediği için bağımsız React/Vite uygulamasıdır. Canlı sisteme, Google hesabına veya müşteri verisine bağlanmaz. Bütün metrikler sentetiktir; örnek takvim 20 Kasım 2026 tarihinde sabittir. Görevler, içerikler ve rapor tercihleri yalnız tarayıcıda tutulur.

## Çalışan bölümler

1. Genel bakış: dönem/birim filtresi, karşılaştırma, grafik metriği, ölçüm kontrol listesi.
2. Şubeler: birim karşılaştırması, sorgu ayrıntısı, görev oluşturma.
3. Sorgular ve sayfalar: cihaz, niyet, arama, sıralama, hedef CTR senaryosu, CSV.
4. Analiz stüdyosu: GSC / GA4 / GBP kaynak seçimi, uyumlu boyut ve metrikler, marka filtresi, kayıtlı raporlar, CSV.
5. Yerel SEO: ayrı GBP metrikleri ve şube görevleri; marka sayfalarında açık boş durum.
6. İçerik planı: taslak formu, arama sonucu önizlemesi, durum panosu.
7. Teknik sağlık: hazırlanmış tarama senaryosu, önem filtresi, bulgudan görev.
8. Aksiyonlar: görev oluşturma/düzenleme, sorumlu, tarih, öncelik, durum, arama ve CSV.
9. Veri kaynakları: bağlantı simülasyonu, yenileme geçmişi, eşik ve veri sözlüğü.

Yönetim raporu HTML olarak indirilir; tarayıcıdan PDF yazdırılabilir. CSV dosyaları filtre ve DEMO bilgisi taşır. Sayfa yenileme kayıtları korur; demo sıfırlama başlangıç örneklerine döner.

## Geliştirme

Node.js ve npm ile `npm ci`, `npm run dev -- --host 127.0.0.1 --port 4173`.
Kontroller: `npm test`, `npm run build`, `npm run test:sites`.
Paketlenen web uygulaması `dist/client` altındadır. Yerel sunucuya ihtiyaç duyar; index.html dosyasını doğrudan çift tıklamak desteklenmez.

## Gerçek sisteme entegrasyon sınırı

Bu geliştirme dalı canlı sisteme dağıtım değildir. Canlı kaynak kodu ve veri sözleşmeleri sağlandığında:

- Mevcut oturum ve şube yetkilendirmesi sunucuda uygulanmalı; bu demo yetki sistemi içermez.
- GSC, GA4 ve GBP için ayrı sunucu adaptörleri kurulmalı; erişim anahtarları tarayıcıya konmamalı.
- Kaynak, mülk, tarih, saat dilimi, veri gecikmesi ve eksik veri durumu her yanıtta taşınmalı.
- GSC CTR toplam tıklama / toplam gösterimdir; konum gösterim ağırlıklıdır. GBP görüntülenmeleri GSC gösterimleriyle birleştirilmemeli.
- GA4 anahtar etkinlikleri gerçek randevu veya satış sayılmamalı. Kanal eşleşmesi ayrı doğrulanmalı.
- Görev/içerik/rapor kaydı API'ye taşınmalı; rol, değişiklik geçmişi ve veri saklama kuralları eklenmeli.
- Teknik tarama gerçek bir hizmete bağlanmalı; demo taraması hiçbir URL'yi taramaz.
- Rakip sırası, harita sırası, pazar payı, tahmine dayalı gelir veya başarı skoru bu prototipte üretilmez.

Gerçek Google bağlantıları, canlı SEO doğruluğu, çok kullanıcılı kayıt ve üretim dağıtımı bu teslimin kapsamı dışındadır.

## Alternatif B — Efferd Dashboard 7 esintisi

`http://127.0.0.1:4173/?design=alternative` adresi yeni açık renk görünümü açar. Üstteki Klasik / Alternatif düğmeleri görünümü değiştirir; aktif bölüm, filtreler ve yerel kayıtlar aynı kalır. Alternatifte metrik kartları grafiği değiştirir; niyet dağılımı, son 7 günlük tıklama ve fırsat kartları bulunur. Masaüstünde bölüm seçimi sol menüden, mobilde menü veya üst sekmelerden yapılır.

Referans: https://efferd.com/view/dashboard-7 ve kullanıcının paylaştığı https://x.com/efferdco/status/2123974695674343756. Yalnız halka açık önizleme incelendi; ücretli Efferd kaynak kodu veya registry paketi kullanılmadı. Tasarım özgün React/Recharts uygulamasıdır.
