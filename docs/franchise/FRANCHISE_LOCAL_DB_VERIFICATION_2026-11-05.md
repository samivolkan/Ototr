# Franchise Yerel Supabase PostgreSQL Doğrulaması

Tarih: 5 Kasım 2026  
Motor: `public.ecr.aws/supabase/postgres:17.11.0.011` / PostgreSQL 17.11

## Sonuç

Yerel ve geçici Supabase PostgreSQL konteynerinde migration, güvenlik doğrulaması, aktivasyon kabul testi ve rollback başarıyla çalıştı.

## Kanıtlanan davranışlar

- Ana migration ve sağlayıcı yönetişim migration'ı gerçek PostgreSQL motorunda hatasız commit edildi.
- 13 public franchise tablosunda RLS açık.
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
- Rollback Storage politikalarını önce kaldırdı, tüm franchise tablolarını ve bucket'ı temizledi.
- Test konteyneri çalışma sonunda kaldırıldı.

## Kullanılan kanıt dosyaları

- `supabase/migrations/20261105010000_franchise_end_to_end.sql`
- `supabase/migrations/20261105020000_franchise_provider_governance.sql`
- `supabase/ops/franchise-local-contract-stubs.sql`
- `supabase/ops/franchise-staging-verify.sql`
- `supabase/ops/franchise-activation-acceptance.sql`
- `supabase/ops/franchise-provider-acceptance.sql`
- `supabase/ops/franchise-rollback.sql`

## Kalan sınır

Bu doğrulama hosted staging projesi değildir. Hosted Supabase üzerinde Auth, Storage API, secrets, Edge Functions ve gerçek ERP kimliğiyle aynı paket yeniden çalıştırılmadan G05 kapısı kapanmaz.
