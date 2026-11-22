# Tasarım ve ölçüm araştırması — Studio

22 Kasım 2026. Kullanıcının referansı: [OTOTR Google Reviews](https://samivolkan.github.io/Ototr/index.html#google-reviews). Açık sayfa görsel olarak incelendi: koyu yatay üst menü, ince sekme satırı, açık çalışma alanı, altı KPI, geniş zaman serisi ve sağ özet kartları. Bu anatomiyi SEO'ya uyarladık. Gerçek işletme metrikleri, kullanıcı oturumu ve kaynak ekran görüntüsü yayın paketine eklenmedi.

## Kaynaklardan çıkan uygulama kararları

1. GSC CTR toplam tıklama / toplam gösterim; konum gösterim ağırlıklı hesaplanır. Organik tıklama, Ads tıklaması ve GBP etkileşimleri ayrı tutulur. [Google Search Console ölçümleri](https://support.google.com/webmasters/answer/7042828?hl=en), [Performans raporu](https://support.google.com/webmasters/answer/7576553?hl=en).
2. Marka ve marka dışı sorgular farklı sorulara cevap verir; ayrı pay gösterimi ve niyet filtresi eklendi. Bu demoda sınıflandırma sentetik etiketlere dayanır. [Google performans analizi görevleri](https://support.google.com/webmasters/answer/17010961?hl=en).
3. Mülk ve sayfa bazında toplulaştırmalar aynı sonuçları vermeyebilir. CSV hazırlığında farklı kırılımların üst üste eklenmemesi açıklanır; gerçek adaptör bunun veri sözleşmesini korumalıdır. [Google toplulaştırma açıklaması](https://support.google.com/webmasters/answer/17011364?hl=en-GW).
4. Ortalama CPC harcama / tıklamadır. Form başı maliyet, seçili form dönüşümleri üzerinden hesaplanır; doğrulanmış gelir yokken ROAS üretilmez. [Google Ads CPC](https://support.google.com/google-ads/answer/14074?hl=en), [Dönüşüm değeri](https://support.google.com/google-ads/answer/9451527?hl=en-GB).
5. İlişkilendirme modeli ve sayım tanımı karşılaştırma sonucunu etkiler. Kaynak hazırlığı listesi bu bilgileri ister. Form gönderimi satış olarak sunulmaz. [Google Ads ilişkilendirme](https://support.google.com/google-ads/answer/6259715?hl=en).
6. GA4 oturum dönüşüm oranında pay, önemli etkinlik gerçekleşen oturum sayısıdır; ham etkinlik sayısı değildir. Mevcut GA4 veri modeli ve yeni şablon bu ayrımı korur. [GA4 oturum ölçümleri](https://support.google.com/analytics/answer/12923437).
7. Grafikler tek başına bilgi taşımaz: metin özeti, seri etiketleri, tablo açılımı ve satır üzerinden ayrıntı yolu bulunur. [W3C karmaşık görseller](https://www.w3.org/WAI/tutorials/images/complex/). Bu bir tam WCAG sertifikasyonu değildir.
8. 90 günlük grafik için aralık seçimi ve üç boyutlu sorgu balon gösterimi kullanıldı. [Recharts Brush](https://recharts.github.io/en-US/api/Brush/), [ScatterChart](https://recharts.github.io/en-US/api/ScatterChart/).

## Tasarım yorumu

Aşağıdaki kararlar kaynakların zorunlu kuralı değil, bu prototipe ait tasarım tercihleridir: %5 CTR fırsat senaryosu, önceki döneme göre %20 başlangıç hedefi, 7 günlük hız uzantısı, gösterim büyüklüğünde balonlar, mor/turkuaz palet. Gelecek uzantısı bir tahmin modeli veya güven aralığı olarak sunulmaz. Konum dağılımı sorguların dönem ortalaması üzerinden gruplanır; gerçek zamanlı SERP sırası değildir.

Karmaşık görsellikten önce karar yolu korunur: genel görünüm → sorgu veya kampanya ayrıntısı → yerel görev. Üç görünüm aynı sentetik kaynağı kullanır. CSV dosyası kontrolü raporları gerçek veriyle değiştirmez.
