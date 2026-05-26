-- public_report_verification view should respect the permissions of the
-- querying user instead of running with the view owner's privileges.
alter view public.public_report_verification
set (security_invoker = true);

-- RLS status check for public schema tables.
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
join pg_class c on c.relname = pg_tables.tablename
join pg_namespace n on n.oid = c.relnamespace
where schemaname = 'public';
