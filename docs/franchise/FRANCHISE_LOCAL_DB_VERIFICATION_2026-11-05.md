# Franchise Yerel Supabase PostgreSQL Doğrulaması

Tarih: 5 Kasım 2026  
Motor: `public.ecr.aws/supabase/postgres:17.11.0.011` / PostgreSQL 17.11

## Sonuç

Yerel ve geçici Supabase PostgreSQL konteynerinde migration, güvenlik doğrulaması, aktivasyon kabul testi ve rollback başarıyla çalıştı.

## Kanıtlanan davranışlar

- On dört Franchise migration'ı (ana şema, sağlayıcı yönetişimi, sağlayıcı worker, departman RBAC, kadro, açılış kanıtı, gerçek kayıt kapıları, yaşam döngüsü, 30/60/90 yönetişimi, aday skoru/kurul kararı, sürümlü entegrasyon sözleşmeleri, dış portal izolasyonu, başvuru alımı ve finansal koşullar) gerçek PostgreSQL motorunda hatasız commit edildi.
- Tüm kapsam içi public franchise tablolarında RLS açık.
- `anon`, franchise dosyalarını ve belgeleri okuyamıyor.
- Özel Storage bucket `public=false`, 20 MB ve MIME sınırlarıyla oluştu.
- Eksik 36 görev setinde aktivasyon reddedildi.
- Tam dosyada atomik olarak 1 şube, 10 erişim hesabı, 3 adet 30/60/90 görevi ve 4 outbox olayı oluştu.
- Tekrarlanan aktivasyon idempotent sonuç verdi; kayıtları çoğaltmadı.
- Outbox worker `FOR UPDATE SKIP LOCKED` ile olay talep etti ve tamamladı.
- Custom Access Token Hook, `franchise_role` ve `franchise_branch_ids` claim'lerini üretti; mevcut ERP metadata alanını korudu.
- Hook yalnız `supabase_auth_admin` tarafından çalıştırılabilir; `authenticated` rolüne kapalıdır.
- Edge Function worker için HTTPS, alan adı izin listesi, gizli çağrı anahtarı ve idempotency kuralları otomatik test edildi.
- İzin makbuzu, onaylı/sürümlü şablon ve sağlayıcı talebi bağları gerçek PostgreSQL üzerinde oluşturuldu.
- Aynı idempotency anahtarıyla ikinci sağlayıcı talebi veritabanı tarafından reddedildi.
- E-posta, SMS, WhatsApp ve e-imza ortak sözleşmesi sahte sağlayıcıyla test edildi; kişisel veri ve token logları maskelendi.
- Sağlayıcı kuyruğu `FOR UPDATE SKIP LOCKED` ile talep edildi, başarılı sonuç işlendi ve 15 dakikayı aşan worker lease'i güvenle geri kazanıldı.
- Finans rolünün yalnız Finans görevini gördüğü ve tamamlayabildiği, Hukuk görevini güncelleyemediği gerçek RLS oturumunda doğrulandı.
- Görevin dosya, departman ve görev kodunun güncelleme sırasında değiştirilemediği doğrulandı.
- Şube tipi için parametrik 10 zorunlu rolün tam seti olmadan şube kaydı reddedildi; tam setle açıldı.
- İK, Academy ve BT rollerinin yalnız kendi personel alanlarını değiştirebildiği gerçek JWT/RLS oturumlarıyla doğrulandı.
- %100 tahsilat, imzalı sözleşme, fotoğraf/ölçüm/konum içeren saha ziyareti ve geçerli ruhsat kanıtları olmadan şube kaydı reddedildi.
- Kanıtı oluşturan kullanıcının kendi kaydını onaylayamadığı; bağımsız GM onayından sonra dört kapının birlikte açıldığı doğrulandı.
- Dosyadaki `3/3` ve `17/17` sayaçları dolu olsa bile gerçek izin makbuzu ve onaylı belge olmadan şube açılışı reddedildi.
- Son ticari ileti izni geri çekildiğinde kapının kapandığı; daha yeni geçerli makbuzla yeniden açıldığı doğrulandı.
- Standart şube kataloğunda 16 belge reddedildi, 17 onaylı ve süresi geçmemiş belge kabul edildi.
- Yanlış departman rolünün aşama ilerletmesi, aşama atlama ve manuel geçmiş kaydı reddedildi.
- Yetkili sıralı geçiş değiştirilemez aşama geçmişine yazıldı; atomik aktivasyon yeni denetim tetikleyicisiyle yeniden geçti.
- 30. gün görevi yalnız Operasyon rolü tarafından SHA-256 kanıt ve notla tamamlandı.
- Görev sahibi kendi yeniden açma talebini onaylayamadı; GM ikinci onayı sonrası görev güvenle yeniden açıldı.
- Yedi aday skoru başlığı, toplam ağırlığı `%100` olacak şekilde departman rollerine ayrıldı; yanlış rolün puan girişi reddedildi.
- Sentetik adayın ağırlıklı skoru `83,15` hesaplandı ve eşik motoru yalnız `strong` önerisi üretti.
- Yedi skor tamamlanmadan ön değerlendirme kapısı; bağımsız, olumlu kurul kararı olmadan ön onay kapısı açılmadı.
- Franchise direktörünün hazırladığı kurul kararını kendisinin onaylaması reddedildi; bağımsız GM kontrolü sonrası aşama ilerledi.
- Kurul onayından sonra herhangi bir skor revizyonu eski kararı geçersiz kıldı; yeni bağımsız kurul onayı olmadan aşama yeniden kilitlendi.
- Finans, Hukuk, İK, Academy, Operasyon, Tedarik, BT, Pazarlama, Kalite, İSG, Mimari ve Görev Merkezi için 31 sürümlü olay sözleşmesinin tamamı minimum sentetik yükle kabul edildi.
- Kaynak/olay uyuşmazlığı, eksik zorunlu alan, sözleşme dışı alan, bilinmeyen sürüm ve iç içe TCKN/e-posta/IBAN/VIN/token gibi hassas alanlar hem worker hem veritabanında fail-closed reddedildi.
- Aday yalnız kendi başvuru işini, bayi yalnız claim kapsamındaki şubeyi, denetçi yalnız atanmış saha ziyaretini ve tedarikçi yalnız atanmış siparişi gördü; çapraz persona erişimi reddedildi.
- Dış kullanıcılar yalnız güvenli RPC ile kendi işini sonuçlandırdı; persona–iş türü uyuşmazlığı, kişisel veri yükü ve atama kapsamı değişikliği reddedildi.
- Web, GM manuel, CRM, referans, sosyal medya ve çağrı merkezi kanallarının her biri tekil franchise dosyası ve güvenli başvuru profili oluşturdu.
- Aynı idempotency anahtarı ikinci dosyayı üretmedi; KVKK aydınlatma, veri işleme ve ticari ileti için üç ayrı SHA-256 izin makbuzu oluştu.
- Ham lead payload'ı ve T.C. kimlik numarası saklanmadı; yalnız doğrulama ve finansal belge referansları kabul edildi.
- Giriş bedeli, taksit planı ve tahsilat kayıtları yapılandırılmış finans tablolarına alındı; Finans hazırlayan ile Muhasebe/GM kontrol eden ayrıldı.
- Özet `paid_percent` alanına güvenilmeden, yalnız bağımsız onaylı tahsilat defterinden hesaplanan `%99` açılışı reddetti ve `%100` açılış kapısını açtı.
- Royalty matrahı KDV dâhil müşteri tahsilatı, varsayılan oran `%10`, reklam payı `%0` ve muafiyet seçenekleri `0/6/12 ay` olarak doğrulandı; gecikme operasyonu otomatik durdurmuyor.
- Rollback Storage politikalarını önce kaldırdı, tüm franchise tablolarını ve bucket'ı temizledi.
- Test konteyneri çalışma sonunda kaldırıldı.

