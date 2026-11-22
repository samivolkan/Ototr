# Claude ve DeepSeek inceleme kararları

22 Kasım 2026. Kullanıcının talebiyle prototipin ilk sürümündeki data.js, ui.jsx ve App.jsx kaynakları iki servise gönderildi. Yalnız demo kaynak kodu paylaşıldı; gerçek müşteri verileri, anahtarlar ve oturum bilgileri paylaşılmadı. Son eklenen analiz stüdyosu ve yerel SEO bölümleri ayrıca yerel testten geçirildi; iki servisin son sürümü onayladığı iddia edilmez.

## Uygulanan öneriler

- Ortak fırsat formülü, seçilen CTR hedefi ve gösterim eşiğine bağlı filtre; ilk 20 konum koşulu.
- Gruplamada birden çok sayfa/birim bilgisinin açık gösterimi; karışık birimde görev için birim seçimi.
- Boş metriklerde null ve ekranda çizgi; eksik grafik noktasını sıfır sanmama.
- CTR değişimi yüzde puan, konum değişimi sıra; sıfır başlangıçta güvenli karşılaştırma.
- CSV formül enjeksiyonu koruması, sayısal negatifleri koruma, kapsam/filtre metadata sütunları.
- Yerel kayıt şeması doğrulama, UUID alternatifi, hata sınırı.
- Sekmelerde klavye dolaşımı, adlandırılmış dialog, kaydırıcı değer etiketi, mobil menü odağı.
- Tamamlanan görevden sonra yeni takip görevi açabilme; son tarih artan sıralama.
- GSC marka/marka dışı segmenti, uyumlu kaynak/boyut/metrik seçimi, kayıtlı analiz görünümü.
- Google İşletme Profili metriklerini organik web metriklerinden ayrı inceleme.

## Ertelenen veya alınmayan öneriler

- Anomali modeli, konuma göre öğrenilmiş CTR eğrisi ve gerçek rakip görünürlüğü: doğrulanmış tarihsel veri ve sağlayıcı olmadan gösterilmedi.
- GSC–GA4 farkından tek bir güven puanı veya otomatik dönüşüm hunisi: farklı metrikler eşit olmadığı için uygulanmadı.
- 90 günlük karşılaştırmanın 180 günlük demo kaydını aşacağı iddiası: başlangıç/bitiş tarihleri ve 90+90 gün testle doğrulandı; geçerli hata değil.
- Gerçek sunucu RBAC/OAuth: canlı kaynak mevcut olmadığı için entegrasyon gereksinimi olarak belgelendi.

## İnceleme oturumları

- Claude: https://claude.ai/chat/e90a172a-c01f-4fb4-b862-a23aac0f9ab7
- DeepSeek: https://chat.deepseek.com/a/chat/s/cce351ec-5e1a-487b-837b-bbe1f5de85ef

Oturumlar ilgili hesap erişimi gerektirir. Öneriler bağımsız doğrulama yerine kullanılmadı.
