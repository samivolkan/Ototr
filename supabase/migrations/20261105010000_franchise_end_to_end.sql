begin;

create table if not exists public.franchise_cases (
  id uuid primary key default gen_random_uuid(),
  application_no text not null unique,
  applicant_user_id uuid references auth.users(id) on delete set null,
  candidate_name text not null,
  city text not null,
  district text not null,
  branch_type text not null default 'standard',
  stage smallint not null default 0 check (stage between 0 and 13),
  score numeric(5,2) not null default 0 check (score between 0 and 100),
  consent_count smallint not null default 0 check (consent_count between 0 and 3),
  document_count integer not null default 0 check (document_count >= 0),
  document_total integer not null default 17 check (document_total > 0),
  paid_percent numeric(5,2) not null default 0 check (paid_percent between 0 and 100),
  status text not null default 'in_review' check (status in ('in_review','conditionally_approved','approved','opening','active','rejected','closed')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.franchise_department_tasks (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete cascade,
  department text not null,
  task_code text not null,
  title text not null,
  status text not null default 'open' check (status in ('open','completed','waived')),
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  evidence_path text,
  unique (franchise_case_id, task_code)
);

create table if not exists public.franchise_staff (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete cascade,
  role_key text not null,
  role_name text not null,
  person_name text,
  contact_email text,
  auth_user_id uuid references auth.users(id) on delete set null,
  recruitment_status text not null default 'open' check (recruitment_status in ('open','candidate','offered','hired','cancelled')),
  employment_documents_complete boolean not null default false,
  contract_signed boolean not null default false,
  certification_required boolean not null default true,
  academy_completed boolean not null default false,
  certificate_valid_until date,
  access_status text not null default 'blocked' check (access_status in ('blocked','ready','provisioning','active','failed','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (franchise_case_id, role_key)
);

create table if not exists public.franchise_branches (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null unique references public.franchise_cases(id) on delete restrict,
  branch_code text not null unique,
  name text not null,
  city text not null,
  district text not null,
  status text not null default 'active' check (status in ('opening','active','suspended','closed')),
  activated_at timestamptz not null default now(),
  activated_by uuid not null references auth.users(id) on delete restrict
);

create table if not exists public.franchise_access_accounts (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete cascade,
  branch_id uuid not null references public.franchise_branches(id) on delete cascade,
  staff_id uuid not null unique references public.franchise_staff(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  role_key text not null,
  status text not null default 'pending_provisioning' check (status in ('pending_provisioning','active','failed','revoked')),
  created_at timestamptz not null default now()
);

create table if not exists public.franchise_followup_tasks (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete cascade,
  branch_id uuid not null references public.franchise_branches(id) on delete cascade,
  day_no smallint not null check (day_no in (30,60,90)),
  title text not null,
  owner_department text not null,
  due_at timestamptz not null,
  status text not null default 'open' check (status in ('open','completed','cancelled')),
  completed_at timestamptz,
  unique (franchise_case_id, day_no)
);

create table if not exists public.franchise_exceptions (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete cascade,
  exception_type text not null check (exception_type not in ('legal','license','payment')),
  reason text not null check (length(trim(reason)) between 5 and 2000),
  requester_id uuid not null references auth.users(id) on delete restrict,
  requester_role text not null,
  status text not null default 'pending_second_approval' check (status in ('pending_second_approval','approved','rejected')),
  reviewer_id uuid references auth.users(id) on delete restrict,
  reviewer_role text,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (reviewer_id is null or reviewer_id <> requester_id)
);

create table if not exists public.franchise_integration_outbox (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete cascade,
  source text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','processed','failed','dead_letter')),
  attempts integer not null default 0 check (attempts between 0 and 20),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (franchise_case_id, source, event_type)
);

create table if not exists public.franchise_documents (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete cascade,
  storage_path text not null unique,
  category text not null check (category in ('identity','financial','legal','location','employment','certificate','other')),
  classification text not null default 'confidential' check (classification in ('internal','confidential','restricted')),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 20971520),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.franchise_document_retention (
  category text primary key,
  retention_days integer not null check (retention_days between 30 and 3650),
  legal_hold boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.franchise_document_retention(category,retention_days) values
  ('identity',730),('financial',1825),('legal',3650),('location',1825),('employment',3650),('certificate',1825),('other',730)
on conflict (category) do nothing;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('franchise-private','franchise-private',false,20971520,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.franchise_user_scopes (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  erp_app_user_id uuid,
  franchise_role text not null check (franchise_role in ('gm','franchise_director','franchise_specialist','finance','legal','hr','academy','operations','procurement','it','marketing','quality','ohs','accounting','architecture','dealer','inspector','supplier','applicant')),
  branch_ids uuid[] not null default '{}',
  scope_version integer not null default 1 check (scope_version > 0),
  is_active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists franchise_cases_applicant_idx on public.franchise_cases (applicant_user_id, status);
create index if not exists franchise_tasks_case_status_idx on public.franchise_department_tasks (franchise_case_id, status);
create index if not exists franchise_staff_case_status_idx on public.franchise_staff (franchise_case_id, recruitment_status, access_status);
create index if not exists franchise_followups_branch_due_idx on public.franchise_followup_tasks (branch_id, status, due_at);
create index if not exists franchise_exceptions_case_status_idx on public.franchise_exceptions (franchise_case_id, status);
create index if not exists franchise_outbox_pending_idx on public.franchise_integration_outbox (status, next_attempt_at) where status in ('pending','failed');
create index if not exists franchise_documents_case_category_idx on public.franchise_documents (franchise_case_id, category, created_at desc);
create index if not exists franchise_user_scopes_role_idx on public.franchise_user_scopes (franchise_role, is_active);

alter table public.franchise_cases enable row level security;
alter table public.franchise_department_tasks enable row level security;
alter table public.franchise_staff enable row level security;
alter table public.franchise_branches enable row level security;
alter table public.franchise_access_accounts enable row level security;
alter table public.franchise_followup_tasks enable row level security;
alter table public.franchise_exceptions enable row level security;
alter table public.franchise_integration_outbox enable row level security;
alter table public.franchise_documents enable row level security;
alter table public.franchise_document_retention enable row level security;
alter table public.franchise_user_scopes enable row level security;

revoke all on public.franchise_cases, public.franchise_department_tasks, public.franchise_staff, public.franchise_branches, public.franchise_access_accounts, public.franchise_followup_tasks, public.franchise_exceptions, public.franchise_integration_outbox, public.franchise_documents, public.franchise_document_retention, public.franchise_user_scopes from anon;
revoke all on public.franchise_cases, public.franchise_department_tasks, public.franchise_staff, public.franchise_branches, public.franchise_access_accounts, public.franchise_followup_tasks, public.franchise_exceptions, public.franchise_integration_outbox, public.franchise_documents, public.franchise_document_retention, public.franchise_user_scopes from authenticated;
grant select, insert, update on public.franchise_cases, public.franchise_department_tasks, public.franchise_staff, public.franchise_branches, public.franchise_access_accounts, public.franchise_followup_tasks, public.franchise_exceptions, public.franchise_documents to authenticated;
grant select on public.franchise_document_retention to authenticated;
grant select, insert on public.franchise_integration_outbox to authenticated;
grant select, insert, update on public.franchise_user_scopes to authenticated;

create policy franchise_case_select on public.franchise_cases for select to authenticated
using (
  applicant_user_id = (select auth.uid())
  or (select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','franchise_specialist','finance','legal','hr','academy','operations','it','quality','ohs','architecture')
);
create policy franchise_case_manage on public.franchise_cases for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','franchise_specialist'))
with check ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','franchise_specialist'));

create policy franchise_task_select on public.franchise_department_tasks for select to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','franchise_specialist','finance','legal','hr','academy','operations','it','quality','ohs','architecture'));
create policy franchise_task_manage on public.franchise_department_tasks for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','franchise_specialist','finance','legal','hr','academy','operations','it','quality','ohs','architecture'))
with check ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','franchise_specialist','finance','legal','hr','academy','operations','it','quality','ohs','architecture'));

create policy franchise_staff_select on public.franchise_staff for select to authenticated
using (auth_user_id = (select auth.uid()) or (select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','hr','academy','it'));
create policy franchise_staff_manage on public.franchise_staff for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','hr','academy','it'))
with check ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','hr','academy','it'));

create policy franchise_branch_select on public.franchise_branches for select to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','franchise_specialist','finance','legal','hr','academy','operations','it','quality','ohs','architecture') or id::text = any(array(select jsonb_array_elements_text(coalesce((select auth.jwt() -> 'app_metadata' -> 'franchise_branch_ids'),'[]'::jsonb)))));
create policy franchise_branch_manage on public.franchise_branches for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director'))
with check ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director'));

create policy franchise_account_select on public.franchise_access_accounts for select to authenticated
using (auth_user_id = (select auth.uid()) or (select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','it'));
create policy franchise_account_manage on public.franchise_access_accounts for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','it'))
with check ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','it'));

create policy franchise_followup_select on public.franchise_followup_tasks for select to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','finance','hr','operations') or branch_id::text = any(array(select jsonb_array_elements_text(coalesce((select auth.jwt() -> 'app_metadata' -> 'franchise_branch_ids'),'[]'::jsonb)))));
create policy franchise_followup_manage on public.franchise_followup_tasks for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','finance','hr','operations'))
with check ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','finance','hr','operations'));

create policy franchise_exception_select on public.franchise_exceptions for select to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','franchise_specialist','finance','legal','hr','academy','operations','it','quality','ohs','architecture'));
create policy franchise_exception_insert on public.franchise_exceptions for insert to authenticated
with check (requester_id=(select auth.uid()) and status='pending_second_approval' and reviewer_id is null);
create policy franchise_exception_review on public.franchise_exceptions for update to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director') and requester_id<>(select auth.uid()))
with check ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director') and requester_id<>(select auth.uid()) and reviewer_id=(select auth.uid()) and status in ('approved','rejected'));

create policy franchise_outbox_select on public.franchise_integration_outbox for select to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','it'));
create policy franchise_outbox_insert on public.franchise_integration_outbox for insert to authenticated
with check ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director'));

create policy franchise_document_select on public.franchise_documents for select to authenticated
using (
  exists(select 1 from public.franchise_cases c where c.id=franchise_case_id and c.applicant_user_id=(select auth.uid()))
  or (select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','franchise_specialist','finance','legal','hr','academy','operations')
);
create policy franchise_document_insert on public.franchise_documents for insert to authenticated
with check (
  uploaded_by=(select auth.uid()) and (
    exists(select 1 from public.franchise_cases c where c.id=franchise_case_id and c.applicant_user_id=(select auth.uid()))
    or (select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','franchise_specialist','finance','legal','hr','academy','operations')
  )
);
create policy franchise_document_update on public.franchise_documents for update to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','legal'))
with check ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','legal'));
create policy franchise_retention_select on public.franchise_document_retention for select to authenticated using (true);

create policy franchise_storage_select on storage.objects for select to authenticated
using (
  bucket_id='franchise-private' and (
    exists(select 1 from public.franchise_cases c where c.id::text=(storage.foldername(name))[1] and c.applicant_user_id=(select auth.uid()))
    or (select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','franchise_specialist','finance','legal','hr','academy','operations')
  )
);
create policy franchise_storage_insert on storage.objects for insert to authenticated
with check (
  bucket_id='franchise-private' and owner_id=(select auth.jwt()->>'sub') and (
    exists(select 1 from public.franchise_cases c where c.id::text=(storage.foldername(name))[1] and c.applicant_user_id=(select auth.uid()))
    or (select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','franchise_specialist','finance','legal','hr','academy','operations')
  )
);
create policy franchise_storage_update on storage.objects for update to authenticated
using (bucket_id='franchise-private' and owner_id=(select auth.jwt()->>'sub'))
with check (bucket_id='franchise-private' and owner_id=(select auth.jwt()->>'sub'));
create policy franchise_storage_delete on storage.objects for delete to authenticated
using (bucket_id='franchise-private' and (select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','legal'));

create policy franchise_scope_self_select on public.franchise_user_scopes for select to authenticated
using (auth_user_id=(select auth.uid()) or (select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','it'));
create policy franchise_scope_manage on public.franchise_user_scopes for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','it'))
with check ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','it'));
create policy franchise_scope_auth_hook on public.franchise_user_scopes for select to supabase_auth_admin using (true);
grant select on public.franchise_user_scopes to supabase_auth_admin;

create or replace function public.franchise_custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  claims jsonb := event->'claims';
  metadata jsonb := coalesce(event->'claims'->'app_metadata','{}'::jsonb);
  scope_row public.franchise_user_scopes%rowtype;
begin
  metadata := metadata - 'franchise_role' - 'franchise_branch_ids' - 'franchise_scope_version';
  select * into scope_row from public.franchise_user_scopes
  where auth_user_id=(event->>'user_id')::uuid and is_active=true;
  if found then
    metadata := metadata || jsonb_build_object(
      'franchise_role',scope_row.franchise_role,
      'franchise_branch_ids',to_jsonb(scope_row.branch_ids),
      'franchise_scope_version',scope_row.scope_version
    );
  end if;
  claims := jsonb_set(claims,'{app_metadata}',metadata,true);
  return jsonb_set(event,'{claims}',claims,true);
end;
$$;

revoke all on function public.franchise_custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.franchise_custom_access_token_hook(jsonb) to supabase_auth_admin;

create or replace function public.activate_franchise_case(p_case_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_case public.franchise_cases%rowtype;
  v_branch public.franchise_branches%rowtype;
  v_role text := auth.jwt() -> 'app_metadata' ->> 'franchise_role';
  v_missing integer;
begin
  if v_role not in ('gm','franchise_director') then raise exception 'Yetkisiz aktivasyon'; end if;
  select * into v_case from public.franchise_cases where id = p_case_id for update;
  if not found then raise exception 'Franchise dosyası bulunamadı'; end if;
  if v_case.status = 'active' then
    select * into v_branch from public.franchise_branches where franchise_case_id=p_case_id;
    return jsonb_build_object('ok',true,'already_active',true,'branch_id',v_branch.id,'branch_code',v_branch.branch_code);
  end if;
  if v_case.consent_count < 3 or v_case.document_count < v_case.document_total or v_case.paid_percent < 100 then raise exception 'Dosya, izin veya tahsilat kapısı eksik'; end if;
  if (select count(*) from public.franchise_department_tasks where franchise_case_id=p_case_id) <> 36 then raise exception 'Departman görev seti eksik; 36 görev zorunlu'; end if;
  select count(*) into v_missing from public.franchise_department_tasks where franchise_case_id=p_case_id and status <> 'completed';
  if v_missing > 0 then raise exception 'Departman görevleri eksik: %', v_missing; end if;
  select count(*) into v_missing from public.franchise_staff where franchise_case_id=p_case_id and (recruitment_status <> 'hired' or not employment_documents_complete or not contract_signed or (certification_required and (not academy_completed or certificate_valid_until < current_date)));
  if v_missing > 0 then raise exception 'Personel kapıları eksik: %', v_missing; end if;
  if (select count(*) from public.franchise_staff where franchise_case_id=p_case_id) < 10 then raise exception 'Minimum kadro eksik'; end if;
  if exists(select 1 from public.franchise_exceptions where franchise_case_id=p_case_id and status='pending_second_approval') then raise exception 'İkinci onay bekleyen istisna var'; end if;

  insert into public.franchise_branches(franchise_case_id,branch_code,name,city,district,activated_by)
  values(p_case_id,'BR-'||upper(substr(replace(p_case_id::text,'-',''),1,10)),v_case.district||' OTOTR',v_case.city,v_case.district,auth.uid())
  returning * into v_branch;

  insert into public.franchise_access_accounts(franchise_case_id,branch_id,staff_id,auth_user_id,role_key,status)
  select p_case_id,v_branch.id,s.id,s.auth_user_id,s.role_key,case when s.auth_user_id is null then 'pending_provisioning' else 'active' end
  from public.franchise_staff s where s.franchise_case_id=p_case_id;

  update public.franchise_staff set access_status=case when auth_user_id is null then 'provisioning' else 'active' end,updated_at=now() where franchise_case_id=p_case_id;
  insert into public.franchise_followup_tasks(franchise_case_id,branch_id,day_no,title,owner_department,due_at)
  values
    (p_case_id,v_branch.id,30,'İlk ay operasyon ve kalite kontrolü','operations',now()+interval '30 days'),
    (p_case_id,v_branch.id,60,'Finans, royalty ve kadro değerlendirmesi','finance_hr',now()+interval '60 days'),
    (p_case_id,v_branch.id,90,'Franchise performans kurulu','franchise',now()+interval '90 days');
  insert into public.franchise_integration_outbox(franchise_case_id,source,event_type,payload)
  values
    (p_case_id,'finance','royalty_profile.created',jsonb_build_object('branch_id',v_branch.id)),
    (p_case_id,'hr','staffing_plan.created',jsonb_build_object('branch_id',v_branch.id)),
    (p_case_id,'it','account.provisioning_requested',jsonb_build_object('branch_id',v_branch.id)),
    (p_case_id,'tasks','followup_tasks.created',jsonb_build_object('branch_id',v_branch.id));
  update public.franchise_cases set stage=13,status='active',updated_at=now() where id=p_case_id;
  return jsonb_build_object('ok',true,'branch_id',v_branch.id,'branch_code',v_branch.branch_code);
end;
$$;

revoke all on function public.activate_franchise_case(uuid) from public, anon;
grant execute on function public.activate_franchise_case(uuid) to authenticated;

create or replace function public.claim_franchise_outbox(p_limit integer default 25)
returns setof public.franchise_integration_outbox
language sql
security invoker
set search_path = public, pg_temp
as $$
  with claimed as (
    select id from public.franchise_integration_outbox
    where status in ('pending','failed') and next_attempt_at<=now() and attempts<10
    order by created_at
    for update skip locked
    limit least(greatest(p_limit,1),100)
  )
  update public.franchise_integration_outbox o
  set status='processing',attempts=o.attempts+1
  from claimed c where o.id=c.id
  returning o.*;
$$;

create or replace function public.finish_franchise_outbox(p_event_id uuid,p_success boolean,p_error text default null)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update public.franchise_integration_outbox
  set status=case when p_success then 'processed' when attempts>=10 then 'dead_letter' else 'failed' end,
      processed_at=case when p_success then now() else null end,
      next_attempt_at=case when p_success then next_attempt_at else now()+make_interval(secs=>least(3600,30*power(2,greatest(attempts-1,0))::integer)) end,
      last_error=case when p_success then null else left(coalesce(p_error,'Bilinmeyen adaptör hatası'),2000) end
  where id=p_event_id and status='processing';
  if not found then raise exception 'İşlenmekte olan outbox olayı bulunamadı'; end if;
end;
$$;

revoke all on function public.claim_franchise_outbox(integer) from public, anon, authenticated;
revoke all on function public.finish_franchise_outbox(uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.claim_franchise_outbox(integer) to service_role;
grant execute on function public.finish_franchise_outbox(uuid,boolean,text) to service_role;

commit;
