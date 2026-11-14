-- OTOTR Google Yorum Merkezi: queue, audit and notification contracts.
-- The browser never receives direct access to these tables. Edge Functions use
-- the service role after validating the ERP session, branch scope and role.

create table if not exists public.google_review_audit_log (
  id bigint generated always as identity primary key,
  connection_id text not null references public.google_business_connections(id) on delete cascade,
  actor_id uuid references auth.users(id),
  actor_role text not null default 'unknown',
  action text not null,
  entity_type text not null,
  entity_id text not null,
  request_id text,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  detail text not null default '' check (char_length(detail) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists google_review_audit_connection_created_idx
  on public.google_review_audit_log (connection_id, created_at desc, id desc);
create index if not exists google_review_audit_entity_idx
  on public.google_review_audit_log (connection_id, entity_type, entity_id, created_at desc);
alter table public.google_review_audit_log enable row level security;
revoke all on public.google_review_audit_log from public, anon, authenticated;
grant select, insert on public.google_review_audit_log to service_role;
grant usage, select on sequence public.google_review_audit_log_id_seq to service_role;
comment on table public.google_review_audit_log is 'Immutable operational audit trail for OTOTR Google review approvals, routing and publication verification.';

create table if not exists public.google_review_bulk_jobs (
  id uuid primary key default gen_random_uuid(),
  connection_id text not null references public.google_business_connections(id) on delete cascade,
  job_type text not null check (job_type in ('route', 'approve', 'email')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'partial', 'failed', 'cancelled')),
  requested_by uuid not null references auth.users(id),
  idempotency_key text not null,
  total_count integer not null default 0 check (total_count >= 0),
  processed_count integer not null default 0 check (processed_count >= 0),
  success_count integer not null default 0 check (success_count >= 0),
  failure_count integer not null default 0 check (failure_count >= 0),
  progress jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  unique (connection_id, idempotency_key)
);
create index if not exists google_review_bulk_jobs_status_idx
  on public.google_review_bulk_jobs (connection_id, status, created_at desc);
alter table public.google_review_bulk_jobs enable row level security;
revoke all on public.google_review_bulk_jobs from public, anon, authenticated;
grant select, insert, update on public.google_review_bulk_jobs to service_role;

create table if not exists public.google_review_bulk_job_items (
  job_id uuid not null references public.google_review_bulk_jobs(id) on delete cascade,
  item_key text not null,
  work_item_id uuid references public.google_review_work_items(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (job_id, item_key)
);
create index if not exists google_review_bulk_job_items_status_idx
  on public.google_review_bulk_job_items (job_id, status, updated_at desc);
alter table public.google_review_bulk_job_items enable row level security;
revoke all on public.google_review_bulk_job_items from public, anon, authenticated;
grant select, insert, update on public.google_review_bulk_job_items to service_role;

create table if not exists public.google_review_email_outbox (
  id uuid primary key default gen_random_uuid(),
  connection_id text not null references public.google_business_connections(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  template_key text not null,
  template_version text not null default '1',
  to_addresses text[] not null default '{}',
  cc_addresses text[] not null default '{}',
  subject text not null,
  body text not null,
  preview_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  idempotency_key text not null,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (connection_id, idempotency_key)
);
create index if not exists google_review_email_outbox_status_idx
  on public.google_review_email_outbox (connection_id, status, created_at desc);
alter table public.google_review_email_outbox enable row level security;
revoke all on public.google_review_email_outbox from public, anon, authenticated;
grant select, insert, update on public.google_review_email_outbox to service_role;

create table if not exists public.google_review_policies (
  connection_id text primary key references public.google_business_connections(id) on delete cascade,
  approver_roles text[] not null default array['CEO', 'GENERAL_MANAGER', 'GOOGLE_REVIEW_ADMIN'],
  admin_user_ids uuid[] not null default '{}',
  auto_reply_enabled boolean not null default false,
  default_sla_hours integer not null default 24 check (default_sla_hours between 1 and 168),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
alter table public.google_review_policies enable row level security;
revoke all on public.google_review_policies from public, anon, authenticated;
grant select, insert, update on public.google_review_policies to service_role;
comment on table public.google_review_policies is 'Server-enforced Google review approval policy. AI drafts never publish without a human role allowed here.';
