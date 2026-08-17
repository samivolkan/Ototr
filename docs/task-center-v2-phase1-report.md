# Task Center V2 — Phase 1 Report

## Teslim edilen foundation

- Additive PostgreSQL migration: 14 yeni tablo, indexler, RLS, Realtime publication guard ve private Storage bucket.
- Transactional project-from-template RPC.
- Evidence ve approval backend gate’leri.
- Multiple assignee, checklist, comment, attachment metadata ve immutable activity trail.
- Optimistic concurrency RPC (`expected_updated_at`).
- 1 template, 11 kategori ve mevcut kaynakla birebir 100 task seed.
- Auth zorunlu, service-role içermeyen V2 web shell ve data-access katmanı.
- Manifest ve yalnızca shell assetlerini cache’leyen temel PWA hazırlığı.

## Doğrulama durumu

- PostgreSQL syntax: `pglast` ile parse edildi (129 statement).
- Statik foundation/seed/security testi: 41/41 PASS.
- JavaScript syntax: PASS.
- Foundation ve iki hardening migration'ı `ototr-staging` Supabase projesine uygulandı.
- Canlı seed doğrulaması: 1 template, 11 kategori ve 100 task PASS.
- Canlı güvenlik doğrulaması: 14/14 tabloda RLS, anon tablo/RPC erişimi kapalı, private evidence bucket PASS.
- Canlı Realtime doğrulaması: 6/6 gerekli tablo publication içinde PASS.
- Supabase Advisor: V2 foreign-key index ve çakışan policy uyarıları giderildi. Public V2 RPC'lerin authenticated `SECURITY DEFINER` uyarıları bilinçli; fonksiyonlar sabit `search_path`, dahili rol/şube kontrolü ve anon/PUBLIC execute revoke ile korunuyor.
- Rollback'li canlı transaction: template'ten 1 proje, 11 kategori, 100 task; multiple assignee, checklist, comment, attachment ve activity log PASS.
- Rollback'li business-rule/RLS testi: evidence gate, approval gate, approve, reject, cross-branch read/update izolasyonu, HQ erişimi ve stale-update reddi PASS.
- Canlı testte bulunan generic child activity trigger alan erişim hatası ayrı migration ile düzeltildi ve aynı test tekrar geçirilerek doğrulandı.
- `tests/task-center-v2-integration.sql` izole Supabase ortamında çalıştırılmak üzere hazırlandı.

## Faz 2 giriş kriterleri

1. RLS testleri iki branch + HQ test kullanıcısıyla gerçek JWT altında genişletilmeli.
2. Storage upload + metadata telafi akışı entegre edilmelidir.
3. Ardından proje/task UI ve Realtime state reconciliation geliştirilebilir.
