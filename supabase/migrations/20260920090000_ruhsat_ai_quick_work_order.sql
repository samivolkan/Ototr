-- Ruhsat AI quick work order. Additive migration; do not run on production
-- without explicit release approval.

create extension if not exists pgcrypto;
create schema if not exists app_private;

alter table public.vehicles
  add column if not exists engine_number text,
  add column if not exists commercial_name text,
  add column if not exists vehicle_type text,
  add column if not exists variant text,
  add column if not exists version text,
  add column if not exists color text,
  add column if not exists first_registration_date date,
  add column if not exists registration_date date;

alter table public.expertise_cases
  add column if not exists intake_source text not null default 'MANUAL',
  add column if not exists registration_scan_id uuid,
  add column if not exists short_order_completed_at timestamptz,
  add column if not exists long_order_completed_at timestamptz;

alter table public.expertise_cases
  drop constraint if exists expertise_cases_intake_source_check;

alter table public.expertise_cases
  add constraint expertise_cases_intake_source_check
  check (intake_source in ('MANUAL','REGISTRATION_AI','REGISTRATION_OCR_MANUAL'));

alter table public.expertise_cases
  alter column customer_id drop not null;

create table if not exists public.registration_scan_sessions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  created_by uuid not null references public.app_users(id),
  document_type text not null default 'UNKNOWN'
    check (document_type in ('MODERN_REGISTRATION','OLD_REGISTRATION','TEMPORARY_REGISTRATION','UNKNOWN')),
  status text not null default 'SCANNED'
    check (status in ('SCANNED','EXTRACTED','REVIEWED','QUICK_ORDER_CREATED','FAILED','CANCELLED')),
  image_sha256 text,
  extraction_json jsonb not null default '{}'::jsonb,
  confidence_json jsonb not null default '{}'::jsonb,
  extractor_version text,
  ocr_engine_version text,
  model_name text,
  prompt_version text,
  needs_rescan boolean not null default false,
  idempotency_key text,
  work_order_id uuid references public.expertise_cases(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create unique index if not exists idx_registration_scan_idempotency
  on public.registration_scan_sessions(branch_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists idx_registration_scan_sessions_branch
  on public.registration_scan_sessions(branch_id, created_at desc);

create table if not exists public.registration_scan_corrections (
  id uuid primary key default gen_random_uuid(),
  scan_session_id uuid not null references public.registration_scan_sessions(id) on delete cascade,
  field_key text not null,
  predicted_value text,
  corrected_value text,
  predicted_confidence text,
  error_code text not null default 'UNKNOWN'
    check (error_code in (
      'CAPTURE_BLUR','CAPTURE_GLARE','CAPTURE_CROP','CAPTURE_ROTATION',
      'OCR_CHAR_CONFUSION','OCR_MISSED_TEXT','LABEL_VALUE_ASSOCIATION',
      'DOCUMENT_TYPE_MISCLASSIFIED','MODEL_HALLUCINATION','NORMALIZATION_ERROR',
      'VIN_VALIDATION_ERROR','ENGINE_NUMBER_ERROR','PLATE_ERROR',
      'MODEL_YEAR_DATE_CONFUSION','BRAND_MODEL_SWAP','BACKEND_MAPPING_ERROR',
      'DUPLICATE_WORK_ORDER','WRONG_PACKAGE_MAPPING','PII_LEAK_RISK','UNKNOWN'
    )),
  verified_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now()
);

alter table public.registration_scan_sessions enable row level security;
alter table public.registration_scan_corrections enable row level security;

drop policy if exists registration_scan_sessions_branch_access on public.registration_scan_sessions;
create policy registration_scan_sessions_branch_access
on public.registration_scan_sessions
for select to authenticated
using (app_private.current_user_can_access_branch(branch_id));

drop policy if exists registration_scan_corrections_branch_access on public.registration_scan_corrections;
create policy registration_scan_corrections_branch_access
on public.registration_scan_corrections
for select to authenticated
using (
  exists (
    select 1
    from public.registration_scan_sessions s
    where s.id = scan_session_id
      and app_private.current_user_can_access_branch(s.branch_id)
  )
);

insert into storage.buckets(id, name, public)
values ('registration-scans', 'registration-scans', false)
on conflict(id) do update set public = false;

create or replace function app_private.registration_scan_storage_branch_id(object_name text)
returns uuid
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when split_part(object_name, '/', 1) = 'branch'
     and split_part(object_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then split_part(object_name, '/', 2)::uuid
  end
$$;

revoke all on function app_private.registration_scan_storage_branch_id(text) from public, anon;
grant execute on function app_private.registration_scan_storage_branch_id(text) to authenticated;

drop policy if exists registration_scans_read on storage.objects;
create policy registration_scans_read on storage.objects
for select to authenticated
using (
  bucket_id = 'registration-scans'
  and app_private.current_user_can_access_branch(app_private.registration_scan_storage_branch_id(name))
);

drop policy if exists registration_scans_insert on storage.objects;
create policy registration_scans_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'registration-scans'
  and app_private.current_user_can_access_branch(app_private.registration_scan_storage_branch_id(name))
);

create or replace function app_private.create_quick_work_order_from_registration(
  p_registration_scan_id uuid,
  p_idempotency_key text,
  p_vehicle_plate text,
  p_vehicle_vin text,
  p_vehicle_engine_number text,
  p_vehicle_brand text,
  p_vehicle_model text,
  p_vehicle_year integer,
  p_vehicle_fuel_type text,
  p_package_type text,
  p_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  actor record;
  scan record;
  package_record record;
  new_vehicle_id uuid;
  new_case_id uuid;
  date_prefix text;
  next_sequence integer;
  task_record record;
begin
  select id, branch_id, role
    into actor
  from public.app_users
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1;

  if actor.id is null or actor.branch_id is null then
    raise exception 'Aktif sube kullanicisi bulunamadi.';
  end if;

  if actor.role not in ('BRANCH_MANAGER','RECEPTION_STAFF','CEO','GENERAL_MANAGER','QUALITY_AUDITOR') then
    raise exception 'Bu rol ruhsat ile hizli is emri acamaz.';
  end if;

  if p_idempotency_key is null or length(trim(p_idempotency_key)) < 8 then
    raise exception 'Idempotency key zorunludur.';
  end if;

  select *
    into scan
  from public.registration_scan_sessions
  where id = p_registration_scan_id
    and branch_id = actor.branch_id
  for update;

  if scan.id is null then
    insert into public.registration_scan_sessions(
      id, branch_id, created_by, document_type, status, idempotency_key
    )
    values (
      p_registration_scan_id, actor.branch_id, actor.id, 'UNKNOWN', 'REVIEWED', trim(p_idempotency_key)
    )
    returning * into scan;
  elsif scan.work_order_id is not null then
    return scan.work_order_id;
  elsif scan.idempotency_key is not null and scan.idempotency_key = trim(p_idempotency_key) then
    if scan.work_order_id is not null then
      return scan.work_order_id;
    end if;
  else
    update public.registration_scan_sessions
    set idempotency_key = trim(p_idempotency_key), status = 'REVIEWED'
    where id = scan.id;
  end if;

  select *
    into package_record
  from public.package_plans
  where code = upper(coalesce(p_package_type, 'HIZLI_KONTROL'))
    and is_active = true
  limit 1;

  if package_record.id is null then
    raise exception 'Paket bulunamadi: %', p_package_type;
  end if;

  insert into public.vehicles (
    customer_id,
    plate,
    vin,
    vin_normalized,
    engine_number,
    brand,
    model,
    commercial_name,
    model_year,
    fuel_type
  )
  values (
    null,
    upper(trim(p_vehicle_plate)),
    nullif(upper(trim(coalesce(p_vehicle_vin, ''))), ''),
    nullif(upper(trim(coalesce(p_vehicle_vin, ''))), ''),
    nullif(upper(trim(coalesce(p_vehicle_engine_number, ''))), ''),
    trim(p_vehicle_brand),
    trim(p_vehicle_model),
    nullif(trim(p_vehicle_model), ''),
    p_vehicle_year,
    nullif(trim(coalesce(p_vehicle_fuel_type, '')), '')
  )
  returning id into new_vehicle_id;

  date_prefix := 'OTOTR-' || to_char(now(), 'YYYYMMDD') || '-';
  select coalesce(max(nullif(replace(work_order_no, date_prefix, ''), '')::integer), 0) + 1
    into next_sequence
  from public.expertise_cases
  where work_order_no like date_prefix || '%'
    and replace(work_order_no, date_prefix, '') ~ '^[0-9]+$';

  insert into public.expertise_cases (
    branch_id,
    customer_id,
    vehicle_id,
    package_plan_id,
    work_order_no,
    status,
    risk_level,
    customer_summary,
    secretary_gate_ready,
    payment_gate_ready,
    kvkk_gate_ready,
    intake_source,
    p_registration_scan_id,
    short_order_completed_at,
    created_by,
    updated_by
  )
  values (
    actor.branch_id,
    null,
    new_vehicle_id,
    package_record.id,
    date_prefix || lpad(next_sequence::text, 4, '0'),
    'TECHNICAL_ENTRY_OPEN',
    'NONE',
    nullif(trim(coalesce(p_notes, '')), ''),
    false,
    false,
    false,
    'REGISTRATION_AI',
    p_registration_scan_id,
    now(),
    actor.id,
    actor.id
  )
  returning id into new_case_id;

  for task_record in
    select * from app_private.branch_work_order_task_specs(package_record.code)
  loop
    insert into public.inspection_tasks (
      expertise_case_id,
      task_key,
      title,
      assigned_role,
      assigned_user_id,
      status,
      report_field_key,
      required_fields,
      risky_findings,
      customer_friendly_note,
      manager_return_reason,
      revision_no,
      estimated_minutes
    )
    values (
      new_case_id,
      task_record.task_key,
      task_record.title,
      task_record.assigned_role,
      null,
      'AVAILABLE',
      task_record.report_field_key,
      '[]'::jsonb,
      '[]'::jsonb,
      '',
      '',
      1,
      task_record.estimated_minutes
    );
  end loop;

  update public.registration_scan_sessions
  set status = 'QUICK_ORDER_CREATED',
      work_order_id = new_case_id,
      completed_at = now()
  where id = p_registration_scan_id;

  return new_case_id;
exception
  when unique_violation then
    select work_order_id
      into new_case_id
    from public.registration_scan_sessions
    where branch_id = actor.branch_id
      and idempotency_key = trim(p_idempotency_key)
      and work_order_id is not null
    limit 1;
    if new_case_id is not null then
      return new_case_id;
    end if;
    raise;
end;
$$;

create or replace function public.create_quick_work_order_from_registration(
  registration_scan_id uuid,
  idempotency_key text,
  vehicle_plate text,
  vehicle_vin text,
  vehicle_engine_number text,
  vehicle_brand text,
  vehicle_model text,
  vehicle_year integer,
  vehicle_fuel_type text,
  package_type text,
  notes text
)
returns uuid
language sql
security invoker
set search_path = public, app_private, pg_temp
as $$
  select app_private.create_quick_work_order_from_registration(
    registration_scan_id,
    idempotency_key,
    vehicle_plate,
    vehicle_vin,
    vehicle_engine_number,
    vehicle_brand,
    vehicle_model,
    vehicle_year,
    vehicle_fuel_type,
    package_type,
    notes
  );
$$;

revoke all on function app_private.create_quick_work_order_from_registration(uuid,text,text,text,text,text,text,integer,text,text,text) from public, anon;
revoke all on function public.create_quick_work_order_from_registration(uuid,text,text,text,text,text,text,integer,text,text,text) from public, anon;
grant execute on function app_private.create_quick_work_order_from_registration(uuid,text,text,text,text,text,text,integer,text,text,text) to authenticated;
grant execute on function public.create_quick_work_order_from_registration(uuid,text,text,text,text,text,text,integer,text,text,text) to authenticated;

grant select, insert, update on public.registration_scan_sessions to authenticated;
grant select, insert on public.registration_scan_corrections to authenticated;

