# Franchise Staging Çalıştırma Rehberi

Bu rehber yalnız hosted staging Supabase projesi içindir. Üretimde kullanıcı onayı ve rollout kararı olmadan çalıştırılmaz.

## 1. Migration

1. Staging yedeğini ve migration listesini kaydet.
2. `20261105010000_franchise_end_to_end.sql` migration'ını staging'e uygula.
3. `franchise-staging-verify.sql` içindeki bütün sorguların `true` döndürdüğünü kanıt olarak kaydet.
4. `franchise-activation-acceptance.sql` sonucunun `PASS` olduğunu kaydet.

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

## 4. Zorunlu staging senaryoları

- Eksik belge, ödeme, 36 görev, personel veya sertifikada aktivasyon reddi
- Maker kendi istisnasını onaylamaya çalıştığında ret
- Aynı aktivasyonun iki eşzamanlı çağrıda yalnız bir şube üretmesi
- Adaptör 503 döndürdüğünde retry; 10. denemede dead-letter
- Storage aday/GM/departman erişim ayrımı
- Pasif kullanıcı ve yanlış şube kapsamıyla RLS reddi
- Rollback sonrası franchise tabloları ve bucket'ın kaldırılması

## 5. Kanıt ve karar

Her senaryo için sorgu çıktısı, zaman, commit SHA ve testi yapan rol kaydedilir. Tüm sonuçlar geçmeden G05–G10 kapıları `PASS` yapılmaz ve UAT başlatılmaz.
