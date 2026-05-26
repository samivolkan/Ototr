-- Manager-only active technician picker.
-- The app_users table stays RLS-protected; managers read selectable
-- technicians through this constrained RPC.

create or replace function list_branch_technicians()
returns table (
  id uuid,
  branch_id uuid,
  full_name text,
  email text,
  phone text,
  role text,
  is_active boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  actor_branch_id uuid;
begin
  select u.role, u.branch_id
    into actor_role, actor_branch_id
  from public.app_users u
  where u.auth_user_id = auth.uid()
    and u.is_active = true
  limit 1;

  if actor_role is null then
    raise exception 'Aktif kullanici bulunamadi.';
  end if;

  if actor_role not in (
    'BRANCH_MANAGER',
    'REGIONAL_MANAGER',
    'GENERAL_MANAGER',
    'CEO',
    'QUALITY_AUDITOR'
  ) then
    raise exception 'Aktif usta listesi sadece mudur yetkisindedir.';
  end if;

  return query
  select
    u.id,
    u.branch_id,
    u.full_name,
    u.email,
    u.phone,
    u.role,
    u.is_active
  from public.app_users u
  where u.is_active = true
    and u.role = 'INSPECTION_TECHNICIAN'
    and (
      actor_role in (
        'REGIONAL_MANAGER',
        'GENERAL_MANAGER',
        'CEO',
        'QUALITY_AUDITOR'
      )
      or u.branch_id = actor_branch_id
    )
  order by u.full_name;
end;
$$;

revoke execute on function list_branch_technicians() from public, anon;
grant execute on function list_branch_technicians() to authenticated;
