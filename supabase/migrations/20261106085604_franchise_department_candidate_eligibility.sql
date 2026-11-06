create or replace function public.list_franchise_department_owner_candidates()
returns table(auth_user_id uuid,display_name text,erp_role text)
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
  select u.auth_user_id,u.full_name,u.role
  from public.app_users u
  where u.is_active and u.auth_user_id is not null
    and not exists(
      select 1 from public.franchise_user_scopes s
      where s.auth_user_id=u.auth_user_id and s.is_active
    )
  order by u.full_name,u.id;
end
$$;

revoke all on function public.list_franchise_department_owner_candidates() from public,anon;
grant execute on function public.list_franchise_department_owner_candidates() to authenticated;

comment on function public.list_franchise_department_owner_candidates() is
'GM-only minimal ERP directory for primary Franchise department assignment; users with an active Franchise scope and all contact data are excluded.';
