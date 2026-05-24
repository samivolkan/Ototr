-- Fix app_users RLS recursion.
-- The previous policy queried app_users directly inside an app_users policy,
-- which can recurse when Flutter loads the signed-in user's app profile.
-- HQ access is moved behind a security definer helper so the policy itself
-- remains non-recursive.

drop policy if exists app_users_self_or_hq on public.app_users;
drop policy if exists app_users_self_read on public.app_users;

create or replace function public.current_user_is_hq()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users u
    where u.auth_user_id = auth.uid()
      and u.is_active = true
      and u.role in ('CEO', 'GENERAL_MANAGER', 'QUALITY_AUDITOR')
  );
$$;

create policy app_users_self_or_hq
on public.app_users
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.current_user_is_hq()
);
