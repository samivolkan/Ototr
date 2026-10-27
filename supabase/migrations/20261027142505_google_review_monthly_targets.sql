create table public.google_review_targets (
  connection_id text not null references public.google_business_connections(id),
  branch_id text not null check (branch_id in ('branch-google-nilufer','branch-google-gebze')),
  month date not null check (extract(day from month)=1),
  target integer not null check (target between 1 and 10000),
  version integer not null default 1 check (version>0),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  primary key (connection_id,branch_id,month)
);
alter table public.google_review_targets enable row level security;
revoke all on public.google_review_targets from public, anon, authenticated;
grant select, insert, update on public.google_review_targets to service_role;
comment on table public.google_review_targets is 'HQ monthly review targets; only authorized google-business-oauth server actions may read or write.';
