# Task Center V2 Realtime

## Yayınlanan tablolar

`task_tasks`, `task_assignees`, `task_checklist_items`, `task_comments`, `task_attachments` ve `task_approvals` tabloları `supabase_realtime` publication’ına eklenir.

## Subscription modeli

UI önce RLS korumalı normal sorguyla project snapshot’ını alır. Sonra project ID filtresiyle task kanalına; task ID listesi üzerinden child kanallarına subscribe olur. Payload geldiğinde local state doğrudan körlemesine değiştirilmez: entity ID bazında merge edilir ve `updated_at` karşılaştırılır.

```text
project:<projectId>
  ├─ task_tasks project_id=eq.<projectId>
  ├─ task_assignees task_id=in.(...)
  ├─ task_checklist_items task_id=in.(...)
  ├─ task_comments task_id=in.(...)
  ├─ task_attachments task_id=in.(...)
  └─ task_approvals task_id=in.(...)
```

Channel kapanırken `removeChannel` çağrılır. Reconnect sonrası snapshot tekrar çekilir; Realtime olaylarının eksiksiz event log olduğu varsayılmaz. Mutation’lar optimistic UI kullanabilir, ancak RPC sonucu ve `updated_at` authoritative kabul edilir.

## Concurrency

Task düzenleme `update_task_with_version(task_id, expected_updated_at, patch)` RPC’sinden yapılır. Stale client güncellemesi reddedilir ve UI kullanıcıya son sürümü yeniden yükleme/merge seçeneği verir.
