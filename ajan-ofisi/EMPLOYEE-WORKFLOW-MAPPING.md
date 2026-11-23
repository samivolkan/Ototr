# Çalışan ve ekspertiz görev bağlantısı

Doğrulama: 24 Kasım 2026, Türkiye saati. İnceleme yalnız şema ve fonksiyon tanımlarını okudu; müşteri, araç veya çalışan kayıtları okunmadı/değiştirilmedi.

## Bulgu ve kanıt

Mevcut sistemde tek bir görev kaynağı yok. Genel görevler, İşler v24 ve ekspertiz istasyon işleri ayrı sözleşmeler kullanıyor. Bunları aynı işmiş gibi birleştirmek yanlış sahiplik ve tamamlanma sonucu üretir.

| Kaynak | Doğrulanan alanlar | Takip anlamı / boşluk |
|---|---|---|
| public.task_tasks | status, due_at, requires_approval, requires_evidence, completed_by, completed_at | Genel görev; todo/doing/review/done/cancelled. Explicit çalışan kabul alanı yok |
| public.task_assignees | task_id, user_id, assigned_by, assigned_at | Birden fazla atama olabilir; tek sorumluyu keyfi seçme |
| public.task_approvals | requested_by/at, reviewed_by/at, status | İnceleyen ve karar kayıtlı; onayla teslim kanıtı ayrı |
| public.task_attachments | attachment_type, storage_path, deleted_at | Dosya kaydı tek başına kanıt içeriğinin doğruluğu değildir |
| app_private.isler24_tasks | scope, creator_id, data, version, completion | JSON tabanlı ayrı iş kaynağı; task_tasks ile eşdeğer varsayma |
| public.inspection_tasks | owner_user_id, claimed_at, status, revision_no, ownership_history, audit_log | Ustanın sahiplenmesi için mevcut kayıtlar var; teknik bulguları ajan okumaz/değiştirmez |
| public.work_order_group_status | total_items, answered_items, completed_items, progress_percent | İstasyon ilerlemesi; yüzde 100 rapor teslimi değildir |
| public.expertise_cases | branch_id, work_order_no, revision_no, report_approved_at, delivered_at, is_locked | İş emri ve aşama zamanları mevcut; delivered_at tek başına teslim edilen sürümü kanıtlamaz |
| public.final_reports | expertise_case_id, revision_no, status, locked_by/at | Rapor sürümü var; baskı ve sunum kanıtı ayrı doğrulanmalı |

Kod kanıtları: `../assets/app-core.js:6971` mevcut olay tablolarını listeler; `:7481` istasyon görevlerini iş emriyle okur. `../supabase/migrations/20260817142152_task_center_v2_foundation.sql:61-74` görev alanları, `:79-85` atamalar, `:267-274` koşullu kanıt/onay kapısı. `../supabase/migrations/20261018214909_isler24_user_selection.sql:82-83` kapsam bazlı v24 okuması. Canlı information_schema alanları yukarıdaki eşlemeyi doğruladı; kod kanıtı tüm fonksiyonların bugünkü sürümü kabul edilmez.

## Öneri

Her adaptör kaynak türü + kaynak kimliği + şube + kaynak sürümünü korusun. Kabul/sahiplik bilgisi olmayan kaynakta “atanmış, kabul kanıtı yok” gösterilsin. İki atama varsa “sorumlu eşlemesi gerekiyor” olsun. Tamamlanma durumu kaynakta varsa yalnız “kaynakta tamamlandı” olarak aktarılmalı; bağımsız denetim yapılmış sayılmamalı. Yeni görev tablosu açılmasın ve mevcut kayıtlar kopyalanmasın.

Risk: yetki / veri. Efor: önce salt okunur tek kaynak adaptörü ve sentetik yetki testleri; tüm kaynaklar için güvenilir süre henüz yok. Sami kararı: ilk gerçek pilot şube ve insan süreç sorumlusu; çalışan veya parasal politika kararı bu dokümanla alınmaz.

## Açık kapılar

- Görev sahiplenme yoluna şube sınırı eklendi ve izole SQL ile doğrulandı. Diğer ekspertiz yazma yollarının şube sınırı ve boş sahip durumları ayrıca incelenmeli. Ajanlar bu RPC'leri çağırmaz; yetkileri genişletilmedi.
- Gerçek kaynağın hangi şubede kullanıldığı, aktif vardiya ve izin verisinin yetkili kaynağı doğrulanmadı.
- Baskı başarısı, sunum bitişi, teslim edilen sürüm, sorgu sağlayıcısı ve iletişim uygunluğu henüz eşlenmedi.
- Canlı kişi takibi, uyarı gönderimi veya performans puanı bu eşleme ile açılmadı.

## Test edilen demo

`inspection-demo-model.mjs` yalnız bellekte çalışır. Hatalı sorgu rapor kapısını kapatır; usta adımları paralel tamamlanabilir. Baskı ve sunum olmadan teslim yoktur. Eski rapor sürümü reddedilir; yeniden açılan raporda baskı/sunum/teslim teyitleri geçersizleşir. Mükerrer olay, yanlış şube, canlı mod, eski sürüm ve iptal sonrası ilerleme reddedilir. Dış çağrı yoktur.
