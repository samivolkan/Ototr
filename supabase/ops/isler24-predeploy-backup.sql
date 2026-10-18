-- Release rollback snapshot of application data inside the existing database.
-- Not an offsite/PITR backup; auth/storage schemas are intentionally excluded.
-- Run ONCE before applying the Isler v24 migrations. Existing tables stay untouched.
create schema isler24_backup_20261019;
revoke all on schema isler24_backup_20261019 from public,anon,authenticated,service_role;
create table isler24_backup_20261019.manifest(source_schema text,source_table text,row_count bigint,backed_up_at timestamptz default now());
alter table isler24_backup_20261019.manifest enable row level security;
do $$ declare r record; n bigint; target_name text;
begin
  for r in select schemaname,tablename from pg_tables where schemaname in ('public','app_private') order by schemaname,tablename loop
    target_name:=r.schemaname||'__'||r.tablename;
    execute format('create table isler24_backup_20261019.%I as table %I.%I',target_name,r.schemaname,r.tablename);
    execute format('alter table isler24_backup_20261019.%I enable row level security',target_name);
    execute format('revoke all on isler24_backup_20261019.%I from public,anon,authenticated,service_role',target_name);
    execute format('select count(*) from isler24_backup_20261019.%I',target_name) into n;
    insert into isler24_backup_20261019.manifest(source_schema,source_table,row_count) values(r.schemaname,r.tablename,n);
  end loop;
end $$;
revoke all on all tables in schema isler24_backup_20261019 from public,anon,authenticated,service_role;
