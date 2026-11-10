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

## On kanallı başvuru staging kabulü — 2026-11-10

- `franchise_expanded_intake_channels` migration'ı `ototr-staging` geçmişine `20261110082445` sürümüyle uygulandı; yerel migration dosyası aynı sürümle eşleştirildi.
- Kanal kataloğunda 10 aktif kanal ve üçüncü faz otomasyonuna aday 8 kanal doğrulandı. Katalogda RLS açık, `anon` yetkisi yok, `authenticated` rolü yalnız aktif satırları okuyabiliyor ve yönetim yetkisi `service_role` ile sınırlı.
- Rollback-only sentetik kabulde 10 tekil dosya, 10 profil ve 30 ayrı izin makbuzu üretildi. Ticari iletiyi reddeden adayın zorunlu KVKK/veri işleme kapısı geçti; hatalı toplu aktarım referansı, ham T.C. kimlik numarası ve adayın web dışı kanal oluşturma denemesi reddedildi.
- Aday RLS izolasyonu ve idempotent tekrar çağrısı geçti. Kabul transaction'ı geri alındı; başvuru, profil, izin makbuzu ve sentetik Auth kullanıcı kalıntısı ayrı ayrı `0` doğrulandı.
- Tam Franchise rollback betiği staging transaction'ında son `COMMIT` yerine `ROLLBACK` kullanılarak çalıştırıldı. DDL bağımlılık sırası hatasız geçti; sonrasında Franchise tabloları, başvuru fonksiyonu ve 10 kanal kataloğu yerinde kaldı.
- Güvenlik, performans ve sağlık danışmanlarında yeni kanal kataloğuna bağlı bulgu `0`; sağlık bulgusu `0`. Paylaşılan projedeki önceden var olan genel danışman uyarıları bu migration'ın kapsamı dışında ayrıca izlenmelidir.
- Makinece okunabilir kanıt `gm-franchise/expanded-intake-hosted-evidence.json` dosyasındadır. Bu teknik kabul, gerçek departman UAT imzaları veya canlı yayın onayı değildir; karar `NO_GO` kalır.

## Sınır

## Tek ana sorumlu token kapısı — 2026-11-06

- `ototr-staging` migration geçmişinde `franchise_single_department_owners` ve atanmış-kullanıcı indeks migration'ı bulundu; sorumluluk tablosu ile mevcut Auth hook doğrulandı.
- `franchise_atomic_primary_owner_assignment` migration'ı staging'e uygulandı. GM-only RPC, aktif ve Auth bağlantılı ERP kullanıcısını doğrular; `franchise_user_scopes` ile ana sorumluluk kaydını aynı transaction'da yazar ve farklı aktif departman rolü çakışmasını reddeder.
- Hosted doğrulamada RPC `SECURITY INVOKER`, `anon EXECUTE=false`, `PUBLIC EXECUTE=false`, `authenticated EXECUTE=true` bulundu. Fonksiyon adında yeni güvenlik danışmanı bulgusu `0`; migration sonrasında scope ve sorumluluk satırı hâlâ `0` kaldı.
- `franchise_department_owner_candidate_directory` migration'ı staging'e uygulandı. Organizasyon ekranı artık serbest UUID istemez; yalnız GM oturumunda aktif ve Auth bağlantılı ERP kullanıcılarını ad + mevcut ERP rolüyle seçim listesine getirir. E-posta ve telefon RPC sözleşmesinde yoktur.
- Hosted dizinde seçilebilir kullanıcı sayısı `6`; aday dizini RPC'si `SECURITY INVOKER`, `anon/PUBLIC EXECUTE=false` ve güvenlik danışmanı bulgusu `0` olarak doğrulandı.
- Salt-okunur hosted sorguda sorumluluk kaydı `0`, aktif ana sorumlu `0/13` bulundu. Kişi kimliği veya gerçek ERP kullanıcı UUID'si uydurulmadı.
- Bu durumda yeni token kapısını etkinleştirmek merkez kullanıcılarını kilitleyeceği için migration staging'e uygulanmadı.
- `20261106023000_franchise_primary_owner_token_enforcement.sql`, 13 departmanın her birinde aktif ana sorumlu bulunmadan ilk adımda transaction'ı durduracak şekilde sertleştirildi.
- Hook ve sorumluluk tablosu erişimi Supabase Auth Hook kuralına göre `SECURITY INVOKER`, yalnız `supabase_auth_admin` SELECT/EXECUTE izni ve ayrı RLS politikasıyla tanımlandı; `anon` ve `authenticated` doğrudan çağrı yetkisi almaz.
- Kalan dış bağımlılık: Genel Müdürün gerçek staging kullanıcı UUID'leriyle 13 ana sorumluyu ataması. Bu roster tamamlanmadan token enforcement migration'ı ve kullanıcı oturum yenileme kabulü çalıştırılmayacaktır.

