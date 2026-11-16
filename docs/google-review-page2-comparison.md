# Yorum Sayfası 2 — karşılaştırma ve uygulama

Referans: kullanıcının sağladığı `ototr-google-yorum-duzeltilmis.html`.

## Alınan parçalar

| Referanstaki yapı | ERP'deki uygulama |
| --- | --- |
| İki satırlı koyu üst menü | Ayrı tasarım seçimi ve mevcut 13 operasyon menüsü |
| Küçük trendli KPI kartları | Seçili şubenin seçili dönemdeki kayıtlarından altı gösterge |
| Halka yıldız grafiği | Kayıtlardaki gerçek yıldız dağılımı |
| Dönem seçimi | Bu ay, son 3 ay, yıl başından bugüne, son 12 ay |
| Hedef ve yorum grafiği | Yorum hacmi + hesaplanan eğilim + yalnız kayıtlı canlı hedef ayları |
| Performans ekranı | Şube hedefi, açık Kaydet düğmesi, aylık gerçekleşme ve ilerleme |

Kaynakta örnek değerlerle çalışan A/B başarı puanları, rastgele performans oranları ve geçmiş hedef serileri canlı veri olarak taşınmadı. A/B karşılaştırmasını operasyonel kullanıma açmak için varyasyon kimliği, yayın, onay ve sonuç ölçümleri gerekir. Mevcut ERP'nin onay, yetki, denetim ve yanıt düzenleme akışı ortak kullanılmaktadır.

## Sınırlar

- Sayfa 1: `index.html#google-reviews`.
- Sayfa 2: `index.html?reviewPage=2#google-reviews`.
- İki sayfa aynı oturum, Google/OpenAI bağlantısı ve ERP servislerini kullanır. İkinci yayın motoru veya zamanlayıcı yoktur.
- Alternatif kapsamı yalnız Bursa Nilüfer canlı, Kocaeli Gebze demo, Bursa İnegöl demo şubeleridir.
- Demo kayıtları canlı grafiklere dahil edilmez. Demo hedefleri ayrı tarayıcı anahtarında tutulur; canlı hedefler mevcut ERP API'sine sürüm kontrolüyle kaydedilir.
- Bilinmeyen tarih/yanıt süresi sıfır veya başarı olarak gösterilmez. Canlı geçmiş hedef bulunmayan aylar boş bırakılır.
- Bu alternatifin ana grafik, yorum listesi ve performans özeti dönem seçimini kullanır. Aktif onay, hukuk ve şikâyet iş kuyrukları mevcut operasyon kurallarını korur; açık işler tarih filtresi nedeniyle kaybolmaz.
- Yeni şube açılışı ve mevcut sistem ayarları ortak altyapıda kalır. Bu alternatifin üç şubelik seçicisi yeni şubeleri kendiliğinden canlıya almaz.

## Doğrulama

- 72 hedefli otomatik test geçti: canlı/demo ayrımı, ay sınırları, hedef serisi, Türkçe senkronizasyon tarihi, API ve yanıt iş akışı kontrolleri.
- JavaScript sözdizimi ve `git diff --check` geçti.
- Chrome masaüstü ve 390 × 844 mobil görünüm kontrol edildi.
- Demo şube/dönem değişimi, hedef kaydetme ve yeniden yükleme sonrası kalıcılığı, yorum detayı ve alternatif taslak denemesi kontrol edildi.
- Gerçek Google yanıtı yayımlama ve canlı hedefi değiştirme kabul testi yapılmadı; mevcut yayın/onay servisleri değiştirilmedi.
- Görsel kanıtlar yerel çalışma alanında tutulur; müşteri kayıtları ve oturum bilgileri bu depoya eklenmez.

Yayın sürümü GitHub Pages iş akışından üretilen `release.json` ile sol altta tarih, saat ve güncelleme sayacı olarak gösterilir.
