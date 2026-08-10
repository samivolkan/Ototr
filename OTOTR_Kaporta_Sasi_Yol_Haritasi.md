# OTOTR Kaporta ve Şasi Yol Haritası

## Mevcut Durum

| Alan | Hazır olan | Kalan ana risk |
|---|---|---|
| Kaporta MASTER | 20 kontrol, 44 aktif poligon, 48 korunmuş kaynak tanımı, rapor, JSON, yerleşim master'ı | Gerçek backend ve ortak ERP sözleşmesi |
| Şasi | 22 nokta, kanıt kuralları, modal akış, rapor, görünüm master'ı, ERP adapter | Üretim kanıt depolaması ve kalıcı senkron kuyruğu |
| Veri bütünlüğü | İki modülde completion kapısı ve demo fallback | Sunucu tarafı doğrulama, revision ve audit trail |

## P0 - ERP Pilotundan Önce

1. Ortak inspection zarfı tanımlanmalı: `inspectionId`, `workOrderId`, `vehicleId`, `module`, `schemaVersion`, `revision`, `updatedAt`, `updatedBy`.
2. Kaporta ve şasi adapter'ları aynı hata, retry ve kimlik doğrulama kurallarını kullanmalı; mevcut ekran fonksiyonları geriye uyumlu facade olarak kalmalı.
3. Sunucu completion endpoint'i eksik zorunlu alan, not, mikron veya kanıt varsa işlemi reddetmeli. UI kontrolü tek güvenlik katmanı olmamalı.
4. Kanıt fotoğrafları data URL olarak API gövdesinde taşınmamalı; imzalı yükleme veya multipart ile nesne depolamaya gönderilmeli ve kayıtta yalnızca güvenli URL/kimlik tutulmalı.
5. `workOrderId` ve `vehicleId` üretimde URL sorgu dizisine yazılmamalı; yetkili host context ve auth header üzerinden alınmalı.

Kabul ölçütü: Backend kapalıyken demo akışı bozulmaz; backend açıkken iki modül aynı inspection kimliği altında yüklenir, kaydedilir ve eksik veriyle tamamlanamaz.

## P1 - Kontrollü Pilot

1. Her nokta/parça kaydına idempotency key, revision veya ETag eklenmeli; eşzamanlı değişiklikler `409 Conflict` ile güvenli biçimde ele alınmalı.
2. Şasi sync kuyruğu bellekten IndexedDB tabanlı kalıcı offline kuyruğa taşınmalı; yeniden bağlanınca sıralı retry yapılmalı.
3. Her değişiklik için kullanıcı, zaman, önceki değer, yeni değer ve cihaz bilgisi içeren audit log tutulmalı.
4. Kaporta ve şasi bulgularını tek müşteri raporunda birleştiren sürümlü PDF servisi hazırlanmalı.
5. Adapter contract testleri, poligon kaynak eşitliği, 22 nokta kapsamı, completion ve responsive smoke testleri CI'a alınmalı.
6. Mevcut büyük HTML dosyaları veri, stil, UI ve adapter modüllerine ayrılmalı; yayınlanan tek dosya için build çıktısı üretilebilir.

Kabul ölçütü: Bağlantı kesintisi ve iki kullanıcı çakışması veri kaybı üretmez; bütün değişiklikler denetlenebilir; aynı kayıt yeniden gönderildiğinde çift kayıt oluşmaz.

## P2 - Üretim Olgunluğu

1. Rol bazlı yetki ve onay akışı eklenmeli: usta girişi, kontrolör onayı, müşteri raporu yayını.
2. Klavye, focus trap, ARIA live mesajları, ekran okuyucu ve kontrast için WCAG 2.2 AA denetimi tamamlanmalı.
3. Hata oranı, senkron gecikmesi, eksik kanıt, completion süresi ve adapter performansı için merkezi gözlemlenebilirlik kurulmalı.
4. Poligon ve şasi yerleşim master'ları sürümlenmeli; yayınla, geri al ve araç modeline göre varyant yönetimi eklenmeli.
5. JSON şema migration'ları geriye uyumlu tutulmalı ve gerçek anonimleştirilmiş saha kayıtlarıyla regresyon paketi oluşturulmalı.

Kabul ölçütü: Yetkisiz rapor yayımlanamaz, master değişiklikleri geri alınabilir, saha hataları izlenebilir ve yeni şema eski kayıtları kayıpsız açar.

## Önerilen Uygulama Sırası

1. Ortak ERP sözleşmesi ve sunucu doğrulama.
2. Güvenli fotoğraf yükleme ve audit log.
3. Revision/idempotency ve kalıcı offline kuyruk.
4. Birleşik müşteri raporu ve CI regresyon paketi.
5. Yetki, erişilebilirlik, gözlemlenebilirlik ve master sürüm yönetimi.
