create table public.google_review_goal_plans (
  connection_id text not null references public.google_business_connections(id),
  scope_key text not null,
  month date not null,
  version integer not null check (version > 0),
  status text not null check (status in ('draft','regional','pending','approved','revision')),
  draft jsonb not null,
  approved jsonb,
  history jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (connection_id, scope_key, month),
  check (extract(day from month) = 1)
);
alter table public.google_review_goal_plans enable row level security;
revoke all on public.google_review_goal_plans from public, anon, authenticated;
grant select, insert, update on public.google_review_goal_plans to service_role;
