# Franchise hosted staging doğrulaması — 2026-11-05

Hedef: Supabase `ototr-staging` (`bsjkohwbtrfwrqcyhsfz`), PostgreSQL 17.6.

## Sonuç

- 27 Franchise migration sıralı olarak uygulandı.
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

## Public başvurudan kanonik dosyaya geçiş

- `20261105240000_franchise_public_intake_canonicalization.sql` ile yalnız `ready_for_canonicalization` kayıtlarını işleyen idempotent maker RPC eklendi.
- Doğrudan `franchise_public_intake_bridge UPDATE` yetkisi `authenticated` rolünden kaldırıldı; durum ve kanonik dosya bağı yalnız kontrollü işlemle değişiyor.
- İşlem gerçek aday portal `auth.users` kimliği ister; sistem sahte aday hesabı üretmez. Normalize aday/şirket adı ve belge doğrulama referansları operatör tarafından verilir, ham web payload'ı kanonik profile kopyalanmaz.
- Bridge satırı `FOR UPDATE` ile kilitleniyor; tekrar çağrı aynı `canonical_case_id` değerini döndürüyor. Üç ayrı sunucu bağlı izin kanıtı eksikse işlem reddediliyor.
- Maker kimliği ve zamanı `canonicalized_by` / `canonicalized_at` alanlarında tutuluyor.
- Güvenlik danışmanının `public SECURITY DEFINER` uyarısını kaldırmak için `20261105250000_franchise_public_canonicalization_private.sql` uygulandı: ayrıcalıklı uygulama Data API'ye açık olmayan `app_private` şemasında, public RPC ise `SECURITY INVOKER`.
- Rollback-only staging kabulü kanonik dosya, üç izin makbuzu, maker audit ve idempotent tekrar koşullarını geçti. Sentetik kullanıcı/başvuru/bridge kayıtları rollback sonrası `0`; güvenlik danışmanında yeni fonksiyon bulgusu yok.

## ERP web başvuru kuyruğu

- `20261105260000_franchise_public_intake_queue.sql` staging veritabanına uygulandı.
- GM ve tek aktif Franchise Sorumlusu mevcut ERP Supabase oturumuyla kuyruğu okuyabilir; anonim erişim ve diğer departman rolleri reddedilir. Eski `franchise_director`/`franchise_specialist` kodları yalnız geriye uyumlu teknik yetki adlarıdır; organizasyonda ayrı iki aktif sorumlu oluşturmaz.
- Kuyruk yalnız başvuru referansı, izin durumu, konum, kaynak ve zaman alanlarını döndürür. Ham ad-soyad, telefon, payload, istek metadatası ve belge içeriği RPC sonucuna dahil değildir.
- `processing_consent` eksik kayıtlar `awaiting_processing_consent` durumunda görünür fakat kanonik dosyaya aktarma işlemi kilitlidir.
- Public RPC `SECURITY INVOKER`, ayrıcalıklı uygulama Data API dışındaki `app_private` şemasındadır. Rollback-only kabul testi iki sentetik kayıtla yetkili okuma, eksik izin kilidi ve yetkisiz rol reddini doğruladı; sentetik kullanıcı ve başvuru sayısı rollback sonrasında `0` kaldı.
- Supabase güvenlik danışmanında bu kuyruk fonksiyonuna ait yeni bulgu yoktur. Paylaşılan projedeki Franchise dışı önceki uyarılar bu kapsamda değiştirilmemiştir.

## Public franchise başvuru yüzeyi

- `franchise-basvuru/` altında staging olarak açıkça etiketlenen responsive başvuru ekranı hazırlandı.
- KVKK aydınlatma teyidi, başvuru verilerinin işlenmesi ve isteğe bağlı ticari ileti kararı üç ayrı kutu ve üç ayrı API alanıdır. İlk ikisi başvuru için zorunlu, ticari ileti isteğe bağlıdır.
- Form çift gönderimi kilitler, bot honeypot alanı taşır ve mevcut `public-api/franchise-applications` sözleşmesini kullanır.
- T.C. kimlik numarası, banka bilgisi ve finansal belge açık web formunda toplanmaz. Bunlar ön değerlendirme sonrasında kimliği doğrulanmış özel aday portalı ve özel Storage üzerinden alınacaktır.
- Bu ekranın hazırlanması canlı `ototr.com/franchise` kaynağının değiştirildiğini kanıtlamaz. Üretim alan adı, hukuk metni onayı ve doğrulanmış canlı endpoint kabulü tamamlanana kadar G16/R28 `BLOCKED/EXTERNAL_PENDING` kalır.

