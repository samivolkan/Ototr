-- Release rollback snapshot of application data inside the existing database.
-- Not an offsite/PITR backup; auth/storage schemas are intentionally excluded.
-- Run ONCE before applying the Kokpit migrations. Existing tables stay untouched.
create schema kokpit_backup_20261018;
revoke all on schema kokpit_backup_20261018 from public,anon,authenticated,service_role;
create table kokpit_backup_20261018.manifest(source_schema text,source_table text,row_count bigint,backed_up_at timestamptz default now());
alter table kokpit_backup_20261018.manifest enable row level security;
do $$ declare r record; n bigint; target_name text;
begin
  for r in select schemaname,tablename from pg_tables where schemaname in ('public','app_private') order by schemaname,tablename loop
    target_name:=r.schemaname||'__'||r.tablename;
    execute format('create table kokpit_backup_20261018.%I as table %I.%I',target_name,r.schemaname,r.tablename);
    execute format('alter table kokpit_backup_20261018.%I enable row level security',target_name);
    execute format('revoke all on kokpit_backup_20261018.%I from public,anon,authenticated,service_role',target_name);
    execute format('select count(*) from kokpit_backup_20261018.%I',target_name) into n;
    insert into kokpit_backup_20261018.manifest(source_schema,source_table,row_count) values(r.schemaname,r.tablename,n);
  end loop;
end $$;
revoke all on all tables in schema kokpit_backup_20261018 from public,anon,authenticated,service_role;
