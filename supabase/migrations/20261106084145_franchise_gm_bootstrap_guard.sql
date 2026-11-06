create or replace function app_private.bootstrap_franchise_gm(p_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_app_user_id uuid;
  v_scope_version integer;
begin
  if p_user_id is null then
    raise exception 'Aktif ve Auth bağlantılı ERP kullanıcısı bulunamadı';
  end if;

  -- Serialize the one-time bootstrap so concurrent calls cannot create two GMs.
  perform pg_advisory_xact_lock(hashtext('app_private.bootstrap_franchise_gm'));

  if exists(
    select 1
    from public.franchise_user_scopes s
    where s.franchise_role='gm' and s.is_active
  ) then
    raise exception 'Franchise Genel Müdür başlangıç yetkisi daha önce oluşturulmuş';
  end if;

  select u.id into v_app_user_id
  from public.app_users u
  where u.auth_user_id=p_user_id and u.is_active
  for update;

  if v_app_user_id is null then
    raise exception 'Aktif ve Auth bağlantılı ERP kullanıcısı bulunamadı';
  end if;

  if exists(
    select 1
    from public.franchise_user_scopes s
    where s.auth_user_id=p_user_id and s.is_active and s.franchise_role<>'gm'
  ) then
    raise exception 'Kullanıcının farklı aktif Franchise rolü var';
  end if;

  insert into public.franchise_user_scopes(
    auth_user_id,erp_app_user_id,franchise_role,branch_ids,scope_version,is_active,updated_by,updated_at
  ) values(
    p_user_id,v_app_user_id,'gm','{}'::uuid[],1,true,null,now()
  )
  on conflict(auth_user_id) do update set
    erp_app_user_id=excluded.erp_app_user_id,
    franchise_role='gm',
    branch_ids='{}'::uuid[],
    scope_version=public.franchise_user_scopes.scope_version+1,
    is_active=true,
    updated_by=null,
    updated_at=now()
  returning scope_version into v_scope_version;

  return jsonb_build_object(
    'role','gm',
    'active',true,
    'scopeVersion',v_scope_version
  );
end
$$;

revoke all on function app_private.bootstrap_franchise_gm(uuid) from public,anon,authenticated;
grant usage on schema app_private to service_role;
grant execute on function app_private.bootstrap_franchise_gm(uuid) to service_role;

comment on function app_private.bootstrap_franchise_gm(uuid) is
'One-time service-role-only bootstrap for the first active Franchise GM. It does not expose identity data.';
