# Task Center V2 Architecture

Task Center V2 mevcut Task Merkezi’nden bağımsızdır. Backend Supabase Auth + PostgreSQL RLS, frontend ise ince bir data-access katmanı kullanır.

```mermaid
erDiagram
  TASK_ORGANIZATIONS ||--o{ TASK_ORGANIZATION_BRANCHES : contains
  BRANCHES ||--o{ TASK_ORGANIZATION_BRANCHES : maps
  TASK_ORGANIZATIONS ||--o{ TASK_PROJECTS : owns
  BRANCHES ||--o{ TASK_PROJECTS : scopes
  TASK_PROJECTS ||--o{ TASK_CATEGORIES : groups
  TASK_CATEGORIES ||--o{ TASK_TASKS : contains
  TASK_TASKS ||--o{ TASK_TASKS : parent_of
  TASK_TASKS ||--o{ TASK_ASSIGNEES : assigned
  APP_USERS ||--o{ TASK_ASSIGNEES : receives
  TASK_TASKS ||--o{ TASK_CHECKLIST_ITEMS : checks
  TASK_TASKS ||--o{ TASK_COMMENTS : discusses
  TASK_TASKS ||--o{ TASK_ATTACHMENTS : evidences
  TASK_TASKS ||--o{ TASK_ACTIVITY_LOGS : audits
  TASK_TASKS ||--o{ TASK_APPROVALS : approves
  TASK_TEMPLATES ||--o{ TASK_TEMPLATE_CATEGORIES : groups
  TASK_TEMPLATE_CATEGORIES ||--o{ TASK_TEMPLATE_TASKS : contains
```

## Güven sınırları

- Browser yalnızca publishable/anon key kullanır; service-role key istemciye konmaz.
- Auth zorunludur. Her business kaydı `auth.uid()` üzerinden `app_users` kaydına bağlanır.
- Cross-branch erişim RLS ile engellenir.
- Evidence ve approval geçişleri trigger/RPC seviyesinde korunur.
- Activity log UI’dan update/delete edilemez.
- Project/category/task silme fiziksel delete değil `archived_at` güncellemesidir.
- `create_task_project_from_template` tek transaction içinde proje, kategori ve taskları üretir.
- `update_task_with_version` istemcinin `expected_updated_at` değeri eskiyse `40001` ile reddeder.

## Storage sözleşmesi

- Bucket: `task-evidence` (private)
- Object path: `<project_uuid>/<task_uuid>/<generated-file-name>`
- Metadata önce `task_attachments` tablosuna yazılır; object ve metadata tutarlılığı servis katmanında telafi işlemiyle korunur.
