-- OTOTR live Supabase safety fixes
-- Run this in Supabase SQL Editor after the report backbone migration.
--
-- Purpose:
-- 1) Fix app_users RLS recursion that blocks Flutter startup.
-- 2) Keep HQ users able to read app_users without querying app_users inside
--    the app_users policy itself.
-- 3) Make public report verification view respect caller permissions.
-- 4) Return an RLS status table for verification.

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

drop policy if exists app_users_self_or_hq on public.app_users;
drop policy if exists app_users_self_read on public.app_users;

create policy app_users_self_or_hq
on public.app_users
for select
to authenticated
using (
  auth_user_id = auth.uid()
  or public.current_user_is_hq()
);

alter view public.public_report_verification
set (security_invoker = true);

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
