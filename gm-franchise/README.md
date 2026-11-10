# OTOTR GM Franchise Yönetim Merkezi

Geçerli sürüm: **v0.10.0-beta.1** (`2026-11-11`). Bu sürüm staging doğrulamalı görsel/çalışan demodur; üretim kararı `NO_GO` kalır. Makinece okunabilir sürüm kaydı `gm-franchise/version.json` dosyasındadır.

Başvurudan aktif şubeye kadar 14 aşamalı franchise yaşam döngüsünü gösteren güvenli, sentetik veri pilotudur.

- `index.html`: rol/persona, departman kapıları, aday hattı, belge, sözleşme, açılış kurulu, aktif şube, royalty ve audit ekranları.
- `franchise-core.mjs`: tekil franchise dosyası, zorunlu kadro, sertifika/yetki kilidi, atomik aktivasyon ve 30/60/90 iş kuralları.
- `dealer-growth-engine.mjs`: Bayi Büyüme altında aday ve lokasyonu 10 boyutta puanlayan; kira/ciro sapmasını, riskleri ve alternatif mikro-bölgeyi açıklayan sentetik karar motoru. Otomatik nihai karar vermez.
- `integration-adapters.mjs`: Finans, Muhasebe, Hukuk, İK, Academy, Operasyon, Tedarik, BT, Pazarlama, Kalite, İSG, Mimari ve Görev Merkezi olay sözleşmeleri.
- `release-readiness.mjs`: Hosted staging kanıtları, dokuz bağımsız departman imzası, sabit commit ve değişiklik penceresi eksikse otomatik `NO_GO` üreten yayın karar motoru.
- `release-preflight.mjs`: gerçek kanıt dosyalarının güncel SHA-256 özetlerini, sabitlenecek commit/manifest değerlerini ve kirli worktree durumunu salt okunur denetler; karar kapılarını değiştirmez.
- `public-intake-readiness.mjs`: canlı Franchise sayfasını ve uygulama JavaScript'ini yalnız GET ile denetler; üç ayrı izin, Edge intake, deployment kimliği ve rollback referansı eksikse R28'i fail-closed tutar.
- `integration-readiness.mjs`: 13 departman kaynağı, iki staging worker, dört iletişim/e-imza kanalı ve zamanlanmış dispatch kapılarını değerlendirir; gerçek endpoint/secret yoksa R24'ü `NO_GO` tutar.
- `supabase/functions/_shared/franchise-integration-contracts.mjs`: 13 hedef sistemde 34 olay için sürümlü, minimum veri alanları; TCKN, telefon, e-posta, IBAN, plaka, VIN ve gizli anahtarların dış sisteme taşınmasını engelleyen ortak sözleşme.
- `supabase/migrations/20261105120000_franchise_external_portals.sql`: aday, bayi, denetçi ve tedarikçi için atama bazlı RLS, güvenli portal işleri ve kontrollü tamamlama/kapatma RPC'leri.
- `supabase/migrations/20261105130000_franchise_application_intake.sql` ve `20261110082445_franchise_expanded_intake_channels.sql`: web, GM manuel, CRM, referans, sosyal medya, çağrı merkezi, fuar/QR, saha ekibi, kurumsal iş ortağı ve toplu aktarım olmak üzere on kanaldan idempotent başvuru; güvenli kaynak referansı ve ayrı KVKK/veri işleme/ticari ileti makbuzları.
- `supabase/migrations/20261105260000_franchise_public_intake_queue.sql`: mevcut ERP oturumunu kullanan, yalnız Franchise maker rollerine açık ve ham kişisel veri döndürmeyen web başvuru kuyruğu.
- `franchise-basvuru/`: KVKK aydınlatma, veri işleme ve isteğe bağlı ticari ileti kararlarını ayrı alan, hassas kimlik/finans belgesini açık web kanalından dışlayan staging başvuru ekranı.
- `franchise-aday-portali/`: mevcut Supabase aday oturumuyla durum, belge talebi, randevu, mesaj, sözleşme, ödeme planı ve eğitim işlerini gösteren; özel Storage belge yüklemesini RLS ile sınırlayan aday ekranı.
- `supabase/migrations/20261105270000_franchise_applicant_document_portal.sql`: adayın yalnız kendi franchise dosyasına özel belge kaydı açmasını sağlayan private implementation/invoker RPC ve dar orphan temizleme politikası.
- `supabase/migrations/20261105280000_shared_storage_policy_isolation.sql` ve `20261105290000_finance_storage_policy_short_circuit.sql`: paylaşılan Storage RLS değerlendirmesini bucket kapsamına hapseder; Franchise yüklemesi finans politikalarına takılmaz.
- `supabase/migrations/20261105300000_applicant_document_catalog_integrity.sql`: aday belgesini zorunlu belge kataloğu, kategori ve SHA-256 özetiyle bağlar.
- `supabase/migrations/20261105330000_franchise_portal_private_implementations.sql`: dört ayrıcalıklı portal işlemini private implementation katmanına alır; Data API'de yalnız `SECURITY INVOKER` sarmalayıcı bırakır.
- `supabase/migrations/20261105340000_franchise_uat_command_boundary.sql`: UAT sonucu, bağımsız inceleme ve departman imzasında doğrudan tablo yazımını kapatır; kullanıcı ve rolü sunucuda bağlayan kilitli komut RPC'leri sağlar.
- `applicant-portal-hosted-evidence.json`: sentetik Auth → private Storage → kayıt RPC → portal geri okuma → görev tamamlama zinciri ve sıfır kalıntı temizliği kanıtı.
- `hosted-activation-evidence.json`: hosted staging üzerinde kadro/sertifika/yetki kapılarından atomik şube, erişim hesapları ve 30/60/90 takibine uzanan rollback kabul kanıtı.
- `uat-immutability-hosted-evidence.json`: staging’de UAT kanıtı değişmezliği, tek inceleme ve bağımsız checker negatif/pozitif kabul kanıtı.
- `public-handoff-hosted-evidence.json`: RawGitHack formundan Edge API, ayrı izinler, güvenli kuyruk, yapılandırılmış profil ve tekil kanonik dosyaya uzanan hosted kabul kanıtı.
- `adapter-transport-hosted-evidence.json`: 13 departman kaynağı için gerçek HTTPS echo üzerinde Bearer, idempotency ve minimal sözleşme taşıma kabulü; gerçek sağlayıcı olarak sayılmaz.
- `portal-wrapper-hosted-evidence.json`: maker/aday pozitif ve negatif yetki senaryoları, oturum kapatma, katalog ACL kontrolü ve sıfır kalıntı temizliğiyle hosted portal güvenlik sınırı kanıtı.
- `uat-command-hosted-evidence.json`: gerçek ERP oturumuyla UAT gönderim/inceleme/imza komutlarının pozitif-negatif hosted kabulü; 16 insan UAT'ı ve dokuz imza yerine geçmez.
- `uat-acceptance-evidence.mjs`: repo dışında tutulan ham staging UAT çıktısında 16 bağımsız senaryo incelemesini, dokuz benzersiz ve sıralı departman imzasını, rol-senaryo ayrımını ve release commit bağını doğrular; yalnız SHA-256 özetli kabul kaydı üretir.
- `uat-release-acceptance.json`: G14 için kişisel veri içermeyen, release commitine bağlı fail-closed insan UAT kabul özeti; gerçek UAT tamamlanana kadar `BLOCKED` kalır.
- `public-intake-acceptance-evidence.mjs`: canlı `ototr.com` formunun üç ayrı izin, sürümlü KVKK, Edge intake, eski PHP kapatma, sentetik idempotent gönderim, deployment ve rollback kanıtını repo dışı ham kayıttan doğrular.
- `public-intake-release-acceptance.json`: G16 için kişisel veri içermeyen ve Franchise release commitine bağlı fail-closed canlı başvuru kabul özeti.
- `release-candidate-control.mjs`: temiz worktree üzerinde mevcut HEAD'i ve UTC değişiklik penceresini aday olarak sabitler; tüm kapılar geçtikten sonra repo dışı dokuz imza + kullanıcı onayı kanıtını hash'leyerek karar manifestine uygular. Canlı yayın yapmaz.
- `provider-contracts.mjs`: e-posta, SMS, WhatsApp ve e-imza için amaç/izin/şablon/idempotency sözleşmesi ve log maskeleme kuralları.
- `preproduction-gates.json`: Finans modülündeki yaklaşımla kanıtlı `GO/NO_GO` kapıları.
- `supabase/functions/franchise-outbox-worker`: HTTPS allowlist, idempotency ve retry/dead-letter destekli departman olay worker'ı.
- `supabase/functions/franchise-provider-worker`: e-posta, SMS, WhatsApp ve e-imza kuyruğu için kanal bazlı secret, HTTPS allowlist, lease kurtarma ve dead-letter worker'ı.
- `supabase/functions/franchise-user-invitation-worker`: bağımsız BT onaylı kurumsal hesap talepleri için varsayılan kapalı, JWT + ayrı worker sırrı korumalı Supabase Auth davet ve HQ ERP dizin bağlantı worker'ı.
- `erp-nav-integration.js`: ERP sol menüsüne bağımsız Franchise Yönetim Merkezi bağlantısı ekler.
- Gerçek T.C. kimlik, banka/finans, sözleşme, çalışan veya müşteri verisi girilmemelidir.
- SMS, WhatsApp, e-imza, ödeme, fatura ve tahakkuk işlemleri simülasyondur.
- Veriler yalnızca tarayıcı `localStorage` alanında şifrelenmeden tutulur; üretim sistemi değildir.