## Tek seferlik Genel Müdür başlangıç koruması — 2026-11-06

- `franchise_gm_bootstrap_guard` migration'ı staging'e uygulandı. Fonksiyon Data API'ye açık olmayan `app_private` şemasında, `SECURITY INVOKER` olarak ve yalnız `service_role` çalıştırma yetkisiyle tanımlandı; `anon` ve `authenticated` çalıştırma yetkileri kapalıdır.
- İşlem yalnız aktif ve Auth bağlantılı ERP kullanıcısını kabul eder. Transaction advisory lock ile eşzamanlı iki başlangıç isteğini sıraya alır; sistemde aktif GM varsa veya hedef kullanıcıda farklı aktif Franchise rolü varsa güvenli biçimde reddeder.
- Dönüş değeri yalnız rol, aktiflik ve kapsam sürümünü içerir; ad, e-posta, telefon veya kullanıcı kimliği döndürmez.
- Hosted doğrulamada `SECURITY DEFINER=false`, `anon EXECUTE=false`, `authenticated EXECUTE=false`, `service_role EXECUTE=true` ve fonksiyon adına bağlı güvenlik danışmanı bulgusu `0` bulundu.
- Kullanıcının kurumsal GM hesabı oluşturma talebi üzerine mevcut, doğrulanmış ve yasaklı olmayan Auth kimliği yeniden üretilmeden kullanıldı. Kimlik aktif `GENERAL_MANAGER` ERP kartına bağlandı ve tek seferlik bootstrap fonksiyonu çalıştırıldı.
- Son doğrulamada aktif ERP Genel Müdürü `1`, aktif Franchise GM kapsamı `1`, kapsam sürümü `1` ve şube kapsamı `HQ` bulundu. Kanıt kaydı e-posta adresi veya kullanıcı UUID'si içermez; yeni parola üretilmedi ya da sohbet/log içine yazılmadı.

## Atomik 13 departman sorumlusu kadrosu — 2026-11-06

- `franchise_atomic_department_roster` migration'ı staging'e uygulandı. GM-only RPC tam 13 resmi departmanı, 13 farklı aktif ve Auth bağlantılı ERP kullanıcısını, 10-500 karakter atama notlarını ve boş başlangıç organizasyonunu yazmadan önce doğrular.
- Transaction advisory lock ve aday ERP satırlarında sabit UUID sıralı `FOR UPDATE` kullanılır. On üç tekil güvenli atama aynı RPC transaction'ında yürür; bir satır reddedilirse hiçbir sorumluluk veya scope kaydı kalmaz.
- RPC `SECURITY INVOKER`; `anon EXECUTE=false`, `authenticated EXECUTE=true` ve fonksiyon adına bağlı güvenlik danışmanı bulgusu `0` olarak doğrulandı.
- `franchise_department_candidate_eligibility` migration'ı aday dizininden GM dahil mevcut aktif Franchise kapsamı bulunan kullanıcıları çıkardı. E-posta ve telefon dönmez.
- Hosted doğrulamada kullanılabilir aday `6`, aktif ana departman sorumlusu `0` bulundu. Bu nedenle ekran `6/13` eksik kadro uyarısı verir ve toplu atamayı kilitler; sahte kullanıcı üretilmedi ve kısmi atama yapılmadı.

## ERP rolü–departman uygunluğu — 2026-11-06