## Kullanılan kanıt dosyaları

- `supabase/migrations/20261105010000_franchise_end_to_end.sql`
- `supabase/migrations/20261105020000_franchise_provider_governance.sql`
- `supabase/migrations/20261105030000_franchise_provider_worker.sql`
- `supabase/migrations/20261105040000_franchise_department_rbac.sql`
- `supabase/migrations/20261105050000_franchise_staffing_gates.sql`
- `supabase/migrations/20261105060000_franchise_opening_evidence.sql`
- `supabase/migrations/20261105070000_franchise_record_gates.sql`
- `supabase/migrations/20261105080000_franchise_lifecycle_audit.sql`
- `supabase/migrations/20261105090000_franchise_followup_governance.sql`
- `supabase/migrations/20261105100000_franchise_scoring_board.sql`
- `supabase/migrations/20261105110000_franchise_integration_contracts.sql`
- `supabase/migrations/20261105120000_franchise_external_portals.sql`
- `supabase/migrations/20261105130000_franchise_application_intake.sql`
- `supabase/migrations/20261105140000_franchise_financial_terms.sql`
- `supabase/ops/franchise-local-contract-stubs.sql`
- `supabase/ops/franchise-staging-verify.sql`
- `supabase/ops/franchise-activation-acceptance.sql`
- `supabase/ops/franchise-provider-acceptance.sql`
- `supabase/ops/franchise-rbac-acceptance.sql`
- `supabase/ops/franchise-staffing-acceptance.sql`
- `supabase/ops/franchise-opening-evidence-acceptance.sql`
- `supabase/ops/franchise-record-gates-acceptance.sql`
- `supabase/ops/franchise-lifecycle-acceptance.sql`
- `supabase/ops/franchise-scoring-acceptance.sql`
- `supabase/ops/franchise-integration-contract-acceptance.sql`
- `supabase/ops/franchise-external-portal-acceptance.sql`
- `supabase/ops/franchise-application-intake-acceptance.sql`
- `supabase/ops/franchise-finance-acceptance.sql`
- `supabase/ops/franchise-rollback.sql`

## Kalan sınır

Bu doğrulama hosted staging projesi değildir. Hosted Supabase üzerinde Auth, Storage API, secrets, Edge Functions ve gerçek ERP kimliğiyle aynı paket yeniden çalıştırılmadan G05 kapısı kapanmaz.
