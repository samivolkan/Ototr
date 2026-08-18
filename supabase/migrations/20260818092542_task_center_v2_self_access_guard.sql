-- Prevent an authenticated user from accidentally removing their own access.

create or replace function app_private.prevent_app_user_self_access_demotion()
returns trigger
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
begin
  if auth.uid() is not null
     and old.auth_user_id=auth.uid()
     and (new.role is distinct from old.role or new.is_active is false) then
    raise exception 'You cannot change your own role or deactivate your own account'
      using errcode='42501';
  end if;
  return new;
end
$$;

drop trigger if exists trg_app_user_self_access_guard on public.app_users;
create trigger trg_app_user_self_access_guard
before update of role,is_active on public.app_users
for each row execute function app_private.prevent_app_user_self_access_demotion();

revoke all on function app_private.prevent_app_user_self_access_demotion() from public, anon, authenticated;
