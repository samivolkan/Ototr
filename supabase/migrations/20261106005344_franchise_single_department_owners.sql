-- One accountable person per department for the Franchise pilot.
-- Existing JWT role codes remain stable; this table controls actual assignments.
create table public.franchise_department_responsibilities(
  id uuid primary key default gen_random_uuid(),
  department_code text not null check(department_code=any(array['franchise','finance','accounting','legal','hr','academy','operations','procurement','it','marketing','quality','ohs','architecture'])),
  user_id uuid not null references auth.users(id) on delete restrict,
  role_code text not null check(role_code=any(array['franchise_director','finance','accounting','legal','hr','academy','operations','procurement','it','marketing','quality','ohs','architecture'])),
  assignment_level text not null default 'primary_responsible' check(assignment_level in('primary_responsible','subordinate')),
  reports_to_id uuid references public.franchise_department_responsibilities(id) on delete restrict,
  is_active boolean not null default true,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assignment_note text check(assignment_note is null or length(trim(assignment_note)) between 10 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check((assignment_level='primary_responsible' and reports_to_id is null) or (assignment_level='subordinate' and reports_to_id is not null))
);

create unique index franchise_one_active_primary_per_department
on public.franchise_department_responsibilities(department_code)
where is_active and assignment_level='primary_responsible';
create index franchise_department_responsibilities_user_idx on public.franchise_department_responsibilities(user_id) where is_active;
create index franchise_department_responsibilities_parent_idx on public.franchise_department_responsibilities(reports_to_id) where is_active;

alter table public.franchise_department_responsibilities enable row level security;
revoke all on public.franchise_department_responsibilities from public,anon;
grant select,insert,update on public.franchise_department_responsibilities to authenticated;
grant all on public.franchise_department_responsibilities to service_role;

create or replace function app_private.franchise_can_manage_department(p_department text)
returns boolean language sql stable security definer
set search_path='' as $$
  select (select public.franchise_claim_role())='gm'
    or exists(
      select 1 from public.franchise_department_responsibilities r
      where r.department_code=p_department and r.user_id=(select auth.uid())
        and r.assignment_level='primary_responsible' and r.is_active
    )
$$;
revoke all on function app_private.franchise_can_manage_department(text) from public,anon;
grant execute on function app_private.franchise_can_manage_department(text) to authenticated,service_role;

create policy franchise_department_responsibility_select on public.franchise_department_responsibilities
for select to authenticated using(
  (select auth.uid()) is not null and (
    user_id=(select auth.uid()) or
    (select public.franchise_claim_role())='gm' or
    (select app_private.franchise_can_manage_department(department_code))
  )
);
create policy franchise_department_responsibility_insert on public.franchise_department_responsibilities
for insert to authenticated with check(
  assigned_by=(select auth.uid()) and (
    (assignment_level='primary_responsible' and (select public.franchise_claim_role())='gm') or
    (assignment_level='subordinate' and (select app_private.franchise_can_manage_department(department_code)))
  )
);
create policy franchise_department_responsibility_update on public.franchise_department_responsibilities
for update to authenticated
using((select public.franchise_claim_role())='gm' or (assignment_level='subordinate' and (select app_private.franchise_can_manage_department(department_code))))
with check((select public.franchise_claim_role())='gm' or (assignment_level='subordinate' and (select app_private.franchise_can_manage_department(department_code))));

create or replace function public.franchise_department_responsibility_guard()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
  v_expected_role text;
  v_parent public.franchise_department_responsibilities%rowtype;
begin
  v_expected_role:=case new.department_code
    when 'franchise' then 'franchise_director' when 'finance' then 'finance'
    when 'accounting' then 'accounting' when 'legal' then 'legal' when 'hr' then 'hr'
    when 'academy' then 'academy' when 'operations' then 'operations'
    when 'procurement' then 'procurement' when 'it' then 'it' when 'marketing' then 'marketing'
    when 'quality' then 'quality' when 'ohs' then 'ohs' when 'architecture' then 'architecture' end;
  if new.role_code<>v_expected_role then raise exception 'Departman sorumlusu rolü departmanla uyumsuz'; end if;
  if tg_op='INSERT' then
    if (select auth.uid()) is null or new.assigned_by<>(select auth.uid()) then raise exception 'Atayan kullanıcı sunucu oturumuyla eşleşmiyor'; end if;
    if new.assignment_level='primary_responsible' and (select public.franchise_claim_role())<>'gm' then raise exception 'Ana departman sorumlusunu yalnız Genel Müdür atayabilir'; end if;
  else
    if (new.department_code,new.user_id,new.role_code,new.assignment_level,new.reports_to_id,new.assigned_by,new.created_at)
       is distinct from (old.department_code,old.user_id,old.role_code,old.assignment_level,old.reports_to_id,old.assigned_by,old.created_at)
    then raise exception 'Sorumluluk kimliği değiştirilemez; yeni atama oluşturun'; end if;
  end if;
  if new.assignment_level='subordinate' then
    select * into v_parent from public.franchise_department_responsibilities where id=new.reports_to_id;
    if not found or not v_parent.is_active or v_parent.assignment_level<>'primary_responsible' or v_parent.department_code<>new.department_code
    then raise exception 'Alt personel aynı departmandaki aktif sorumluya bağlanmalıdır'; end if;
  elsif tg_op='UPDATE' and old.is_active and not new.is_active and exists(
    select 1 from public.franchise_department_responsibilities c where c.reports_to_id=old.id and c.is_active
  ) then raise exception 'Aktif alt personel varken departman sorumlusu kapatılamaz';
  end if;
  new.updated_at:=now();
  return new;
end $$;
revoke all on function public.franchise_department_responsibility_guard() from public,anon,authenticated;
grant execute on function public.franchise_department_responsibility_guard() to service_role;
create trigger franchise_department_responsibility_guard_trigger
before insert or update on public.franchise_department_responsibilities
for each row execute function public.franchise_department_responsibility_guard();

comment on table public.franchise_department_responsibilities is 'Pilot organization: one active primary responsible per department; subordinate assignments may be added later.';
