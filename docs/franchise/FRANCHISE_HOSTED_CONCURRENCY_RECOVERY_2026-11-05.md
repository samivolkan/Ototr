# Franchise hosted concurrency, recovery ve dead-letter tatbikatı — 2026-11-05

Hedef: Supabase `ototr-staging` (`bsjkohwbtrfwrqcyhsfz`), PostgreSQL 17.6.

## Uygulanan sertleştirme

- Outbox kayıtlarına `processing_started_at` ve tek kullanımlık `lease_token` eklendi.
- 15 dakikayı aşan `processing` kayıtları atomik claim sırasında geri kazanılıyor.
- Onuncu denemeye ulaşan kayıt yeniden gönderilmiyor ve `dead_letter` oluyor.
- Sonuç yazma işlemi olay kimliği ile birlikte güncel lease token'ını doğruluyor.
- Eski worker'ın yeni worker sonucunu ezmesi veritabanı seviyesinde engelleniyor.

## Hosted sentetik tatbikat sonucu

- 22 sentetik olay oluşturuldu.
- İki worker eşzamanlı olarak 11 ve 10 olay claim etti.
- Claim edilen 21 olayın tamamı tekildi; çift claim oluşmadı.
- Süresi dolan lease üçüncü denemede geri kazanıldı.
- On denemelik süresi dolmuş olay `dead_letter` durumuna geçti ve yeniden claim edilmedi.
- Yanlış/eski lease token'ıyla finish çağrısı beklendiği gibi reddedildi.
- Doğru lease token'ıyla finish çağrısı başarıyla `processed` oldu.
- Son durum: 20 `processing`, 1 `processed`, 1 `dead_letter`; 22/22 benzersiz olay.
- Lease bütünlük kontrolü geçti.
- Tatbikat sonrasında sentetik vaka ve olay sayısı: 0.
- Supabase Security Advisor: yeni `public.franchise_*` nesneleri için 0 bulgu.
- Supabase Health Advisor: yeni `public.franchise_*` nesneleri için 0 bulgu.

## Sınır

Bu kanıt hosted kuyruk eşzamanlılığı, stale recovery, dead-letter ve fencing davranışını doğrular. Gerçek ERP/iletişim sağlayıcıları ve departman UAT imzaları ayrıca gereklidir; yayın kararı `NO_GO` kalır.
