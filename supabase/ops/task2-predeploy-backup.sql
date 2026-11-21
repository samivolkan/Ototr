-- One-time rollback snapshot before TASK2 workspace migration and Edge Function deployment.
-- Copies application tables only; this is not an off-site/PITR backup.
-- Supabase managed auth/storage/extension schemas are intentionally excluded.
-- The backup schema is not exposed to API roles and every copied table has RLS enabled.
create schema task2_backup_20261121;
revoke all on schema task2_backup_20261121 from public, anon, authenticated, service_role;
create table task2_backup_20261121.manifest (
  source_schema text not null,
  source_table text not null,
  row_count bigint not null,
  backed_up_at timestamptz not null default now(),
  primary key (source_schema, source_table)
);
alter table task2_backup_20261121.manifest enable row level security;
revoke all on task2_backup_20261121.manifest from public, anon, authenticated, service_role;

do $$
declare
  r record;
  n bigint;
  target_name text;
begin
  for r in
    select schemaname, tablename
    from pg_tables
    where schemaname in ('public', 'app_private')
    order by schemaname, tablename
  loop
    target_name := r.schemaname || '__' || r.tablename;
    execute format('create table task2_backup_20261121.%I as table %I.%I',
      target_name, r.schemaname, r.tablename);
    execute format('alter table task2_backup_20261121.%I enable row level security', target_name);
    execute format('revoke all on task2_backup_20261121.%I from public, anon, authenticated, service_role', target_name);
    execute format('select count(*) from task2_backup_20261121.%I', target_name) into n;
    insert into task2_backup_20261121.manifest(source_schema, source_table, row_count)
    values (r.schemaname, r.tablename, n);
  end loop;
end $$;
revoke all on all tables in schema task2_backup_20261121 from public, anon, authenticated, service_role;
