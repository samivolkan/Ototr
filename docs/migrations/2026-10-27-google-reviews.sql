create table if not exists public.google_reviews (
  id text primary key,
  branch_id text not null,
  account_id text not null,
  location_id text not null,
  reviewer_name text,
  rating integer not null default 0,
  comment text not null default '',
  review_date timestamptz,
  reply text,
  replied_at timestamptz,
  synced_at timestamptz not null default now(),
  raw jsonb not null default '{}'::jsonb
);
create index if not exists google_reviews_branch_idx on public.google_reviews(branch_id, review_date desc);
alter table public.google_reviews enable row level security;
revoke all on table public.google_reviews from anon, authenticated;
