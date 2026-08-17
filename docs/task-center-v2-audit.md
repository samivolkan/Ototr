# Task Center V2 Audit

## İncelenen kapsam

- `docs/dealer-staff-task-management-plan.md`
- `docs/migrations/` altındaki 25 mevcut migration
- `lib/core/config/supabase_config.dart`
- `lib/data/repositories/app_repositories.dart`
- `src/dealer-portal-api-model.js`
- Mevcut `/task-merkezi/` seed ve veri modeli

## Yeniden kullanılacak yapılar

| Yapı | Karar |
|---|---|
| `auth.users` | Mevcut Supabase Auth aynen kullanılacak. |
| `public.app_users` | Kullanıcı profili, rol ve `auth_user_id` eşleşmesi için kullanılacak. |
| `public.branches` | Bayi/şube kaynağı olarak kullanılacak; duplicate branch tablosu oluşturulmayacak. |
| `app_private.current_user_is_hq()` | Merkez yetkisi için kullanılacak. |
| `app_private.current_user_can_access_branch()` | Şubeler arası izolasyon için kullanılacak. |
| `app_private.current_user_can_manage_branch()` | Şube yönetim mutation yetkisi için kullanılacak. |
| `public.set_updated_at()` | Ortak `updated_at` trigger fonksiyonu olarak kullanılacak. |

## Mevcut task yapılarının uygunluk analizi

- `dealer_staff_tasks` ve alt tablolar yalnızca plan/API modelinde geçiyor; repository migration’larında fiziksel tanımları yok.
- `inspection_tasks` ekspertiz vakasına bağlı, teknik istasyon durumları kullanan ve tek kullanıcı sahipliğine göre korunan farklı bir aggregate.
- `crm_tasks` CRM lead/opportunity/case akışına bağlı, tek atamalı ve proje/template/checklist/approval/evidence modelini karşılamıyor.
- Bu tabloları genişletmek mevcut operasyonları ve enum/trigger kurallarını riske atar. V2 için `task_*` namespace’i altında yeni domain tabloları oluşturmak duplicate değil, bounded-context ayrımıdır.

## Eksikler ve eklenen model

- Organization katmanı için fiziksel tablo yok. `task_organizations` ile `task_organization_branches` eklenecek; mevcut `branches` yeniden kullanılacak.
- Project, category, generic task, multiple assignee, approval ve template tabloları yok.
- Evidence gate, approval gate, optimistic concurrency ve transactional template instantiate RPC’leri yok.
- Task dosyaları için private `task-evidence` Storage bucket planı gerekli.

## Mevcut RLS yaklaşımı

Repo `app_private` içindeki sabit `search_path` kullanan `security definer` helper’lar ile branch isolation uyguluyor. Helper execute yetkileri `PUBLIC` ve `anon`dan geri alınmış. V2 politikaları aynı yaklaşımı kullanır; `TO authenticated` tek başına yetki sayılmaz, her policy project/branch predicate’i taşır.

## Riskler

1. Repository canlı Supabase project ref veya bağlantı bilgisi içermiyor; migration canlı DB’ye bu fazda uygulanamaz.
2. Production’da repository dışında oluşturulmuş aynı isimli tablolar varsa migration öncesi schema diff alınmalı.
3. `app_users.role` mevcut check constraint’i `BRANCH_OWNER`/`STAFF` adlarını içermiyor. V2 mevcut rollerle eşler; bu fazda role constraint destructive biçimde değiştirilmez.
4. Realtime publication ekleme işlemi platform ayarına bağlıdır; migration duplicate publication membership hatasını önleyecek şekilde guarded çalışır.
5. Storage object policy’leri path’in ilk segmentinde project UUID bekler; upload API bu sözleşmeyi korumalıdır.

## Önerilen rol eşlemesi

- Merkez: `CEO`, `GENERAL_MANAGER`, `QUALITY_AUDITOR`
- Bayi/şube yönetimi: `BRANCH_MANAGER`
- Operasyon personeli: aktif `app_users` kaydı olan diğer şube kullanıcıları

Yeni rol isimleri ancak ayrı bir auth/permission migration’ında, canlı rol verisi incelendikten sonra ele alınmalıdır.
