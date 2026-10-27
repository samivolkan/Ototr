-- Only the Edge Function service role can access this table. It authorizes every
-- operation against google_business_connections.connected_by / server allowlist.
create table public.google_review_work_items (
  id uuid primary key default gen_random_uuid(),
  connection_id text not null references public.google_business_connections(id),
  account_id text not null check (account_id ~ '^[0-9]+$'),
  location_id text not null check (location_id ~ '^[0-9]+$'),
  review_id text not null check (char_length(review_id) between 1 and 512),
  branch_id text not null,
  branch_name text not null,
  kind text not null check (kind in ('reply', 'branch', 'complaint', 'legal', 'quality', 'crisis')),
  review_snapshot jsonb not null default '{}'::jsonb,
  expected_reply text not null default '',
  reply_text text not null default '' check (char_length(reply_text) <= 4000),
  draft_source text not null default 'manual' check (draft_source in ('openai', 'local_template', 'manual')),
  status text not null,
  note text not null default '' check (char_length(note) <= 2000),
  version integer not null default 1 check (version > 0),
  attempt_id uuid,
  last_error text,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  published_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_review_work_identity unique (connection_id, location_id, review_id, kind),
  constraint google_review_work_status check (
    (kind = 'reply' and status in ('approval_pending', 'publishing', 'published', 'publish_failed', 'publish_unknown') and char_length(reply_text) > 0)
    or (kind <> 'reply' and status in ('open', 'done'))
  ),
  constraint google_review_published_approval check (
    status <> 'published' or (approved_by is not null and approved_at is not null and published_at is not null)
  )
);

create index google_review_work_created_idx on public.google_review_work_items (connection_id, created_at desc, id desc);
create index google_review_work_created_by_idx on public.google_review_work_items (created_by);
create index google_review_work_updated_by_idx on public.google_review_work_items (updated_by);
create index google_review_work_approved_by_idx on public.google_review_work_items (approved_by);
alter table public.google_review_work_items enable row level security;
revoke all on public.google_review_work_items from public, anon, authenticated;
grant select, insert, update on public.google_review_work_items to service_role;
comment on table public.google_review_work_items is 'OTOTR central Google review approvals and branch tasks. No browser-level access. Publication uses version and attempt_id compare-and-set.';