## Üretim sınırı

Supabase Auth/RLS/Storage, hukuk ve KVKK saklama politikaları, gerçek sağlayıcı entegrasyonları, UAT, güvenlik ve geri yükleme kapıları tamamlanmadan üretim kullanımı yasaktır.

Yeni başvuru artık bir `applicationId` ve franchise dosyası üretir. Şube aktivasyonu; 3/3 izin, tam belge seti, %100 tahsilat, ayrı Finans ve Muhasebe onayları dahil 39/39 departman görevi, 10/10 işe alım, özlük/sözleşme ve geçerli rol sertifikaları tamamlanmadan kapalıdır. Başarılı aktivasyon şube kartı, şube kapsamlı kullanıcı kayıtları ve 30/60/90 görevlerini birlikte üretir.

Veritabanı açılış kapısı ayrıca %100 tahsilat, imzalı franchise sözleşmesi, konum/fotoğraf/ölçüm/denetçi onaylı saha ziyareti ve geçerli ruhsat için SHA-256 kanıtı ile bağımsız maker–checker onayı ister. Bu dört kapı istisnayla aşılamaz.

`consent_count` ve `document_count` yalnız özet alanlarıdır. Açılışta son üç izin makbuzu ile şube tipinin zorunlu belge kataloğu gerçek tablolardan yeniden hesaplanır; geri çekilmiş izin, onaysız, eksik veya süresi geçmiş belge kapıyı kapatır.

