# OTOTR GM Franchise Yönetim Merkezi

Başvurudan aktif şubeye kadar 14 aşamalı franchise yaşam döngüsünü gösteren güvenli, sentetik veri pilotudur.

- `index.html`: rol/persona, departman kapıları, aday hattı, belge, sözleşme, açılış kurulu, aktif şube, royalty ve audit ekranları.
- `franchise-core.mjs`: tekil franchise dosyası, zorunlu kadro, sertifika/yetki kilidi, atomik aktivasyon ve 30/60/90 iş kuralları.
- `integration-adapters.mjs`: Finans, Hukuk, İK, Academy, Operasyon, Tedarik, BT, Pazarlama, Kalite, İSG, Mimari ve Görev Merkezi olay sözleşmeleri.
- `provider-contracts.mjs`: e-posta, SMS, WhatsApp ve e-imza için amaç/izin/şablon/idempotency sözleşmesi ve log maskeleme kuralları.
- `preproduction-gates.json`: Finans modülündeki yaklaşımla kanıtlı `GO/NO_GO` kapıları.
- `supabase/functions/franchise-outbox-worker`: HTTPS allowlist, idempotency ve retry/dead-letter destekli departman olay worker'ı.
- `supabase/functions/franchise-provider-worker`: e-posta, SMS, WhatsApp ve e-imza kuyruğu için kanal bazlı secret, HTTPS allowlist, lease kurtarma ve dead-letter worker'ı.
- `erp-nav-integration.js`: ERP sol menüsüne bağımsız Franchise Yönetim Merkezi bağlantısı ekler.
- Gerçek T.C. kimlik, banka/finans, sözleşme, çalışan veya müşteri verisi girilmemelidir.
- SMS, WhatsApp, e-imza, ödeme, fatura ve tahakkuk işlemleri simülasyondur.
- Veriler yalnızca tarayıcı `localStorage` alanında şifrelenmeden tutulur; üretim sistemi değildir.

## Üretim sınırı

Supabase Auth/RLS/Storage, hukuk ve KVKK saklama politikaları, gerçek sağlayıcı entegrasyonları, UAT, güvenlik ve geri yükleme kapıları tamamlanmadan üretim kullanımı yasaktır.

Yeni başvuru artık bir `applicationId` ve franchise dosyası üretir. Şube aktivasyonu; 3/3 izin, tam belge seti, %100 tahsilat, 36/36 departman görevi, 10/10 işe alım, özlük/sözleşme ve geçerli rol sertifikaları tamamlanmadan kapalıdır. Başarılı aktivasyon şube kartı, şube kapsamlı kullanıcı kayıtları ve 30/60/90 görevlerini birlikte üretir.

Veritabanı açılış kapısı ayrıca %100 tahsilat, imzalı franchise sözleşmesi, konum/fotoğraf/ölçüm/denetçi onaylı saha ziyareti ve geçerli ruhsat için SHA-256 kanıtı ile bağımsız maker–checker onayı ister. Bu dört kapı istisnayla aşılamaz.

`consent_count` ve `document_count` yalnız özet alanlarıdır. Açılışta son üç izin makbuzu ile şube tipinin zorunlu belge kataloğu gerçek tablolardan yeniden hesaplanır; geri çekilmiş izin, onaysız, eksik veya süresi geçmiş belge kapıyı kapatır.

Veritabanı yaşam döngüsü aşamaları yalnız sırayla ve ilgili aşama sahibi rol tarafından ilerletilir. Yanlış rol, aşama atlama ve fiziksel şube kaydı olmadan `active` durumu reddedilir; her geçiş append-only geçmişe yazılır.

30/60/90 görevleri görev sahibi departman tarafından SHA-256 kanıtı ve tamamlama notuyla kapatılır. Gecikme/due-soon durumu güvenli görünümden hesaplanır; tamamlanan görev yalnız maker–checker yeniden açma kararıyla geri alınabilir.

Aday değerlendirmesi finansal yeterlilik, yönetim deneyimi, marka ve etik uyumu, lokasyon potansiyeli, operasyonel yeterlilik, referans/geçmiş ve büyüme potansiyeli olmak üzere yedi kanıtlı boyuttan oluşur. Ağırlıklı sonuç `80 güçlü / 65 şartlı / 50 yönetici incelemesi / altı uygun değil` önerisi üretir; otomatik nihai karar vermez. Ön onay aşaması, franchise direktörünün hazırladığı olumlu kararın farklı bir GM tarafından onaylanmasına kadar kilitlidir.

Supabase/PostgreSQL ana şeması `supabase/migrations/20261105010000_franchise_end_to_end.sql`, izin/şablon/sağlayıcı yönetişimi ise `supabase/migrations/20261105020000_franchise_provider_governance.sql` dosyasındadır. Migration'lar uzak/üretim veritabanına staging doğrulaması ve kullanıcı kabulü olmadan uygulanmamalıdır.
