-- OTOTR Flutter report backbone migration
-- Target: PostgreSQL / Supabase
-- Purpose: persistent data model for work orders, technician field input,
-- evidence, report gate issues, locked reports, revisions and audit logs.

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  city text not null,
  district text,
  region text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  branch_id uuid references branches(id),
  full_name text not null,
  email text unique,
  phone text,
  role text not null check (role in (
    'CEO',
    'GENERAL_MANAGER',
    'REGIONAL_MANAGER',
    'BRANCH_MANAGER',
    'INSPECTION_TECHNICIAN',
    'TECHNICAL_SUPERVISOR',
    'QUALITY_AUDITOR',
    'FINANCE',
    'LEGAL',
    'CRM_AGENT',
    'FRANCHISE_SALES'
  )),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  identity_number text,
  customer_role text,
  kvkk_consent boolean not null default false,
  service_consent boolean not null default false,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  plate text not null,
  vin text,
  vin_normalized text,
  brand text not null,
  model text not null,
  model_year int,
  fuel_type text,
  transmission text,
  mileage_km int,
  seller_type text,
  arrival_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists package_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  duration_minutes int,
  included_modules jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  customer_id uuid not null references customers(id),
  vehicle_id uuid not null references vehicles(id),
  package_plan_id uuid references package_plans(id),
  appointment_at timestamptz,
  source text,
  status text not null default 'SCHEDULED' check (status in (
    'SCHEDULED',
    'ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
    'NO_SHOW',
    'CANCELLED'
  )),
  assigned_user_id uuid references app_users(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists expertise_cases (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  appointment_id uuid references appointments(id),
  customer_id uuid not null references customers(id),
  vehicle_id uuid not null references vehicles(id),
  package_plan_id uuid references package_plans(id),
  work_order_no text not null unique,
  report_no text not null unique default (
    'OTOTR-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  verification_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'DRAFT' check (status in (
    'DRAFT',
    'ASSIGNED',
    'CLAIMED',
    'START_EVIDENCE_REQUIRED',
    'TECHNICAL_ENTRY_OPEN',
    'SUBMITTED',
    'MANAGER_REVIEW',
    'REPORT_GATE_BLOCKED',
    'REPORT_GATE_READY',
    'APPROVED',
    'DELIVERED',
    'REVISION_REQUESTED',
    'CANCELLED'
  )),
  risk_level text not null default 'NONE' check (risk_level in ('NONE','LOW','MEDIUM','HIGH','CRITICAL')),
  overall_result text,
  customer_summary text,
  report_quality_score int check (report_quality_score between 0 and 100),
  assigned_technician_id uuid references app_users(id),
  technical_supervisor_id uuid references app_users(id),
  manager_approved_by uuid references app_users(id),
  manager_approved_at timestamptz,
  secretary_gate_ready boolean not null default false,
  payment_gate_ready boolean not null default false,
  kvkk_gate_ready boolean not null default false,
  revision_no int not null default 1,
  is_locked boolean not null default false,
  opened_at timestamptz not null default now(),
  inspection_started_at timestamptz,
  inspection_completed_at timestamptz,
  report_approved_at timestamptz,
  delivered_at timestamptz,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists technician_start_evidence (
  id uuid primary key default gen_random_uuid(),
  expertise_case_id uuid not null unique references expertise_cases(id) on delete cascade,
  vin text not null default '',
  vin_photo_url text not null default '',
  plate_photo_url text not null default '',
  odometer_km int,
  odometer_photo_url text not null default '',
  captured_by uuid references app_users(id),
  captured_at timestamptz,
  device_id text,
  gps_approx text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inspection_tasks (
  id uuid primary key default gen_random_uuid(),
  expertise_case_id uuid not null references expertise_cases(id) on delete cascade,
  task_key text not null,
  title text not null,
  assigned_role text not null check (assigned_role in (
    'BODY_PAINT',
    'MECHANIC',
    'OBD',
    'TEST_OPERATOR',
    'FOREMAN',
    'BRANCH_MANAGER'
  )),
  assigned_user_id uuid references app_users(id),
  status text not null default 'LOCKED' check (status in (
    'ASSIGNED',
    'LOCKED',
    'OPEN',
    'COMPLETED',
    'EVIDENCE_MISSING',
    'MANAGER_RETURNED',
    'CONFLICT_DETECTED'
  )),
  report_field_key text not null,
  required_fields jsonb not null default '[]'::jsonb,
  risky_findings jsonb not null default '[]'::jsonb,
  customer_friendly_note text not null default '',
  manager_return_reason text not null default '',
  revision_no int not null default 1,
  estimated_minutes int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(expertise_case_id, task_key)
);

create table if not exists inspection_item_values (
  id uuid primary key default gen_random_uuid(),
  expertise_case_id uuid not null references expertise_cases(id) on delete cascade,
  task_id uuid not null references inspection_tasks(id) on delete cascade,
  item_key text not null,
  title text not null,
  result text not null default 'NORMAL' check (result in ('NORMAL','RISKY','NOT_DONE')),
  note text not null default '',
  not_done_reason text not null default '',
  report_field_key text not null,
  requires_evidence_on_risk boolean not null default false,
  severity int not null default 0,
  measured_value numeric,
  measured_unit text,
  device_serial_no text,
  created_by uuid references app_users(id),
  updated_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(expertise_case_id, task_id, item_key)
);

create table if not exists inspection_evidence_assets (
  id uuid primary key default gen_random_uuid(),
  expertise_case_id uuid not null references expertise_cases(id) on delete cascade,
  task_id uuid references inspection_tasks(id) on delete cascade,
  item_value_id uuid references inspection_item_values(id) on delete cascade,
  field_key text not null,
  report_field_key text not null,
  evidence_type text not null check (evidence_type in ('IMAGE','VIDEO','DEVICE_OUTPUT','SIGNATURE','DOCUMENT')),
  title text not null,
  local_path text,
  remote_url text,
  storage_path text,
  file_hash text,
  sync_status text not null default 'MISSING' check (sync_status in ('MISSING','LOCAL_ONLY','QUEUED','UPLOADED','REJECTED')),
  is_required boolean not null default false,
  quality_status text not null default 'UNCHECKED' check (quality_status in ('UNCHECKED','ACCEPTED','REJECTED')),
  rejection_reason text not null default '',
  captured_by uuid references app_users(id),
  captured_at timestamptz,
  uploaded_at timestamptz,
  device_id text,
  gps_lat numeric,
  gps_lng numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists external_query_results (
  id uuid primary key default gen_random_uuid(),
  expertise_case_id uuid not null references expertise_cases(id) on delete cascade,
  query_type text not null,
  source text not null,
  status text not null default 'PENDING' check (status in ('READY','PENDING','FAILED')),
  result_summary text not null default '',
  raw_payload jsonb,
  queried_at timestamptz,
  imported_to_report boolean not null default false,
  blocking_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists report_gate_issues (
  id uuid primary key default gen_random_uuid(),
  expertise_case_id uuid not null references expertise_cases(id) on delete cascade,
  issue_code text not null check (issue_code in (
    'START_EVIDENCE_MISSING',
    'TASK_INCOMPLETE',
    'TASK_MISSING_EVIDENCE',
    'TASK_RETURNED_BY_MANAGER',
    'RISKY_FINDING_NEEDS_NOTE',
    'RISKY_FINDING_NEEDS_EVIDENCE',
    'NOT_DONE_NEEDS_REASON',
    'CUSTOMER_FRIENDLY_NOTE_MISSING',
    'FINAL_SUMMARY_CONFLICT',
    'EXTERNAL_QUERY_PENDING',
    'SECRETARY_GATE_MISSING',
    'KVKK_GATE_MISSING',
    'PAYMENT_GATE_MISSING',
    'MANAGER_APPROVAL_PENDING',
    'SYNC_PENDING'
  )),
  message text not null,
  task_id uuid references inspection_tasks(id) on delete set null,
  field_key text,
  evidence_related boolean not null default false,
  external_query_related boolean not null default false,
  is_blocking boolean not null default true,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists report_revisions (
  id uuid primary key default gen_random_uuid(),
  expertise_case_id uuid not null references expertise_cases(id) on delete cascade,
  revision_no int not null,
  requested_by uuid references app_users(id),
  reason text not null,
  status text not null default 'OPEN' check (status in ('OPEN','APPLIED','CANCELLED')),
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(expertise_case_id, revision_no)
);

create table if not exists report_audit_logs (
  id uuid primary key default gen_random_uuid(),
  expertise_case_id uuid references expertise_cases(id) on delete set null,
  actor_id uuid references app_users(id),
  action text not null,
  entity_name text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table if not exists report_delivery_events (
  id uuid primary key default gen_random_uuid(),
  expertise_case_id uuid not null references expertise_cases(id) on delete cascade,
  delivery_channel text not null check (delivery_channel in ('PRINT','SMS','WHATSAPP','EMAIL','QR')),
  delivered_to text,
  delivered_by uuid references app_users(id),
  delivery_status text not null default 'DELIVERED',
  created_at timestamptz not null default now()
);

create index if not exists idx_expertise_cases_branch on expertise_cases(branch_id);
create index if not exists idx_expertise_cases_status on expertise_cases(status);
create index if not exists idx_expertise_cases_vehicle on expertise_cases(vehicle_id);
create index if not exists idx_inspection_tasks_case on inspection_tasks(expertise_case_id);
create index if not exists idx_inspection_values_case on inspection_item_values(expertise_case_id);
create index if not exists idx_evidence_case on inspection_evidence_assets(expertise_case_id);
create index if not exists idx_gate_issues_case on report_gate_issues(expertise_case_id);
create index if not exists idx_gate_issues_open on report_gate_issues(expertise_case_id) where resolved_at is null;
create index if not exists idx_audit_case on report_audit_logs(expertise_case_id);

drop trigger if exists trg_branches_updated_at on branches;
create trigger trg_branches_updated_at before update on branches for each row execute function set_updated_at();

drop trigger if exists trg_app_users_updated_at on app_users;
create trigger trg_app_users_updated_at before update on app_users for each row execute function set_updated_at();

drop trigger if exists trg_customers_updated_at on customers;
create trigger trg_customers_updated_at before update on customers for each row execute function set_updated_at();

drop trigger if exists trg_vehicles_updated_at on vehicles;
create trigger trg_vehicles_updated_at before update on vehicles for each row execute function set_updated_at();

drop trigger if exists trg_package_plans_updated_at on package_plans;
create trigger trg_package_plans_updated_at before update on package_plans for each row execute function set_updated_at();

drop trigger if exists trg_appointments_updated_at on appointments;
create trigger trg_appointments_updated_at before update on appointments for each row execute function set_updated_at();

drop trigger if exists trg_expertise_cases_updated_at on expertise_cases;
create trigger trg_expertise_cases_updated_at before update on expertise_cases for each row execute function set_updated_at();

drop trigger if exists trg_start_evidence_updated_at on technician_start_evidence;
create trigger trg_start_evidence_updated_at before update on technician_start_evidence for each row execute function set_updated_at();

drop trigger if exists trg_inspection_tasks_updated_at on inspection_tasks;
create trigger trg_inspection_tasks_updated_at before update on inspection_tasks for each row execute function set_updated_at();

drop trigger if exists trg_inspection_values_updated_at on inspection_item_values;
create trigger trg_inspection_values_updated_at before update on inspection_item_values for each row execute function set_updated_at();

drop trigger if exists trg_evidence_updated_at on inspection_evidence_assets;
create trigger trg_evidence_updated_at before update on inspection_evidence_assets for each row execute function set_updated_at();

drop trigger if exists trg_external_queries_updated_at on external_query_results;
create trigger trg_external_queries_updated_at before update on external_query_results for each row execute function set_updated_at();

create or replace function prevent_locked_case_child_mutation()
returns trigger as $$
declare
  target_case_id uuid;
  locked boolean;
begin
  if tg_op = 'DELETE' then
    target_case_id := old.expertise_case_id;
  else
    target_case_id := new.expertise_case_id;
  end if;

  select is_locked into locked
  from expertise_cases
  where id = target_case_id;

  if locked then
    raise exception 'Rapor kilitli. Degisiklik icin revizyon acilmalidir.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_lock_start_evidence on technician_start_evidence;
create trigger trg_lock_start_evidence
before insert or update or delete on technician_start_evidence
for each row execute function prevent_locked_case_child_mutation();

drop trigger if exists trg_lock_inspection_tasks on inspection_tasks;
create trigger trg_lock_inspection_tasks
before insert or update or delete on inspection_tasks
for each row execute function prevent_locked_case_child_mutation();

drop trigger if exists trg_lock_inspection_values on inspection_item_values;
create trigger trg_lock_inspection_values
before insert or update or delete on inspection_item_values
for each row execute function prevent_locked_case_child_mutation();

drop trigger if exists trg_lock_evidence_assets on inspection_evidence_assets;
create trigger trg_lock_evidence_assets
before insert or update or delete on inspection_evidence_assets
for each row execute function prevent_locked_case_child_mutation();

drop trigger if exists trg_lock_external_queries on external_query_results;
create trigger trg_lock_external_queries
before insert or update or delete on external_query_results
for each row execute function prevent_locked_case_child_mutation();

create or replace function audit_report_child_mutation()
returns trigger as $$
declare
  target_case_id uuid;
  actor uuid;
  old_record jsonb;
  new_record jsonb;
begin
  old_record := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  new_record := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;

  if tg_op = 'DELETE' then
    target_case_id := old.expertise_case_id;
    actor := nullif(old_record ->> 'updated_by', '')::uuid;
  else
    target_case_id := new.expertise_case_id;
    actor := coalesce(
      nullif(new_record ->> 'updated_by', '')::uuid,
      nullif(new_record ->> 'created_by', '')::uuid
    );
  end if;

  insert into report_audit_logs (
    expertise_case_id,
    actor_id,
    action,
    entity_name,
    entity_id,
    old_value,
    new_value
  )
  values (
    target_case_id,
    actor,
    tg_op,
    tg_table_name,
    coalesce(
      nullif(new_record ->> 'id', '')::uuid,
      nullif(old_record ->> 'id', '')::uuid
    ),
    old_record,
    new_record
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_audit_inspection_values on inspection_item_values;
create trigger trg_audit_inspection_values
after insert or update or delete on inspection_item_values
for each row execute function audit_report_child_mutation();

drop trigger if exists trg_audit_evidence_assets on inspection_evidence_assets;
create trigger trg_audit_evidence_assets
after insert or update or delete on inspection_evidence_assets
for each row execute function audit_report_child_mutation();

create or replace function approve_expertise_case(
  target_case_id uuid,
  supervisor_id uuid
)
returns expertise_cases as $$
declare
  open_blockers int;
  approved_case expertise_cases;
begin
  select count(*)
  into open_blockers
  from report_gate_issues
  where expertise_case_id = target_case_id
    and is_blocking = true
    and resolved_at is null;

  if open_blockers > 0 then
    raise exception 'Rapor onaylanamaz. Acik blokaj sayisi: %', open_blockers;
  end if;

  update expertise_cases
  set
    status = 'APPROVED',
    is_locked = true,
    manager_approved_by = supervisor_id,
    manager_approved_at = now(),
    report_approved_at = now(),
    updated_by = supervisor_id
  where id = target_case_id
  returning * into approved_case;

  insert into report_audit_logs (
    expertise_case_id,
    actor_id,
    action,
    entity_name,
    entity_id,
    new_value
  )
  values (
    target_case_id,
    supervisor_id,
    'APPROVE',
    'expertise_cases',
    target_case_id,
    to_jsonb(approved_case)
  );

  return approved_case;
end;
$$ language plpgsql security definer;

create or replace function request_expertise_case_revision(
  target_case_id uuid,
  requester_id uuid,
  revision_reason text
)
returns expertise_cases as $$
declare
  next_revision_no int;
  revised_case expertise_cases;
begin
  if revision_reason is null or length(trim(revision_reason)) < 5 then
    raise exception 'Revizyon nedeni zorunludur.';
  end if;

  select revision_no + 1
  into next_revision_no
  from expertise_cases
  where id = target_case_id;

  insert into report_revisions (
    expertise_case_id,
    revision_no,
    requested_by,
    reason
  )
  values (
    target_case_id,
    next_revision_no,
    requester_id,
    revision_reason
  );

  update expertise_cases
  set
    status = 'REVISION_REQUESTED',
    is_locked = false,
    revision_no = next_revision_no,
    updated_by = requester_id
  where id = target_case_id
  returning * into revised_case;

  insert into report_audit_logs (
    expertise_case_id,
    actor_id,
    action,
    entity_name,
    entity_id,
    new_value
  )
  values (
    target_case_id,
    requester_id,
    'REQUEST_REVISION',
    'expertise_cases',
    target_case_id,
    jsonb_build_object('reason', revision_reason, 'revision_no', next_revision_no)
  );

  return revised_case;
end;
$$ language plpgsql security definer;

create or replace view public_report_verification as
select
  ec.verification_token,
  ec.report_no,
  ec.work_order_no,
  ec.status,
  ec.revision_no,
  ec.report_approved_at,
  ec.delivered_at,
  b.name as branch_name,
  v.plate,
  v.brand,
  v.model,
  v.model_year,
  ec.customer_summary
from expertise_cases ec
join branches b on b.id = ec.branch_id
join vehicles v on v.id = ec.vehicle_id
where ec.status in ('APPROVED','DELIVERED')
  and ec.is_locked = true;

alter table branches enable row level security;
alter table app_users enable row level security;
alter table customers enable row level security;
alter table vehicles enable row level security;
alter table package_plans enable row level security;
alter table appointments enable row level security;
alter table expertise_cases enable row level security;
alter table technician_start_evidence enable row level security;
alter table inspection_tasks enable row level security;
alter table inspection_item_values enable row level security;
alter table inspection_evidence_assets enable row level security;
alter table external_query_results enable row level security;
alter table report_gate_issues enable row level security;
alter table report_revisions enable row level security;
alter table report_audit_logs enable row level security;
alter table report_delivery_events enable row level security;

create or replace function current_app_user()
returns app_users as $$
  select *
  from app_users
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1;
$$ language sql stable security definer;

create or replace function current_user_can_access_branch(target_branch_id uuid)
returns boolean as $$
  select exists (
    select 1
    from app_users u
    where u.auth_user_id = auth.uid()
      and u.is_active = true
      and (
        u.role in ('CEO','GENERAL_MANAGER','QUALITY_AUDITOR','FINANCE','LEGAL')
        or u.branch_id = target_branch_id
      )
  );
$$ language sql stable security definer;

drop policy if exists branches_branch_access on branches;
create policy branches_branch_access
on branches
for select
to authenticated
using (current_user_can_access_branch(id));

drop policy if exists app_users_self_or_hq on app_users;
create policy app_users_self_or_hq
on app_users
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or exists (
    select 1
    from app_users u
    where u.auth_user_id = auth.uid()
      and u.role in ('CEO','GENERAL_MANAGER','QUALITY_AUDITOR')
  )
);

drop policy if exists package_plans_authenticated_read on package_plans;
create policy package_plans_authenticated_read
on package_plans
for select
to authenticated
using (is_active = true);

drop policy if exists customers_case_access on customers;
create policy customers_case_access
on customers
for select
to authenticated
using (
  exists (
    select 1
    from expertise_cases ec
    where ec.customer_id = customers.id
      and current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists vehicles_case_access on vehicles;
create policy vehicles_case_access
on vehicles
for select
to authenticated
using (
  exists (
    select 1
    from expertise_cases ec
    where ec.vehicle_id = vehicles.id
      and current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists appointments_branch_access on appointments;
create policy appointments_branch_access
on appointments
for select
to authenticated
using (current_user_can_access_branch(branch_id));

drop policy if exists expertise_cases_branch_access on expertise_cases;
create policy expertise_cases_branch_access
on expertise_cases
for select
to authenticated
using (current_user_can_access_branch(branch_id));

drop policy if exists expertise_cases_branch_insert on expertise_cases;
create policy expertise_cases_branch_insert
on expertise_cases
for insert
to authenticated
with check (current_user_can_access_branch(branch_id));

drop policy if exists expertise_cases_branch_update on expertise_cases;
create policy expertise_cases_branch_update
on expertise_cases
for update
to authenticated
using (current_user_can_access_branch(branch_id))
with check (current_user_can_access_branch(branch_id));

drop policy if exists report_gate_issues_case_access on report_gate_issues;
create policy report_gate_issues_case_access
on report_gate_issues
for select
to authenticated
using (
  exists (
    select 1
    from expertise_cases ec
    where ec.id = report_gate_issues.expertise_case_id
      and current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists report_revisions_case_access on report_revisions;
create policy report_revisions_case_access
on report_revisions
for select
to authenticated
using (
  exists (
    select 1
    from expertise_cases ec
    where ec.id = report_revisions.expertise_case_id
      and current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists report_audit_logs_case_access on report_audit_logs;
create policy report_audit_logs_case_access
on report_audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from expertise_cases ec
    where ec.id = report_audit_logs.expertise_case_id
      and current_user_can_access_branch(ec.branch_id)
  )
);

-- Child tables share the parent expertise_case branch access pattern.
drop policy if exists start_evidence_case_access on technician_start_evidence;
create policy start_evidence_case_access on technician_start_evidence
for all to authenticated
using (exists (select 1 from expertise_cases ec where ec.id = technician_start_evidence.expertise_case_id and current_user_can_access_branch(ec.branch_id)))
with check (exists (select 1 from expertise_cases ec where ec.id = technician_start_evidence.expertise_case_id and current_user_can_access_branch(ec.branch_id)));

drop policy if exists inspection_tasks_case_access on inspection_tasks;
create policy inspection_tasks_case_access on inspection_tasks
for all to authenticated
using (exists (select 1 from expertise_cases ec where ec.id = inspection_tasks.expertise_case_id and current_user_can_access_branch(ec.branch_id)))
with check (exists (select 1 from expertise_cases ec where ec.id = inspection_tasks.expertise_case_id and current_user_can_access_branch(ec.branch_id)));

drop policy if exists inspection_values_case_access on inspection_item_values;
create policy inspection_values_case_access on inspection_item_values
for all to authenticated
using (exists (select 1 from expertise_cases ec where ec.id = inspection_item_values.expertise_case_id and current_user_can_access_branch(ec.branch_id)))
with check (exists (select 1 from expertise_cases ec where ec.id = inspection_item_values.expertise_case_id and current_user_can_access_branch(ec.branch_id)));

drop policy if exists evidence_assets_case_access on inspection_evidence_assets;
create policy evidence_assets_case_access on inspection_evidence_assets
for all to authenticated
using (exists (select 1 from expertise_cases ec where ec.id = inspection_evidence_assets.expertise_case_id and current_user_can_access_branch(ec.branch_id)))
with check (exists (select 1 from expertise_cases ec where ec.id = inspection_evidence_assets.expertise_case_id and current_user_can_access_branch(ec.branch_id)));

drop policy if exists external_queries_case_access on external_query_results;
create policy external_queries_case_access on external_query_results
for all to authenticated
using (exists (select 1 from expertise_cases ec where ec.id = external_query_results.expertise_case_id and current_user_can_access_branch(ec.branch_id)))
with check (exists (select 1 from expertise_cases ec where ec.id = external_query_results.expertise_case_id and current_user_can_access_branch(ec.branch_id)));
