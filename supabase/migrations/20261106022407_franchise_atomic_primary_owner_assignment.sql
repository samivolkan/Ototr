create or replace function public.assign_franchise_primary_department_owner(
  p_department_code text,
  p_user_id uuid,
  p_assignment_note text
)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid:=(select auth.uid());
  v_role text:=(select public.franchise_claim_role());
  v_role_code text;
  v_scope_version integer;
  v_existing_scope public.franchise_user_scopes%rowtype;
  v_assignment public.franchise_department_responsibilities%rowtype;
begin
  if v_actor is null or v_role<>'gm' then
    raise exception 'Ana departman sorumlusunu yalnız Genel Müdür atayabilir';
  end if;

  v_role_code:=case p_department_code
    when 'franchise' then 'franchise_director'
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
  end;

  if v_role_code is null then raise exception 'Departman kodu geçersiz'; end if;
  if p_user_id is null or not exists(
    select 1 from public.app_users u
    where u.auth_user_id=p_user_id and u.is_active
  ) then raise exception 'Aktif ve Auth bağlantılı ERP kullanıcısı bulunamadı'; end if;
  if length(trim(coalesce(p_assignment_note,''))) not between 10 and 500 then
    raise exception 'Atama notu 10 ile 500 karakter arasında olmalıdır';
  end if;

  select * into v_existing_scope
  from public.franchise_user_scopes
  where auth_user_id=p_user_id
  for update;

  if found and v_existing_scope.is_active and v_existing_scope.franchise_role<>v_role_code then
    raise exception 'Kullanıcının farklı aktif Franchise departman rolü var';
  end if;

  insert into public.franchise_user_scopes(
    auth_user_id,erp_app_user_id,franchise_role,branch_ids,scope_version,is_active,updated_by,updated_at
  )
  select p_user_id,u.id,v_role_code,'{}'::uuid[],coalesce(v_existing_scope.scope_version,0)+1,true,v_actor,now()
  from public.app_users u
  where u.auth_user_id=p_user_id and u.is_active
  on conflict(auth_user_id) do update set
    erp_app_user_id=excluded.erp_app_user_id,
    franchise_role=excluded.franchise_role,
    branch_ids='{}'::uuid[],
    scope_version=public.franchise_user_scopes.scope_version+1,
    is_active=true,
    updated_by=v_actor,
    updated_at=now();

  insert into public.franchise_department_responsibilities(
    department_code,user_id,role_code,assignment_level,reports_to_id,is_active,assigned_by,assignment_note
  ) values(
    p_department_code,p_user_id,v_role_code,'primary_responsible',null,true,v_actor,trim(p_assignment_note)
  ) returning * into v_assignment;

  select scope_version into v_scope_version
  from public.franchise_user_scopes
  where auth_user_id=p_user_id;

  return jsonb_build_object(
    'departmentCode',v_assignment.department_code,
    'assignmentLevel',v_assignment.assignment_level,
    'active',v_assignment.is_active,
    'scopeVersion',v_scope_version
  );
end
$$;

revoke all on function public.assign_franchise_primary_department_owner(text,uuid,text) from public,anon;
grant execute on function public.assign_franchise_primary_department_owner(text,uuid,text) to authenticated;

comment on function public.assign_franchise_primary_department_owner(text,uuid,text) is
'GM-only atomic primary owner assignment: validates ERP identity, writes JWT scope and creates exactly one active department responsibility.';
