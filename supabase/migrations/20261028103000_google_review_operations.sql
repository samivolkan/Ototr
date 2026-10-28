create table if not exists public.google_review_operations (
  connection_id text not null references public.google_business_connections(id) on delete cascade,
  review_id text not null,
  branch_id text not null,
  status text not null default 'new' check (status in ('new','reviewing','reply_waiting','branch_action','resolved','follow_up')),
  version integer not null default 1 check (version > 0),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (connection_id, review_id)
);
alter table public.google_review_operations enable row level security;
revoke all on public.google_review_operations from public, anon, authenticated;
grant select, insert, update on public.google_review_operations to service_role;
comment on table public.google_review_operations is 'Internal HQ follow-up status for Google reviews; separate from Google reply state.';
