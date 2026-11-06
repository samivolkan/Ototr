create table public.franchise_department_erp_role_eligibility(
  department_code text not null check(department_code=any(array['franchise','finance','accounting','legal','hr','academy','operations','procurement','it','marketing','quality','ohs','architecture'])),
  erp_role text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(department_code,erp_role)
);

insert into public.franchise_department_erp_role_eligibility(department_code,erp_role) values
('franchise','FRANCHISE_SALES'),
('finance','FINANCE'),('accounting','FINANCE'),
('legal','LEGAL'),('hr','HR'),('academy','ACADEMY_MANAGER'),
('operations','OPERATIONS'),('procurement','OPERATIONS'),('ohs','OPERATIONS'),('architecture','OPERATIONS'),
('it','SUPPORT_AGENT'),('marketing','MARKETING'),('quality','QUALITY_AUDITOR');

alter table public.franchise_department_erp_role_eligibility enable row level security;
revoke all on public.franchise_department_erp_role_eligibility from public,anon;
grant select on public.franchise_department_erp_role_eligibility to authenticated,service_role;

create policy franchise_department_erp_role_eligibility_select
on public.franchise_department_erp_role_eligibility
for select to authenticated
using((select public.franchise_claim_role())='gm');

drop function public.list_franchise_department_owner_candidates();
create function public.list_franchise_department_owner_candidates()
returns table(auth_user_id uuid,display_name text,erp_role text,allowed_departments text[])
language plpgsql
stable
security invoker
set search_path=''
as $$
begin
  if (select public.franchise_claim_role())<>'gm' then
    raise exception 'Departman sorumlusu adaylarını yalnız Genel Müdür görebilir';
  end if;

  return query
  select u.auth_user_id,u.full_name,u.role,
    array_agg(e.department_code order by e.department_code)
  from public.app_users u
  join public.franchise_department_erp_role_eligibility e on e.erp_role=u.role and e.is_active
  where u.is_active and u.auth_user_id is not null
    and not exists(
      select 1 from public.franchise_user_scopes s
      where s.auth_user_id=u.auth_user_id and s.is_active
    )
  group by u.id,u.auth_user_id,u.full_name,u.role
  order by u.full_name,u.id;
end
$$;

revoke all on function public.list_franchise_department_owner_candidates() from public,anon;
grant execute on function public.list_franchise_department_owner_candidates() to authenticated;

create function public.franchise_primary_owner_erp_role_guard()
returns trigger
language plpgsql
security invoker
set search_path=''
as $$
begin
  if new.assignment_level='primary_responsible' and not exists(
    select 1
    from public.app_users u
    join public.franchise_department_erp_role_eligibility e
      on e.erp_role=u.role and e.department_code=new.department_code and e.is_active
    where u.auth_user_id=new.user_id and u.is_active
  ) then
    raise exception 'ERP kullanıcı rolü seçilen departmanla uyumlu değil';
  end if;
  return new;
end
$$;

revoke all on function public.franchise_primary_owner_erp_role_guard() from public,anon,authenticated;
grant execute on function public.franchise_primary_owner_erp_role_guard() to service_role;

create trigger franchise_primary_owner_erp_role_guard_trigger
before insert on public.franchise_department_responsibilities
for each row execute function public.franchise_primary_owner_erp_role_guard();

comment on table public.franchise_department_erp_role_eligibility is
'Authoritative ERP role to Franchise department eligibility catalog. UI filtering never replaces this database guard.';
