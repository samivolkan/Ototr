# Franchise Staging Çalıştırma Rehberi

Bu rehber yalnız hosted staging Supabase projesi içindir. Üretimde kullanıcı onayı ve rollout kararı olmadan çalıştırılmaz.

## 1. Migration

1. Staging yedeğini ve migration listesini kaydet.
2. `20261105010000`–`20261105120000` arasındaki on iki Franchise migration'ını dosya adı sırasıyla staging'e uygula.
3. `franchise-staging-verify.sql` içindeki bütün sorguların `true` döndürdüğünü kanıt olarak kaydet.
4. `franchise-activation-acceptance.sql` sonucunun `PASS` olduğunu kaydet.
5. `franchise-provider-acceptance.sql` içindeki üç kontrolün `true` olduğunu kaydet.
6. `franchise-rbac-acceptance.sql` ile Finans kullanıcısının yalnız Finans görevini gördüğünü, Hukuk görevini güncelleyemediğini ve görev kapsamının değiştirilemediğini kaydet.
7. `franchise-staffing-acceptance.sql` ile eksik zorunlu rolde şube açılışının reddedildiğini ve İK/Academy/BT alan sahipliğini kaydet.
8. `franchise-opening-evidence-acceptance.sql` ile tahsilat, sözleşme, saha ziyareti ve ruhsat kanıtlarının maker–checker onaylarını kaydet.
9. `franchise-record-gates-acceptance.sql` ile geri çekilmiş izin ve eksik/süresi geçmiş belgenin şube açılışını durdurduğunu kaydet.
10. `franchise-lifecycle-acceptance.sql` ile yanlış rol, aşama atlama ve manuel geçmiş yazımının reddedildiğini kaydet.
11. Aktivasyon kabulünde 30. gün görevinin Operasyon kanıtıyla kapatıldığını ve maker–checker ile yeniden açıldığını kaydet.
12. `franchise-scoring-acceptance.sql` ile yedi boyutlu skor, eşik önerisi ve bağımsız kurul kararını doğrula.
13. `franchise-integration-contract-acceptance.sql` ile 31 sürümlü departman olay sözleşmesini, alan minimizasyonunu ve hassas veri reddini doğrula.
14. `franchise-external-portal-acceptance.sql` ile aday, bayi, denetçi ve tedarikçi atama izolasyonunu ve çapraz erişim reddini doğrula.

## 2. Kimlik hook'u

Supabase Auth Hooks ekranında Custom Access Token Hook olarak `public.franchise_custom_access_token_hook` seçilir. Etkinleştirmeden önce:

- En az bir sentetik staging kullanıcısı `franchise_user_scopes` tablosuna eklenir.
- Token yenilenir; `app_metadata.franchise_role`, `franchise_branch_ids` ve `franchise_scope_version` doğrulanır.
- Mevcut ERP `app_metadata` alanlarının korunmuş olduğu doğrulanır.
- Scope pasif edildiğinde yeni token'dan franchise claim'lerinin kaldırıldığı doğrulanır.

## 3. Outbox worker

`franchise-outbox-worker` Edge Function deploy edilir. Aşağıdaki secrets yalnız staging değerleriyle tanımlanır:

- `FRANCHISE_WORKER_SECRET`
- `FRANCHISE_ADAPTER_ALLOWED_HOSTS`
- Departman bazlı `*_ADAPTER_URL` ve `*_ADAPTER_TOKEN`

Worker yalnız POST ve doğru `x-franchise-worker-secret` başlığıyla çağrılır. URL'ler HTTPS olmalı ve izin listesindeki alan adlarına gitmelidir.

`franchise-provider-worker` ayrıca deploy edilir. Kendi `FRANCHISE_PROVIDER_WORKER_SECRET` değeri departman worker secret'ından farklı olmalı; kanal bazlı URL/token secret'ları ve `FRANCHISE_PROVIDER_ALLOWED_HOSTS` yalnız staging sağlayıcı geçitlerini içermelidir. İşlenirken yarım kalan kayıtlar 15 dakika sonra lease-expired olarak geri alınır; 10 başarısız denemede dead-letter olur.

Supabase HTTP API'lerinde eski TLS 1.2 cipher kümelerinin 10 Kasım 2026'dan itibaren kaldırılacağı duyuruldu. Seçilecek sağlayıcı geçitlerinin modern TLS yapılandırması staging ağ testinde doğrulanmalı; eski cipher bağımlılığı G09'u kapalı tutar.

## 4. Zorunlu staging senaryoları

- Eksik belge, ödeme, 36 görev, personel veya sertifikada aktivasyon reddi
- Maker kendi istisnasını onaylamaya çalıştığında ret
- Aynı aktivasyonun iki eşzamanlı çağrıda yalnız bir şube üretmesi
- Adaptör 503 döndürdüğünde retry; 10. denemede dead-letter
- Storage aday/GM/departman erişim ayrımı
- Pasif kullanıcı ve yanlış şube kapsamıyla RLS reddi
- Rollback sonrası franchise tabloları ve bucket'ın kaldırılması
- Geri çekilmiş ticari ileti izniyle SMS/WhatsApp/e-posta talebinin reddi
- Onaysız veya eski şablon sürümüyle gönderim talebinin reddi
- Aynı sağlayıcı idempotency anahtarının yalnız bir talep üretmesi

## 5. Kanıt ve karar

Her senaryo için sorgu çıktısı, zaman, commit SHA ve testi yapan rol kaydedilir. Tüm sonuçlar geçmeden G05–G10 kapıları `PASS` yapılmaz ve UAT başlatılmaz. Nihai karar `gm-franchise/preproduction-decision.json` içinde kimlik ve kanıt SHA-256 alanları dolmadan `GO` olamaz.
