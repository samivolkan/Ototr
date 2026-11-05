# Franchise hosted staging doğrulaması — 2026-11-05

Hedef: Supabase `ototr-staging` (`bsjkohwbtrfwrqcyhsfz`), PostgreSQL 17.6.

## Sonuç

- 23 Franchise migration sıralı olarak uygulandı.
- Şema rollback betiği staging üzerinde tatbik edildi; yeni Franchise şeması kaldırıldı.
- Supabase Storage tablolarından doğrudan silmenin engellendiği görüldü. Rollback betiği, özel bucket'ı koruyacak ve yalnızca açık onayla Storage API üzerinden kaldırılacak şekilde düzeltildi.
- 18 migration yeniden uygulanarak şema geri yüklendi.
- Son kontrol: 38/38 Franchise tablosunda RLS açık, 74 Franchise politikası mevcut.
- Sabit kataloglar: 7 saklama kategorisi, 10 kadro rolü, 17 belge şartı, 7 skor boyutu ve toplam 100 ağırlık, 31 entegrasyon sözleşmesi, 10 açılış teslimi.
- `franchise-private` bucket özel erişimli ve 20 MB sınırında.
- `anon` rolünün `franchise_cases` okuma yetkisi yok.
- Supabase güvenlik danışmanında yeni `public.franchise_*` nesneleri için bulgu kalmadı.
- Yerel otomatik test: 99/99 PASS.

## Halka açık başvuru izin sertleştirmesi

- `20261105230000_franchise_public_consent_hardening.sql` staging veritabanına uygulandı.
- KVKK aydınlatma, veri işleme ve ticari ileti iradeleri ayrı sütunlarda tutuluyor.
- Üç SHA-256 izin kanıtı tarayıcıdan güvenilir veri olarak alınmıyor; PostgreSQL bunları başvuru kimliği, izin amacı, karar, metin sürümü ve sunucu zamanına bağlıyor.
- Eski istemciler için `processing_consent=NULL` geriye dönük onaya çevrilmiyor; kayıt `awaiting_processing_consent` durumunda güvenli biçimde bekliyor.
- Üç izinli sentetik yeni kayıt `ready_for_canonicalization`, eski biçimli sentetik kayıt `awaiting_processing_consent` sonucunu verdi.
- Sentetik doğrulama kayıtları silindi; hem başvuru hem bridge tablolarında kalan test kaydı `0`.
- İki trigger fonksiyonu için `anon` ve `authenticated` doğrudan `EXECUTE` yetkisi yok. İki tabloda da RLS açık; `anon` için `SELECT/INSERT` yok.
- Sağlık danışmanı yeni bulgu üretmedi. Paylaşılan ERP projesinde Franchise dışındaki eski nesnelere ait güvenlik uyarıları ayrıca devam ediyor; bu çalışma kapsamında değiştirilmedi.
- Mevcut `public-api` kaynağı korunarak yalnız Franchise payload eşlemesi geriye uyumlu biçimde genişletildi; staging sürümü `v9`, bundle SHA-256 `5b6affe5f6d4adeecbd5cc0768649f54f1f1b2df667568876d0dada018e78497`.
- Gerçek HTTP endpoint kabul testi iki sentetik POST ile geçti: yeni istemci `processingConsent=true` ile `ready_for_canonicalization`, eski istemci alanı göndermeden `awaiting_processing_consent` üretti. Ticari ileti `false` iken ayrı karar kanıtı kaydedildi ve başvuru reddedilmedi.
- HTTP kabul testinin iki sentetik başvurusu ve bridge satırı temizlendi; kalan kayıt `0`.

## Sınır

Bu doğrulama staging şema kurulumu ve rollback kabiliyetini kanıtlar. Gerçek ERP/sağlayıcı uçları, departman UAT imzaları, yayın penceresi ve kullanıcı canlı onayı ayrıca gereklidir. Yayın kararı `NO_GO` kalır.
