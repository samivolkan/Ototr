# GM Koordinatör — doğrulama raporu

Tarih: 26 Kasım 2026. Kapsam: sentetik demo ve mevcut Ajan Ofisiyle regresyon uyumu.

## Otomatik testler

Komut:

```text
node --test ajan-ofisi/gm-koordinator/*.test.mjs tests/management-office.test.mjs tests/agent-office-nav.test.mjs tests/work-source-binding.test.mjs tests/operations-control.test.mjs tests/routing-readiness.test.mjs tests/decision-desk-client.test.mjs
```

Sonuç: **78 geçti, 0 başarısız, 0 atlanan**.

- 35 demo kabul senaryosu: sahiplik, tekrar olay/komut, çakışma, eski sürüm, rol ayrımı, onay, red, veri güncelliği, bağımlılık, kesinti, mutabakat, tekrar limiti, durdurma, bağlantı, kapasite, bütçe, etki, SLA ve tam akış.
- 11 modül entegrasyon/güvenlik testi: mevcut 7 ekip/18 uzman, bağlantılar, yayın kontrolü, harici yazma istemcisi bulunmaması, döngüsel bağımlılık, onay içeriği, yanlış teslim, geçersiz kaynak, demo izolasyonu, haftalık bütçe, eksik bağımlılık.
- 32 mevcut ofis/operasyon regresyon testi.

## Tarayıcı doğrulaması

Yerel HTTP önizlemesi, Codex uygulama içi tarayıcısında kontrol edildi:

| Akış | Gözlenen sonuç |
|---|---|
| Demo yükleme | 10 iş, 3 karar, 3 veri/bağımlılık engeli |
| İlk çalışma turu | 4 iç iş bağımsız kontrol kuyruğunda |
| Boş gerekçeyle onay | Reddedildi; açıklama detay penceresinde gösterildi |
| Blog kararı | Sami demo rolünde onay, koordinatör turunda teslim, BEK-01 kontrolünde kapanış |
| Finans ve yorum kararları | İki karar ayrı gerekçelerle verildi; gerçek dış işlem yapılmadı |
| Eski veri ve benchmark | Demo kanıt yenilemesi sonrası yeni sürümle ilerledi |
| Tüm departmanlar | 10/10 iş arayüz üzerinden bağımsız kontrolle doğrulandı |
| Franchise bağımlılığı | Eğitim ve finans doğrulanınca sonraki turda açıldı |
| Etki ölçümü | +7 gün sonrasında şikâyet KPI değeri 23 girildi; 1 ölçüm / 1 hedef karşılandı |
| Kapasite hesabı | 32 talep, 4 teknisyen, kişi başı 7 kapasite → 4 randevuluk aşım |
| Arama | “blog” sorgusu tek ilgili işi gösterdi |
| Yeniden yükleme | Yerel geçmiş ve tamamlanan iş korundu |
| Laboratuvar | Tarayıcı içinde 35/35 kabul testi geçti |
| Mobil görünüm | Dar ekran kontrolünde belge genişliği ve içerik genişliği eşit; sayfa düzeyinde yatay taşma yok |
| Konsol | İncelenen son hata günlüğünde uygulama hatası yok |

Mobil kontrol bir tarayıcı viewport testidir; fiziksel telefon testi değildir. Ekran okuyucu ve tüm tarayıcı kombinasyonları için kapsamlı erişilebilirlik sertifikasyonu yapılmamıştır.

## Bulunan ve giderilen sorunlar

1. Tekrar sınırına gelen işin sonraki turda yeniden hazır duruma geçebilmesi: sınır kaynak/yönlendirme kontrolüne de eklendi; altı turda üç deneme testi geçti.
2. Modal açıkken hata bildiriminin arka katmanda kalması: detay içine erişilebilir hata alanı eklendi; boş onay gerekçesi tarayıcıda tekrar sınandı.
3. Onayın yalnız sürüm numarasına bağlanması: incelenebilir dosyanın tam içerik snapshot'ı onaya ve teslim kanıtına bağlandı; içerik değişikliği testi geçti.
4. Kaynak adı kontrolünün nesne kalıtım alanlarını kabul edebilmesi: yalnız bilinen departman listesi kabul edilir; `__proto__` testi geçti.
5. Demo dosyalarının referans paylaşımı riski: her yeni işe bağımsız kopya verilir; iki ayrı demo durumunun izolasyon testi geçti.
6. Döngüsel bağımlılıkların sessiz beklemesi: yeni olay sırasında döngü kontrolü eklendi; işlem atomik reddedilir.

## Doğrulamanın sınırları

Bu rapor gerçek finans hareketi, müşteri mesajı, blog yayını, personel kararı, sürekli çalışan model ajanı veya üretim servisinin test edildiği anlamına gelmez. Demo dış ağ istemcisi içermez. Yerel kayıt gerçek sunucu yetkilendirmesi, kalıcı iş kuyruğu veya değiştirilemez audit değildir. Bunların iş paketleri `PROJECT.md` içinde açıkça ayrılmıştır.

GitHub Actions sonucu ve yayımlama durumu commit sonrasında ayrıca kontrol edilir; yerel test sonucu tek başına deployment kanıtı değildir.