## Kimliği doğrulanmış aday portalı ve özel belge alanı

- `20261105270000_franchise_applicant_document_portal.sql` ile aday portalı; `20261105280000`, `20261105290000` ve `20261105300000` ile paylaşılan Storage politika izolasyonu ve belge katalog bütünlüğü staging veritabanına uygulandı.
- Aday portalı mevcut Supabase kullanıcı JWT’siyle çalışır; service-role/secret anahtar tarayıcıya verilmez. Durum, belge talebi, randevu, mesaj, sözleşme, ödeme planı ve eğitim işleri yalnız adayın kendi portal ataması üzerinden okunur.
- Belge yükleme yalnız `franchise-private` bucket’ına, `case/applicant/user/object` kapsamlı rastgele yolla ve `x-upsert=false` ile yapılır. Kayıt RPC’si aday rolünü, dosya sahipliğini, franchise dosyası sahipliğini, zorunlu belge kodu/kategori eşleşmesini, SHA-256 özetini, MIME tipini, 20 MB sınırını ve Storage metadatasını yeniden doğrular.
- Public RPC `SECURITY INVOKER`, ayrıcalıklı uygulama `app_private` şemasındadır; `anon EXECUTE=false`. Supabase güvenlik danışmanı yeni RPC veya Storage politikası bulgusu üretmedi.
- Rollback-only staging kabulünde aday rolü olmayan kullanıcı reddedildi, Storage nesnesi olmadan sahte belge kaydı reddedildi ve sentetik kullanıcı/dosya kayıtları `0` kaldı.
- Geçici `example.invalid` aday Auth hesabıyla gerçek hosted zincir çalıştırıldı: parola oturumu, yalnız kendi franchise dosyasını okuma, private Storage yükleme, belge kayıt RPC’si, portal geri okuma ve güvenli belge referansıyla görev tamamlama birlikte geçti.
- İlk koşular paylaşılan Storage RLS politikalarında iki gerçek entegrasyon kusuru yakaladı: finans politikaları ilgisiz bucket yüklemelerinde yetkisiz tablo/fonksiyon değerlendirmesi yapıyordu; eski aday RPC’si zorunlu `document_code` ve SHA-256 alanlarını yazmıyordu. Bucket-kapsamlı security-definer wrapper’lar ve katalog bütünlüğü migration’ı ile kapatıldı.
- Kabul sonrasında sentetik belge kaydı, Storage nesnesi, portal işi/ataması, franchise dosyası ve iki geçici Auth hesabı silindi. Altı kaynak için kalan kayıt sayısı ayrı ayrı `0` doğrulandı. Makinece okunabilir sonuç `gm-franchise/applicant-portal-hosted-evidence.json` dosyasındadır.

## Hosted atomik şube aktivasyonu

