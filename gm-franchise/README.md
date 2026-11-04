# OTOTR GM Franchise Yönetim Merkezi

Başvurudan aktif şubeye kadar 14 aşamalı franchise yaşam döngüsünü gösteren güvenli, sentetik veri pilotudur.

- `index.html`: rol/persona, departman kapıları, aday hattı, belge, sözleşme, açılış kurulu, aktif şube, royalty ve audit ekranları.
- `franchise-core.mjs`: tekil franchise dosyası, zorunlu kadro, sertifika/yetki kilidi, atomik aktivasyon ve 30/60/90 iş kuralları.
- `erp-nav-integration.js`: ERP sol menüsüne bağımsız Franchise Yönetim Merkezi bağlantısı ekler.
- Gerçek T.C. kimlik, banka/finans, sözleşme, çalışan veya müşteri verisi girilmemelidir.
- SMS, WhatsApp, e-imza, ödeme, fatura ve tahakkuk işlemleri simülasyondur.
- Veriler yalnızca tarayıcı `localStorage` alanında şifrelenmeden tutulur; üretim sistemi değildir.

## Üretim sınırı

Supabase Auth/RLS/Storage, hukuk ve KVKK saklama politikaları, gerçek sağlayıcı entegrasyonları, UAT, güvenlik ve geri yükleme kapıları tamamlanmadan üretim kullanımı yasaktır.

Yeni başvuru artık bir `applicationId` ve franchise dosyası üretir. Şube aktivasyonu; 3/3 izin, tam belge seti, %100 tahsilat, 36/36 departman görevi, 10/10 işe alım, özlük/sözleşme ve geçerli rol sertifikaları tamamlanmadan kapalıdır. Başarılı aktivasyon şube kartı, şube kapsamlı kullanıcı kayıtları ve 30/60/90 görevlerini birlikte üretir.

Supabase/PostgreSQL şeması ve RLS politikaları `supabase/migrations/20261105010000_franchise_end_to_end.sql` dosyasındadır. Migration uzak/üretim veritabanına staging doğrulaması ve kullanıcı kabulü olmadan uygulanmamalıdır.
