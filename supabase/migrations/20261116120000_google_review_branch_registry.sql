create table if not exists public.google_review_branch_registry (
 id text primary key check (id ~ '^branch-custom-[A-Za-z0-9-]{8,80}$'),
 connection_id text not null references public.google_business_connections(id),
 name text not null check (length(name) between 2 and 160),
 city text not null check (length(city) between 2 and 80),
 region text not null check (length(region) between 2 and 80),
 account_id text check (account_id is null or account_id ~ '^[0-9]{1,32}$'),
 store_code text check (store_code is null or store_code ~ '^[0-9]{1,64}$'),
 location_id text check (location_id is null or location_id ~ '^[0-9]{1,32}$'),
 mode text not null default 'demo' check (mode in ('demo','live_candidate')),
 interval_minutes integer not null default 60 check (interval_minutes between 5 and 1440),
 sla_hours integer not null default 24 check (sla_hours between 1 and 168),
 target integer not null default 30 check (target between 1 and 10000),
 active boolean not null default true,
 created_by uuid not null references auth.users(id),
 updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.google_review_branch_registry enable row level security;
revoke all on public.google_review_branch_registry from public, anon, authenticated;
grant select, insert, update on public.google_review_branch_registry to service_role;
