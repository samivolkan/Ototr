-- Privacy-minimized UAT roster preflight. It reports counts only, never user identity.
create function app_private.list_franchise_uat_roster_readiness()
returns table(
  signoff_role text,
  sequence_no smallint,
  required_scenarios text[],
  eligible_primary_count bigint,
  is_staffed boolean
)
language plpgsql
stable
security definer
set search_path=''
as $$
declare v_claim text:=public.franchise_claim_role();
begin
  if v_claim is null or v_claim='' or v_claim<>all(array[
    'gm','franchise_director','finance','accounting','legal','hr','academy',
    'operations','quality','ohs','procurement','architecture','marketing','it'
  ]) then
    raise exception 'UAT roster on kontrol yetkisi yok';
  end if;

  return query
  select
    catalog.signoff_role,
    catalog.sequence_no,
    catalog.required_scenarios,
    case
      when 'gm'=any(catalog.authorized_roles) then (
        select count(distinct app_user.auth_user_id)::bigint
        from public.app_users app_user
        where app_user.is_active and app_user.auth_user_id is not null
          and app_user.role='GENERAL_MANAGER' and app_user.branch_id is null
      )
      else (
        select count(distinct responsibility.user_id)::bigint
        from public.franchise_department_responsibilities responsibility
        where responsibility.is_active
          and responsibility.assignment_level='primary_responsible'
          and responsibility.role_code=any(catalog.authorized_roles)
      )
    end as eligible_primary_count,
    case
      when 'gm'=any(catalog.authorized_roles) then exists(
        select 1 from public.app_users app_user
        where app_user.is_active and app_user.auth_user_id is not null
          and app_user.role='GENERAL_MANAGER' and app_user.branch_id is null
      )
      else exists(
        select 1 from public.franchise_department_responsibilities responsibility
        where responsibility.is_active
          and responsibility.assignment_level='primary_responsible'
          and responsibility.role_code=any(catalog.authorized_roles)
      )
    end as is_staffed
  from public.franchise_uat_signoff_catalog catalog
  order by catalog.sequence_no;
end;
$$;

revoke all on function app_private.list_franchise_uat_roster_readiness() from public,anon,authenticated;
grant execute on function app_private.list_franchise_uat_roster_readiness() to authenticated,service_role;

create function public.list_franchise_uat_roster_readiness()
returns table(
  signoff_role text,
  sequence_no smallint,
  required_scenarios text[],
  eligible_primary_count bigint,
  is_staffed boolean
)
language sql
stable
security invoker
set search_path=''
as $$
  select * from app_private.list_franchise_uat_roster_readiness();
$$;

revoke all on function public.list_franchise_uat_roster_readiness() from public,anon;
grant execute on function public.list_franchise_uat_roster_readiness() to authenticated,service_role;
