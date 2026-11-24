-- Inspect existing Franchise responsibility records; never assign people or widen access.
create function app_private.office_routing_readiness() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor public.app_users;scope_name text;result jsonb;
begin
 if auth.uid() is null or app_private.franchise_office_manager() is not true then raise exception 'Yetkili merkez oturumu gerekli' using errcode='42501';end if;
 select * into strict actor from public.app_users where auth_user_id=auth.uid() and is_active;
 scope_name:=coalesce(actor.branch_id::text,'hq');
 with accounts as (
  select u.id,u.auth_user_id,u.role::text erp_role,coalesce(u.branch_id::text,'hq') scope,
   count(*) over(partition by u.auth_user_id) identity_count,
   coalesce(k.role,case when u.role in ('CEO','GENERAL_MANAGER','BRANCH_MANAGER') then 'yonetici'
    when u.role in ('INSPECTION_TECHNICIAN','OPERATIONS','CRM_AGENT','MARKETING','HR','FRANCHISE_SALES','SUPPORT_AGENT','ACADEMY_MANAGER') then 'calisan' else 'izleyici' end) task_role
  from public.app_users u left join app_private.kokpit_roles k on k.user_id=u.id
  where u.is_active and u.auth_user_id is not null
 ), departments as (
  select distinct department_code from public.franchise_department_erp_role_eligibility where is_active
 ), identities as (
  select r.id,r.department_code,r.assignment_level,r.reports_to_id,
   (select count(*) from accounts a where a.auth_user_id=r.user_id and a.identity_count=1 and a.scope=scope_name and exists(
    select 1 from public.franchise_department_erp_role_eligibility e where e.department_code=r.department_code and e.is_active and e.erp_role=a.erp_role)) valid_identity,
   (select count(*) from accounts a where a.auth_user_id=r.user_id and a.identity_count=1 and a.scope=scope_name and a.task_role='yonetici' and exists(
    select 1 from public.franchise_department_erp_role_eligibility e where e.department_code=r.department_code and e.is_active and e.erp_role=a.erp_role)) task_managers
  from public.franchise_department_responsibilities r where r.is_active
 ), counts as (
  select d.department_code,
   (select count(*) from identities r where r.department_code=d.department_code and r.assignment_level='primary_responsible') primary_count,
   (select count(*) from identities r where r.department_code=d.department_code and r.assignment_level='primary_responsible' and r.valid_identity=1) valid_primary_count,
   (select count(*) from identities r where r.department_code=d.department_code and r.assignment_level='primary_responsible' and r.task_managers=1) manager_primary_count,
   (select count(*) from identities r where r.department_code=d.department_code and r.assignment_level='subordinate' and (r.valid_identity<>1 or not exists(
    select 1 from identities parent where parent.id=r.reports_to_id and parent.department_code=r.department_code and parent.assignment_level='primary_responsible' and parent.valid_identity=1))) invalid_reporting_links,
   (select count(*) from accounts a where a.scope=scope_name and a.identity_count=1 and exists(select 1 from public.franchise_department_erp_role_eligibility e where e.is_active and e.department_code=d.department_code and e.erp_role=a.erp_role)) eligible_accounts,
   (select count(*) from accounts a where a.scope=scope_name and a.identity_count=1 and a.task_role in ('calisan','yonetici') and exists(select 1 from public.franchise_department_erp_role_eligibility e where e.is_active and e.department_code=d.department_code and e.erp_role=a.erp_role)) writable_accounts
  from departments d
 ) select jsonb_build_object('source','franchise_responsibility_readiness','scope','current_user_scope','observed_at',current_timestamp,
 'authorization_changed',false,'departments',coalesce(jsonb_agg(jsonb_build_object(
  'department',department_code,'primary_count',primary_count,'valid_primary_count',valid_primary_count,'manager_primary_count',manager_primary_count,
  'invalid_reporting_links',invalid_reporting_links,'eligible_accounts',eligible_accounts,'writable_accounts',writable_accounts,
  'status',case when primary_count=0 then 'owner_missing' when primary_count>1 then 'owner_ambiguous' when valid_primary_count<>1 then 'identity_or_scope_invalid'
   when manager_primary_count<>1 then 'task_manager_access_missing' when invalid_reporting_links>0 then 'reporting_link_invalid' else 'verified' end
 ) order by department_code),'[]'::jsonb)) into result from counts;
 return result;
exception when no_data_found or too_many_rows then raise exception 'Tekil aktif ERP hesabı doğrulanamadı' using errcode='42501';
end $$;
revoke all on function app_private.office_routing_readiness() from public,anon,authenticated;
create function public.office_routing_readiness() returns jsonb language sql stable security invoker set search_path='' as $$select app_private.office_routing_readiness()$$;
revoke all on function public.office_routing_readiness() from public,anon,authenticated;
grant execute on function app_private.office_routing_readiness(),public.office_routing_readiness() to authenticated;
