create table if not exists public.franchise_consent_receipts (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete cascade,
  subject_id uuid not null,
  purpose text not null check (purpose in ('privacy_notice','data_processing','commercial_communication')),
  status text not null check (status in ('granted','withdrawn')),
  notice_version text not null,
  source text not null check (source in ('web','gm','crm','reference','social','call_center','portal')),
  captured_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  check ((status = 'withdrawn') = (withdrawn_at is not null))
);

create table if not exists public.franchise_message_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version integer not null check (version > 0),
  channel text not null check (channel in ('email','sms','whatsapp','esign')),
  purpose text not null check (purpose in ('application_status','appointment_reminder','commercial_message','contract_signature')),
  status text not null default 'draft' check (status in ('draft','approved','retired')),
  variables text[] not null default '{}',
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(code, version, channel),
  check ((status = 'approved') = (approved_by is not null and approved_at is not null))
);

create table if not exists public.franchise_provider_requests (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete cascade,
  consent_receipt_id uuid not null references public.franchise_consent_receipts(id),
  template_id uuid not null references public.franchise_message_templates(id),
  channel text not null check (channel in ('email','sms','whatsapp','esign')),
  purpose text not null check (purpose in ('application_status','appointment_reminder','commercial_message','contract_signature')),
  recipient_ref uuid not null,
  idempotency_key text not null unique,
  variables jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','processing','accepted','delivered','failed','dead_letter','cancelled')),
  attempt_count smallint not null default 0 check (attempt_count between 0 and 10),
  next_attempt_at timestamptz not null default now(),
  provider_message_id text,
  last_error_code text,
  requested_by uuid not null,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists franchise_consent_case_purpose_idx on public.franchise_consent_receipts(franchise_case_id, purpose, captured_at desc);
create index if not exists franchise_provider_pending_idx on public.franchise_provider_requests(status, next_attempt_at) where status in ('pending','failed');

alter table public.franchise_consent_receipts enable row level security;
alter table public.franchise_message_templates enable row level security;
alter table public.franchise_provider_requests enable row level security;

create or replace function public.franchise_claim_role()
returns text
language sql
stable
security invoker
set search_path = public, pg_temp
as $$ select coalesce((select auth.jwt() -> 'app_metadata' ->> 'franchise_role'), '') $$;

create or replace function public.franchise_can_access_case(p_case_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.franchise_cases c
    where c.id = p_case_id
      and (
        c.applicant_user_id = (select auth.uid())
        or public.franchise_claim_role() in ('gm','franchise_director','franchise_specialist','finance','legal','hr','academy','operations','it','quality','ohs','architecture')
      )
  )
$$;

revoke all on public.franchise_consent_receipts, public.franchise_message_templates, public.franchise_provider_requests from anon, authenticated;
grant select, insert on public.franchise_consent_receipts to authenticated;
grant select on public.franchise_message_templates to authenticated;
grant select, insert on public.franchise_provider_requests to authenticated;

create policy franchise_consent_select on public.franchise_consent_receipts for select to authenticated
using (public.franchise_can_access_case(franchise_case_id));
create policy franchise_consent_insert on public.franchise_consent_receipts for insert to authenticated
with check (public.franchise_can_access_case(franchise_case_id));

create policy franchise_template_select on public.franchise_message_templates for select to authenticated
using (status = 'approved' or public.franchise_claim_role() in ('gm','bt','hk'));

create policy franchise_provider_select on public.franchise_provider_requests for select to authenticated
using (public.franchise_can_access_case(franchise_case_id));
create policy franchise_provider_insert on public.franchise_provider_requests for insert to authenticated
with check (
  public.franchise_can_access_case(franchise_case_id)
  and requested_by = auth.uid()
  and status = 'pending'
  and attempt_count = 0
  and exists (
    select 1 from public.franchise_consent_receipts c
    where c.id = consent_receipt_id and c.franchise_case_id = franchise_provider_requests.franchise_case_id and c.status = 'granted'
  )
  and exists (
    select 1 from public.franchise_message_templates t
    where t.id = template_id and t.status = 'approved' and t.channel = franchise_provider_requests.channel and t.purpose = franchise_provider_requests.purpose
  )
);

grant all on public.franchise_consent_receipts, public.franchise_message_templates, public.franchise_provider_requests to service_role;
revoke all on function public.franchise_claim_role() from public, anon;
revoke all on function public.franchise_can_access_case(uuid) from public, anon;
grant execute on function public.franchise_claim_role() to authenticated, service_role;
grant execute on function public.franchise_can_access_case(uuid) to authenticated, service_role;