Veritabanı yaşam döngüsü aşamaları yalnız sırayla ve ilgili aşama sahibi rol tarafından ilerletilir. Yanlış rol, aşama atlama ve fiziksel şube kaydı olmadan `active` durumu reddedilir; her geçiş append-only geçmişe yazılır.

30/60/90 görevleri görev sahibi departman tarafından SHA-256 kanıtı ve tamamlama notuyla kapatılır. Gecikme/due-soon durumu güvenli görünümden hesaplanır; tamamlanan görev yalnız maker–checker yeniden açma kararıyla geri alınabilir.

Aday değerlendirmesi finansal yeterlilik, yönetim deneyimi, marka ve etik uyumu, lokasyon potansiyeli, operasyonel yeterlilik, referans/geçmiş ve büyüme potansiyeli olmak üzere yedi kanıtlı boyuttan oluşur. Ağırlıklı sonuç `80 güçlü / 65 şartlı / 50 yönetici incelemesi / altı uygun değil` önerisi üretir; otomatik nihai karar vermez. Ön onay aşaması, tek aktif Franchise Sorumlusunun hazırladığı olumlu kararın farklı bir GM tarafından onaylanmasına kadar kilitlidir. `franchise_director` ve `fd` teknik rol kodları geriye uyumluluk amacıyla korunur; kullanıcıya ikinci bir aktif yönetici veya uzman kadrosu olarak gösterilmez.
Onaydan sonra puanlardan biri revize edilirse önceki kurul kararı otomatik olarak geçersizleşir ve yeni puan seti için bağımsız karar zinciri yeniden çalışır.

Supabase/PostgreSQL ana şeması `supabase/migrations/20261105010000_franchise_end_to_end.sql`, izin/şablon/sağlayıcı yönetişimi ise `supabase/migrations/20261105020000_franchise_provider_governance.sql` dosyasındadır. Migration'lar uzak/üretim veritabanına staging doğrulaması ve kullanıcı kabulü olmadan uygulanmamalıdır.
