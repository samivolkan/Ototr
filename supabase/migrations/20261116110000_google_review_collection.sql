create table if not exists public.google_review_collection_policies (
  connection_id text primary key references public.google_business_connections(id) on delete cascade,
  branch_id text not null,
  enabled boolean not null default false,
  send_hour smallint not null default 18 check (send_hour between 0 and 23),
  delay_minutes integer not null default 120 check (delay_minutes between 0 and 10080),
  channel text not null default 'sms' check (channel in ('sms','whatsapp','email')),
  template text not null default 'Merhaba {{musteri_adi}}, hizmet deneyiminizi değerlendirmek ister misiniz? {{yorum_linki}}',
  cooldown_days integer not null default 30 check (cooldown_days between 1 and 365),
  updated_by uuid,
  updated_at timestamptz not null default now()
);
create table if not exists public.google_review_collection_outbox (
  id uuid primary key default gen_random_uuid(), connection_id text not null references public.google_business_connections(id) on delete cascade,
  branch_id text not null, service_id text not null, customer_name text, recipient text not null,
  channel text not null check (channel in ('sms','whatsapp','email')), scheduled_at timestamptz not null,
  status text not null default 'queued' check (status in ('queued','sent','failed','skipped','dry_run')),
  reason text, sent_at timestamptz, created_at timestamptz not null default now(), unique(connection_id, service_id)
);
create index if not exists google_review_collection_due_idx on public.google_review_collection_outbox(connection_id,status,scheduled_at);
alter table public.google_review_collection_policies enable row level security;
alter table public.google_review_collection_outbox enable row level security;
revoke all on public.google_review_collection_policies from anon, authenticated;
revoke all on public.google_review_collection_outbox from anon, authenticated;