- `franchise_department_erp_role_eligibility` migration'ı staging'e uygulandı. On üç resmi departmanın her biri mevcut ERP rol kataloğundaki izinli rolle eşleştirildi; örneğin Finans/Muhasebe `FINANCE`, Hukuk `LEGAL`, İK `HR`, BT `SUPPORT_AGENT` rolünü gerektirir.
- Uygunluk kataloğunda RLS açık, `anon SELECT=false`, `authenticated SELECT=true` fakat politika yalnız GM claim'ine izin verir. Aday dizini `allowed_departments` alanını döndürür; mevcut Franchise kapsamlı veya hiçbir departmanla rolü eşleşmeyen kullanıcıyı listelemez.
- Arayüz her departmanın seçim kutusunu yalnız uygun adaylarla doldurur. Aynı kural `franchise_primary_owner_erp_role_guard_trigger` ile doğrudan veritabanı yazımında da zorunludur; arayüz filtresi güvenlik sınırı değildir.
- Hosted katalog sonucu `13/13` departman, `13` eşleme satırı, rol-uyumlu aktif aday `3`, aktif ana sorumlu `0` olarak doğrulandı. Güvenlik danışmanı yeni katalog/trigger bulgusu üretmedi.
- Rollback-only negatif kabulte `BRANCH_MANAGER` rolündeki sentetik hedefin Finans ana sorumlusu yapılması veritabanında reddedildi (`PASS`); transaction rollback sonrasında aktif ana sorumlu sayısı `0` kaldı.

## Departman kadro gereksinim raporu — 2026-11-06

- `franchise_department_staffing_gap_report` migration'ı staging'e uygulandı. RPC, 13 departmanın gerekli ERP rolünü ve rol-uyumlu aday sayısını kişisel veri döndürmeden raporlar.
- RPC `SECURITY INVOKER`; `anon EXECUTE=false`, `authenticated EXECUTE=true`, `service_role EXECUTE=true` olarak doğrulandı.
- GM JWT ile 13/13 departman döndü. Finans/Muhasebe için `1`, Operasyon/Tedarik/İSG/Mimari için `2` uygun aday; Academy, Franchise, İK, BT, Hukuk, Pazarlama ve Kalite için `0` uygun aday bulundu.
- Aynı kişi yalnız bir departmana atanabildiğinden, departmanda aday görünmesi kadronun tamamlandığı anlamına gelmez; atomik işlem hâlâ 13 farklı rol-uyumlu kullanıcı ister.

## Rol bazlı kesin kadro açığı — 2026-11-06

- `franchise_role_staffing_gap_summary` migration'ı staging'e uygulandı. RPC, aynı ERP rolünü paylaşan departmanların koltuklarını ve farklı uygun kişileri ayrı ayrı sayar.
- Hosted sonuçta gereken toplam koltuk `13`, mevcut farklı rol-uyumlu kişi `3`, eksik kişi `10` bulundu.
- Eksik dağılımı: `OPERATIONS=2`; `FINANCE`, `ACADEMY_MANAGER`, `FRANCHISE_SALES`, `HR`, `LEGAL`, `MARKETING`, `QUALITY_AUDITOR` ve `SUPPORT_AGENT` rollerinin her biri `1`.
- RPC `SECURITY INVOKER`; `anon EXECUTE=false`, `authenticated EXECUTE=true`, `service_role EXECUTE=true`. Kişi adı, e-posta, telefon veya kullanıcı kimliği dönmez.

## Kurumsal hesap davet talebi ve bağımsız BT onayı — 2026-11-06

