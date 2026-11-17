-- Honor both existing ERP account registries, without changing either membership.
create or replace function ik2_private.can_use_demo() returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from auth.users u where u.id=auth.uid()
  and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
  and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
 ) and (
  saha_private.current_member() is not null or exists (
   select 1 from public.app_users u where u.auth_user_id=auth.uid() and u.is_active=true
  )
 );
$$;
revoke all on function ik2_private.can_use_demo() from public, anon;
grant execute on function ik2_private.can_use_demo() to authenticated;
