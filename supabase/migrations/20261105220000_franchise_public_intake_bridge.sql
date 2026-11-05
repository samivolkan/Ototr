begin;

create table public.franchise_public_intake_bridge (
  source_application_id uuid primary key references public.public_franchise_applications(id) on delete restrict,
  status text not null check (status in ('rejected_missing_privacy','awaiting_processing_consent','ready_for_canonicalization','canonicalized','rejected')),
  reason_code text not null check (reason_code ~ '^[A-Z][A-Z0-9_]{2,63}$'),
  consent_version text,
  commercial_consent_declared boolean not null default false,
  canonical_case_id uuid unique references public.franchise_cases(id) on delete restrict,
  captured_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status='canonicalized')=(canonical_case_id is not null))
);

create index franchise_public_intake_bridge_status_idx
  on public.franchise_public_intake_bridge(status,captured_at);

alter table public.franchise_public_intake_bridge enable row level security;

create policy franchise_public_intake_bridge_select
on public.franchise_public_intake_bridge
for select to authenticated
using (public.franchise_claim_role()=any(array['gm','franchise_director','franchise_specialist','legal']));

create policy franchise_public_intake_bridge_update
on public.franchise_public_intake_bridge
for update to authenticated
using (public.franchise_claim_role()=any(array['gm','franchise_director','franchise_specialist','legal']))
with check (
  public.franchise_claim_role()=any(array['gm','franchise_director','franchise_specialist','legal'])
  and status<>'canonicalized'
  and canonical_case_id is null
);

revoke all on public.franchise_public_intake_bridge from anon;
grant select,update on public.franchise_public_intake_bridge to authenticated;

create or replace function public.franchise_capture_public_application()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  insert into public.franchise_public_intake_bridge(
    source_application_id,status,reason_code,consent_version,commercial_consent_declared
  ) values (
    new.id,
    case when new.kvkk_consent then 'awaiting_processing_consent' else 'rejected_missing_privacy' end,
    case when new.kvkk_consent then 'SEPARATE_PROCESSING_CONSENT_REQUIRED' else 'PRIVACY_NOTICE_NOT_ACCEPTED' end,
    nullif(trim(new.consent_version),''),
    new.contact_consent
  )
  on conflict(source_application_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.franchise_capture_public_application() from public,anon,authenticated;

create trigger franchise_public_application_capture_trigger
after insert on public.public_franchise_applications
for each row execute function public.franchise_capture_public_application();

comment on table public.franchise_public_intake_bridge is
'PII kopyalamadan public web başvurusunu kanonik Franchise intake öncesi ayrı izin yükseltme kuyruğuna alır.';

commit;