- `franchise_user_invitation_queue` ve `franchise_user_invitation_corporate_email_guard` migration'ları staging'e uygulandı. Talep kuyruğu Data API'ye açık olmayan `app_private` şemasındadır; RLS açıktır ve parola, erişim anahtarı veya davet tokenı alanı içermez.
- Genel Müdür yalnız `@ototr.com` kurumsal e-posta, ad soyad ve ERP rolüyle talep oluşturabilir. Liste RPC'si e-postayı maskeli döndürür; tam e-posta tarayıcıdaki kuyruk listesine taşınmaz.
- Talebi açan kişi aynı talebi onaylayamaz. Onay yalnız aktif BT ERP rolündeki farklı bir kullanıcı tarafından verilebilir; böylece maker-checker ayrımı veritabanında zorunludur.
- Üç public RPC `SECURITY INVOKER`; anonim talep ve inceleme yetkileri kapalı, kimliği doğrulanmış kullanıcı yetkileri rol kontrollerine bağlıdır.
- Rollback-only hosted kabulde sentetik GM talebi oluşturdu, OTOTR dışı e-posta reddedildi, maskeli liste doğrulandı ve farklı sentetik BT kullanıcısı talebi onayladı. Transaction rollback sonrasında kuyruktaki kayıt sayısı `0` kaldı.
- Bu kabul gerçek bir Auth daveti göndermedi ve Auth kullanıcısı oluşturmadı. Davetin gönderilmesi ayrıca sunucu tarafı Auth Admin/Edge worker, BT onayı ve gerçek kişi bilgilerinin kontrollü girilmesini gerektirir.
- `franchise_user_invitation_provisioning_worker` ve `franchise_user_invitation_provisioning_email_guard` migration'ları staging'e uygulandı. Yalnız bağımsız BT onaylı kayıtlar 10 dakikalık lease ile alınır; `SKIP LOCKED`, en fazla beş deneme ve güvenli hata kodları eşzamanlı/tekrarlı çalışmayı sınırlar.
- `claim` ve public `finish` RPC'leri `SECURITY INVOKER` ve yalnız `service_role` erişimlidir. Auth e-posta eşleşmesi ve HQ ERP kartı bağlantısı Data API dışındaki private `SECURITY DEFINER` uygulamada yapılır; public wrapper ayrıcalık yükseltmez ve `anon/authenticated EXECUTE=false` doğrulandı.
- `franchise-user-invitation-worker` Edge Function v1 staging'e `verify_jwt=true` ile yayımlandı. Worker ayrıca ayrı çağrı sırrı ve tam olarak `FRANCHISE_INVITATION_DELIVERY_ENABLED=true` ister; bu değer etkinleştirilmediği sürece kuyruk almadan HTTP 503 verir. Anonim ve yalnız publishable-key istekleri gateway'de HTTP 401 döndü.
- Worker parola üretmez; Supabase Admin `inviteUserByEmail` çağrısını kullanır. ERP bağlantısı başarısız olursa oluşturulan Auth kimliğini silmeye çalışır, yalnız izinli hata kodunu kaydeder ve e-posta/ad değerlerini yanıt veya log sonucu olarak döndürmez.
- Hosted sentetik kabulde onaylı kayıt claim edildi, başarısız Auth daveti güvenli retry durumuna döndü, deneme sayısı `1` oldu ve kabul kaydı temizlendi; kalan sentetik kayıt `0`. Gerçek e-posta veya gerçek Auth daveti gönderilmedi.
- Yarış koşulu sertleştirmesinde aktif e-posta tekillik indeksi `pending`, `approved` ve `provisioning` durumlarını birlikte kapsar. Aktif ERP hesabına bağlı e-posta için yeni GM talebi veritabanında reddedilir.
- Organizasyon ekranında BT rolüne ayrı, maskeli davet inceleme çalışma alanı eklendi. BT kullanıcısı yalnız `pending` taleplere 10–500 karakter gerekçeyle onay veya ret verebilir; tarayıcı yalnız talep UUID'si, karar ve notu RPC'ye gönderir. E-posta, parola veya service-role bilgisi karar payload'ına girmez.
- Organizasyon veri yükleme akışı role göre en az yetkiyle ayrıldı: GM kadro ve açık raporlarını, BT kendi sorumluluk görünümü ile davet kuyruğunu, diğer departmanlar yalnız RLS kapsamında görülebilen sorumluluklarını ister. UI rol seçimi yetki kaynağı değildir; gerçek JWT ve veritabanı politikası belirleyicidir.
- Headless Edge görsel kabulünde BT masaüstü ve dar ekran yerleşimleri render edildi; genel ERP girişi, 13 departman görünümü ve davet inceleme kartı görünür, boş kuyrukta kişisel veri yoktur. Work yerel tarayıcı otomasyonu kapalı olduğundan tıklama testi yerine gerçek render ekran görüntüsü ve istemci/RPC otomatik testleri kullanıldı.

