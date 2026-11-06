-- Fail closed: central Franchise roles enter JWT only for the one active department owner.
-- Legacy role names remain accepted for compatibility, but do not create a second actor.
do $$
declare
  v_department text;
begin
  foreach v_department in array array[
    'franchise','finance','accounting','legal','hr','academy','operations',
    'procurement','it','marketing','quality','ohs','architecture'
  ] loop
    if not exists(
      select 1
      from public.franchise_department_responsibilities r
      where r.department_code=v_department
        and r.assignment_level='primary_responsible'
        and r.is_active
    ) then
      raise exception 'Ana sorumlu token kapısı etkinleştirilemez: % departmanı atanmamış',v_department;
    end if;
  end loop;
end
$$;

create or replace function app_private.franchise_has_active_primary_assignment(
  p_user_id uuid,
  p_role text
)
returns boolean
language sql
stable
security invoker
set search_path=''
as $$
  select case
    when p_user_id is null or p_role is null then false
    when p_role='gm' then true
    when p_role in ('dealer','inspector','supplier','applicant') then true
    else exists(
      select 1
      from public.franchise_department_responsibilities r
      where r.user_id=p_user_id
        and r.assignment_level='primary_responsible'
        and r.is_active
        and r.department_code=case p_role
          when 'franchise_director' then 'franchise'
          when 'franchise_specialist' then 'franchise'
          when 'finance' then 'finance'
          when 'accounting' then 'accounting'
          when 'legal' then 'legal'
          when 'hr' then 'hr'
          when 'academy' then 'academy'
          when 'operations' then 'operations'
          when 'procurement' then 'procurement'
          when 'it' then 'it'
          when 'marketing' then 'marketing'
          when 'quality' then 'quality'
          when 'ohs' then 'ohs'
          when 'architecture' then 'architecture'
          else null
        end
    )
  end
$$;

revoke all on function app_private.franchise_has_active_primary_assignment(uuid,text) from public,anon,authenticated;
grant execute on function app_private.franchise_has_active_primary_assignment(uuid,text) to supabase_auth_admin,service_role;

grant select on public.franchise_department_responsibilities to supabase_auth_admin;
create policy franchise_department_responsibility_auth_hook_select
on public.franchise_department_responsibilities
for select to supabase_auth_admin
using(true);

create or replace function public.franchise_custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  claims jsonb:=event->'claims';
  metadata jsonb:=coalesce(event->'claims'->'app_metadata','{}'::jsonb);
  scope_row public.franchise_user_scopes%rowtype;
  v_user_id uuid:=(event->>'user_id')::uuid;
begin
  metadata:=metadata-'franchise_role'-'franchise_branch_ids'-'franchise_scope_version';

  select * into scope_row
  from public.franchise_user_scopes
  where auth_user_id=v_user_id and is_active=true;

  if found and app_private.franchise_has_active_primary_assignment(v_user_id,scope_row.franchise_role) then
    metadata:=metadata||jsonb_build_object(
      'franchise_role',scope_row.franchise_role,
      'franchise_branch_ids',to_jsonb(scope_row.branch_ids),
      'franchise_scope_version',scope_row.scope_version
    );
  end if;

  claims:=jsonb_set(claims,'{app_metadata}',metadata,true);
  return jsonb_set(event,'{claims}',claims,true);
end;
$$;

revoke all on function public.franchise_custom_access_token_hook(jsonb) from public,anon,authenticated;
grant execute on function public.franchise_custom_access_token_hook(jsonb) to supabase_auth_admin;

comment on function app_private.franchise_has_active_primary_assignment(uuid,text) is
'Central JWT roles are issued only to the single active primary department owner; external personas and GM keep their existing scope rules.';

