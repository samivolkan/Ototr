-- Run in the staging Supabase SQL editor after applying 20261105010000_franchise_end_to_end.sql.
-- Every assertion must return true before UAT.
select to_regclass('public.franchise_cases') is not null as cases_table_exists;
select to_regclass('public.franchise_staff') is not null as staff_table_exists;
select to_regclass('public.franchise_exceptions') is not null as exceptions_table_exists;
select to_regclass('public.franchise_integration_outbox') is not null as outbox_table_exists;
select to_regclass('public.franchise_documents') is not null as documents_table_exists;
select to_regclass('public.franchise_user_scopes') is not null as user_scopes_table_exists;

select bool_and(c.relrowsecurity) as all_public_tables_have_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in (
  'franchise_cases','franchise_department_tasks','franchise_staff','franchise_branches',
  'franchise_access_accounts','franchise_followup_tasks','franchise_exceptions',
  'franchise_integration_outbox','franchise_documents','franchise_document_retention'
  ,'franchise_user_scopes'
);

select count(*)>=18 as franchise_policies_present
from pg_policies where schemaname in ('public','storage') and policyname like 'franchise_%';

select exists(
  select 1 from storage.buckets
  where id='franchise-private' and public=false and file_size_limit=20971520
) as private_bucket_ready;

select to_regprocedure('public.activate_franchise_case(uuid)') is not null as activation_rpc_exists;
select to_regprocedure('public.claim_franchise_outbox(integer)') is not null as outbox_claim_rpc_exists;
select to_regprocedure('public.finish_franchise_outbox(uuid,boolean,text)') is not null as outbox_finish_rpc_exists;
select to_regprocedure('public.franchise_custom_access_token_hook(jsonb)') is not null as identity_hook_exists;

select not has_function_privilege('authenticated','public.claim_franchise_outbox(integer)','EXECUTE') as authenticated_cannot_claim_outbox;
select has_function_privilege('service_role','public.claim_franchise_outbox(integer)','EXECUTE') as service_role_can_claim_outbox;
select not has_table_privilege('anon','public.franchise_cases','SELECT') as anon_cannot_read_cases;
select not has_table_privilege('anon','public.franchise_documents','SELECT') as anon_cannot_read_documents;
select has_function_privilege('supabase_auth_admin','public.franchise_custom_access_token_hook(jsonb)','EXECUTE') as auth_admin_can_run_identity_hook;
select not has_function_privilege('authenticated','public.franchise_custom_access_token_hook(jsonb)','EXECUTE') as authenticated_cannot_run_identity_hook;

select count(*)=7 as retention_categories_complete from public.franchise_document_retention;