## Davet worker otomatik scheduler — 2026-11-06

- `franchise_user_invitation_scheduler` migration'ı staging'e uygulandı. Dakikalık cron işi yalnız Data API dışındaki `app_private.dispatch_franchise_user_invitation()` fonksiyonunu çağırır.
- Scheduler yapılandırması `enabled=false`, `worker_url=null` ve iki Vault bağlantısı da `null` olarak kuruldu. Dispatcher bu durumda `null` dönerek ağ isteği oluşturmaz; gerçek davet teslimi etkinleştirilmedi.
- Gateway JWT ve worker çağrı sırrı ayrı Vault UUID'leriyle bağlanır; aynı Vault kaydının iki amaçla kullanılması constraint ile engellenir. SQL dosyasında ham sır, parola veya service-role anahtarı bulunmaz.
- Yetki doğrulaması `anon EXECUTE=false`, `authenticated EXECUTE=false`, `service_role EXECUTE=true`; cron sayısı `1`, kuyruk satırı `0` ve disabled no-op sonucu `true` olarak ölçüldü.
- Güvenlik danışmanında yeni dispatcher için mutable search path bulgusu oluşmadı. Private config tablosunun politikasız RLS bilgisi beklenen savunma katmanıdır; tablo public/anon/authenticated rollerine kapalıdır.
- Bu adım gerçek e-posta göndermedi, Auth kullanıcısı oluşturmadı ve `FRANCHISE_INVITATION_DELIVERY_ENABLED` değerini açmadı.
- `franchise-user-invitation-scheduler-acceptance.sql` staging'de transaction içinde çalıştırıldı. Cron, dispatcher ve config doğru sırayla kaldırıldı; transaction rollback sonrasında config ve dispatcher geri geldi, cron sayısı `1`, son cron durumu `succeeded`, disabled no-op `true` ve davet kuyruğu `0` olarak doğrulandı.

## UAT tekil sorumlu ön kontrolü — 2026-11-06

- `franchise_uat_roster_readiness` migration'ı staging'e uygulandı. RPC, dokuz imza rolü için yalnız gerekli senaryoları, uygun aktif ana sorumlu sayısını ve kadro durumunu döndürür; kullanıcı UUID'si, ad, e-posta veya telefon döndürmez.
- Kontrol tek-sorumlu organizasyon tablosundaki aktif `primary_responsible` atamalarını esas alır. Genel Müdür koltuğu merkezdeki aktif `GENERAL_MANAGER` ERP hesabıyla ayrıca doğrulanır.
- `anon EXECUTE=false`, `authenticated EXECUTE=true`, `service_role EXECUTE=true`; public RPC `SECURITY INVOKER`, ayrıcalıklı sayım Data API dışındaki `app_private` uygulamasındadır ve izinli UAT rollerini sunucu JWT claim'iyle sınırlar.
- Hosted sonuç: UAT kataloğu `16` aktif senaryo ve `9` imza rolü içeriyor; seçili release adayı için onaylı sonuç `0/16`, imza `0/9`. Genel Müdür sorumluluğu hazır, diğer sekiz imza grubu için aktif ana sorumlu bulunmadığından UAT kadrosu `1/9` ve G14 `BLOCKED` kalır.
- Yayın ekranı artık her imza kartında uygun ana sorumlu sayısını gösterir ve sorumlu atanmamış rolde imza düğmesini kapatır. Bu ön kontrol insan imzası üretmez veya eksik sorumluyu otomatik atamaz.

Bu doğrulama staging şema kurulumu ve rollback kabiliyetini kanıtlar. Gerçek ERP/sağlayıcı uçları, departman UAT imzaları, yayın penceresi ve kullanıcı canlı onayı ayrıca gereklidir. Yayın kararı `NO_GO` kalır.
