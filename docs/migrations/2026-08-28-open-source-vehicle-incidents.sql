-- OtoTR Açık Kaynak Araç Olay Merkezi
-- Üretim hedef şeması. Plaka düz metin olarak tutulmaz.
-- plate_lookup_hash ve plate_ciphertext uygulama sunucusunda oluşturulmalıdır.

begin;

create extension if not exists pgcrypto;

create table if not exists public.open_source_scan_rules (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid null,
  name text not null check (char_length(name) between 1 and 120),
  query_terms jsonb not null default '[]'::jsonb,
  excluded_terms jsonb not null default '[]'::jsonb,
  locations jsonb not null default '[]'::jsonb,
  compiled_query text not null check (char_length(compiled_query) <= 1024),
  search_mode text not null default 'recent' check (search_mode in ('recent', 'full_archive')),
  media_type text not null default 'image' check (media_type in ('image')),
  start_time timestamptz null,
  end_time timestamptz null,
  interval_minutes integer not null default 60 check (interval_minutes between 15 and 1440),
  max_posts integer not null default 100 check (max_posts between 10 and 1000),
  is_active boolean not null default false,
  last_run_at timestamptz null,
  next_run_at timestamptz null,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_time is null or end_time is null or start_time < end_time)
);

create table if not exists public.open_source_scan_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.open_source_scan_rules(id) on delete cascade,
  trigger_type text not null check (trigger_type in ('manual', 'scheduled')),
  status text not null check (status in ('running', 'completed', 'completed_with_errors', 'failed')),
  posts_scanned integer not null default 0,
  media_scanned integer not null default 0,
  candidates_created integer not null default 0,
  duplicates_skipped integer not null default 0,
  error_count integer not null default 0,
  error_summary jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz null
);

create table if not exists public.open_source_incident_candidates (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid null references public.open_source_scan_rules(id) on delete set null,
  source_platform text not null default 'X' check (source_platform in ('X')),
  source_post_id text not null,
  source_media_key text not null,
  source_url text null,
  source_available boolean not null default true,
  source_checked_at timestamptz null,
  source_posted_at timestamptz null,
  source_author_id text null,
  media_type text not null default 'photo' check (media_type in ('photo')),
  media_url text null,
  media_persisted boolean not null default false,
  media_storage_path text null,
  ocr_confidence numeric(5,2) null check (ocr_confidence between 0 and 100),
  ocr_low_confidence boolean not null default false,
  -- HMAC-SHA256(normalized_plate, server_secret), hex encoded.
  plate_lookup_hash text not null check (char_length(plate_lookup_hash) = 64),
  -- AES-GCM veya eşdeğeri ile uygulama tarafında şifrelenmiş biçimlendirilmiş plaka.
  plate_ciphertext text not null,
  status text not null default 'review_pending' check (
    status in ('review_pending', 'approved_internal', 'approved_customer', 'rejected', 'source_removed')
  ),
  review_payload jsonb null,
  reviewed_by uuid null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_platform, source_post_id, source_media_key),
  check ((status = 'source_removed') = (source_available = false))
);

create table if not exists public.open_source_incident_audit (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid null references public.open_source_incident_candidates(id) on delete set null,
  action_type text not null,
  actor_user_id uuid null,
  actor_label text null,
  old_status text null,
  new_status text null,
  detail jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_os_scan_rules_due
  on public.open_source_scan_rules (is_active, next_run_at)
  where is_active = true;

create index if not exists idx_os_scan_runs_rule_started
  on public.open_source_scan_runs (rule_id, started_at desc);

create index if not exists idx_os_candidates_plate_status
  on public.open_source_incident_candidates (plate_lookup_hash, status)
  where source_available = true;

create index if not exists idx_os_candidates_source_check
  on public.open_source_incident_candidates (source_checked_at nulls first)
  where status in ('review_pending', 'approved_internal', 'approved_customer');

create index if not exists idx_os_audit_candidate_time
  on public.open_source_incident_audit (candidate_id, occurred_at desc);

alter table public.open_source_scan_rules enable row level security;
alter table public.open_source_scan_runs enable row level security;
alter table public.open_source_incident_candidates enable row level security;
alter table public.open_source_incident_audit enable row level security;

-- Bu tablolar doğrudan tarayıcıdan okunmaz. Yalnız güvenilir backend/service_role kullanır.
revoke all on public.open_source_scan_rules from anon, authenticated;
revoke all on public.open_source_scan_runs from anon, authenticated;
revoke all on public.open_source_incident_candidates from anon, authenticated;
revoke all on public.open_source_incident_audit from anon, authenticated;

-- RLS açık ve son kullanıcı politikası yoktur: anon/authenticated için varsayılan reddetme.
-- Supabase service_role RLS'yi bypass ederek sunucu API'sini işletir.

create or replace function public.lookup_open_source_vehicle_incidents(
  p_plate_lookup_hash text,
  p_audience text default 'technician'
)
returns setof public.open_source_incident_candidates
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select candidate.*
  from public.open_source_incident_candidates candidate
  where candidate.plate_lookup_hash = p_plate_lookup_hash
    and candidate.source_available = true
    and (
      (p_audience = 'customer' and candidate.status = 'approved_customer')
      or
      (p_audience <> 'customer' and candidate.status in ('approved_internal', 'approved_customer'))
    )
  order by candidate.source_posted_at desc nulls last, candidate.created_at desc;
$$;

revoke all on function public.lookup_open_source_vehicle_incidents(text, text) from public, anon, authenticated;
grant execute on function public.lookup_open_source_vehicle_incidents(text, text) to service_role;

comment on table public.open_source_incident_candidates is
  'Kamuya açık kaynakta bulunan, OCR ve insan moderasyonu ile araç plakasına bağlanan olay adayları. Resmî hasar kaydı değildir.';
comment on column public.open_source_incident_candidates.plate_lookup_hash is
  'Normalize plakanın sunucu sırrıyla HMAC-SHA256 özeti; düz metin plaka indeksi değildir.';
comment on column public.open_source_incident_candidates.plate_ciphertext is
  'Biçimlendirilmiş plakanın uygulama sunucusunda şifrelenmiş değeri.';

commit;