- `20261105360000_franchise_finance_accounting_gate_separation.sql` staging projesine uygulandı. Finans yalnız `Finans`, Muhasebe yalnız `Muhasebe` görevlerini yönetebilir; eski birleşik sahiplik kaldırıldı.
- Aktivasyon kapısı yalnız toplam sayıyı değil 13 farklı departmanın her birinde tam üç görev bulunmasını, ayrıca Finans ve Muhasebe departmanlarının ayrı varlığını doğrular. Eksik veya yapısal olarak yanlış 39 görev seti güvenli biçimde reddedilir.
- `20261105370000_franchise_department_catalog_gate.sql` ile sayım resmi departman kataloğuna bağlandı. 39 tamamlanmış görev ve 13 farklı ad içeren, fakat `Mimari / Proje` yerine sentetik `Sahte Departman` kullanan negatif kabul senaryosu reddedildi; sonuç `PASS`. Resmi katalogla pozitif atomik aktivasyon yeniden `PASS` verdi ve her iki senaryo rollback ile temizlendi.
- Scheduler rollback sırası staging transaction içinde iki kuyruk için denendi: outbox ve provider cron işleri önce kaldırıldı, ardından iki private dispatcher ve iki config tablosu düşürüldü. Transaction rollback sonrasında iki cron ve iki fonksiyonun geri geldiği doğrulandı. Release `rollbackSha256` bağı doğrudan `supabase/ops/franchise-rollback.sql` dosyasını hash’ler.
- `supabase/ops/franchise-activation-acceptance.sql` staging şemasında tek transaction ve zorunlu `ROLLBACK` ile çalıştırıldı; sonuç `PASS` oldu.
- Senaryo 17 onaylı zorunlu belge, üç izin makbuzu, ayrı Finans ve Muhasebe sahipliğiyle 39 tamamlanmış departman görevi, 10 zorunlu kadro, işe alım/sözleşme/Academy sertifikası, Finans tahsilatı, Hukuk-lokasyon kayıtları ve 10 açılış teslimatını aynı dosyada kurdu.
- Aktivasyon tam bir şube, 10 erişim hesabı, bayi JWT şube kapsamı, 30/60/90 takip görevleri ve Finans, Muhasebe, İK, BT, Görev Merkezi için beş entegrasyon outbox olayı üretti; Muhasebe olayı `chart_of_accounts.created` olarak doğrulandı ve ikinci çağrı yeni şube üretmeden idempotent döndü.
- 30 günlük takip görevinin kanıtlı tamamlanması, kendi kendine yeniden açma onayının reddi, bağımsız onayla yeniden açılması ve erişim iptalinde şube kapsamının kaldırılması geçti.
- Hosted SQL bağlayıcısı `SET ROLE supabase_auth_admin/authenticated` işlemine izin vermediği için Auth hook/RLS rol değiştirme bölümü bu transaction testinden ayrıldı. Gerçek authenticated RLS izolasyonu, ayrı aday JWT → private Storage kabulünde kanıtlanmıştır.
- Rollback sonrasında Auth kullanıcısı, franchise dosyası, şube, personel, erişim hesabı, takip görevi ve outbox olayı sayıları ayrı ayrı `0` doğrulandı. Sonuç `gm-franchise/hosted-activation-evidence.json` içindedir.

## Sınır

## Tek ana sorumlu token kapısı — 2026-11-06

- `ototr-staging` migration geçmişinde `franchise_single_department_owners` ve atanmış-kullanıcı indeks migration'ı bulundu; sorumluluk tablosu ile mevcut Auth hook doğrulandı.
- Salt-okunur hosted sorguda sorumluluk kaydı `0`, aktif ana sorumlu `0/13` bulundu. Kişi kimliği veya gerçek ERP kullanıcı UUID'si uydurulmadı.
- Bu durumda yeni token kapısını etkinleştirmek merkez kullanıcılarını kilitleyeceği için migration staging'e uygulanmadı.
- `20261106023000_franchise_primary_owner_token_enforcement.sql`, 13 departmanın her birinde aktif ana sorumlu bulunmadan ilk adımda transaction'ı durduracak şekilde sertleştirildi.
- Hook ve sorumluluk tablosu erişimi Supabase Auth Hook kuralına göre `SECURITY INVOKER`, yalnız `supabase_auth_admin` SELECT/EXECUTE izni ve ayrı RLS politikasıyla tanımlandı; `anon` ve `authenticated` doğrudan çağrı yetkisi almaz.
- Kalan dış bağımlılık: Genel Müdürün gerçek staging kullanıcı UUID'leriyle 13 ana sorumluyu ataması. Bu roster tamamlanmadan token enforcement migration'ı ve kullanıcı oturum yenileme kabulü çalıştırılmayacaktır.

Bu doğrulama staging şema kurulumu ve rollback kabiliyetini kanıtlar. Gerçek ERP/sağlayıcı uçları, departman UAT imzaları, yayın penceresi ve kullanıcı canlı onayı ayrıca gereklidir. Yayın kararı `NO_GO` kalır.
