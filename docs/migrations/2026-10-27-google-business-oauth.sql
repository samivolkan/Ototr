create table if not exists public.google_business_connections (
  id text primary key,
  connected_by uuid not null references auth.users(id) on delete restrict,
  refresh_token_encrypted text not null,
  scope text not null default '',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_business_connections enable row level security;
revoke all on table public.google_business_connections from anon, authenticated;
comment on table public.google_business_connections is 'Encrypted Google Business Profile OAuth refresh tokens; service-role only.';
