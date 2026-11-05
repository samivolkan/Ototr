-- Run in staging after applying both 20261105010000 and 20261105020000 franchise migrations.
-- Every assertion must return true before UAT.
select to_regclass('public.franchise_cases') is not null as cases_table_exists;
select to_regclass('public.franchise_staff') is not null as staff_table_exists;
select to_regclass('public.franchise_exceptions') is not null as exceptions_table_exists;
select to_regclass('public.franchise_integration_outbox') is not null as outbox_table_exists;
select to_regclass('public.franchise_documents') is not null as documents_table_exists;
select to_regclass('public.franchise_user_scopes') is not null as user_scopes_table_exists;
select to_regclass('public.franchise_consent_receipts') is not null as consent_receipts_table_exists;
select to_regclass('public.franchise_message_templates') is not null as message_templates_table_exists;
select to_regclass('public.franchise_provider_requests') is not null as provider_requests_table_exists;
select to_regclass('public.franchise_staffing_rules') is not null as staffing_rules_table_exists;
select to_regclass('public.franchise_opening_evidence') is not null as opening_evidence_table_exists;
select to_regclass('public.franchise_document_requirements') is not null as document_requirements_table_exists;
select to_regclass('public.franchise_case_stage_history') is not null as stage_history_table_exists;
select to_regclass('public.franchise_followup_reopen_requests') is not null as followup_reopen_table_exists;
select to_regclass('public.franchise_candidate_score_entries') is not null as candidate_score_entries_table_exists;
select to_regclass('public.franchise_board_decisions') is not null as board_decisions_table_exists;
select to_regclass('public.franchise_integration_event_contracts') is not null as integration_event_contracts_table_exists;
select to_regclass('public.franchise_portal_assignments') is not null as portal_assignments_table_exists;
select to_regclass('public.franchise_portal_items') is not null as portal_items_table_exists;
select to_regclass('public.franchise_application_intakes') is not null as application_intakes_table_exists;
select to_regclass('public.franchise_application_profiles') is not null as application_profiles_table_exists;
select to_regclass('public.franchise_financial_terms') is not null as financial_terms_table_exists;
select to_regclass('public.franchise_entry_fee_installments') is not null as entry_fee_installments_table_exists;
select to_regclass('public.franchise_entry_fee_receipts') is not null as entry_fee_receipts_table_exists;

select bool_and(c.relrowsecurity) as all_public_tables_have_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in (
  'franchise_cases','franchise_department_tasks','franchise_staff','franchise_branches',
  'franchise_access_accounts','franchise_followup_tasks','franchise_exceptions',
  'franchise_integration_outbox','franchise_documents','franchise_document_retention'
  ,'franchise_user_scopes','franchise_consent_receipts','franchise_message_templates','franchise_provider_requests','franchise_staffing_rules','franchise_opening_evidence','franchise_document_requirements','franchise_case_stage_history','franchise_followup_reopen_requests','franchise_score_dimensions','franchise_candidate_score_entries','franchise_board_decisions'
  ,'franchise_integration_event_contracts'
  ,'franchise_portal_assignments','franchise_portal_items'
  ,'franchise_application_intakes','franchise_application_profiles'
  ,'franchise_financial_terms','franchise_entry_fee_installments','franchise_entry_fee_receipts'
);

select count(*)>=23 as franchise_policies_present
from pg_policies where schemaname in ('public','storage') and policyname like 'franchise_%';

select exists(
  select 1 from storage.buckets
  where id='franchise-private' and public=false and file_size_limit=20971520
) as private_bucket_ready;

select to_regprocedure('public.activate_franchise_case(uuid)') is not null as activation_rpc_exists;
select to_regprocedure('public.claim_franchise_outbox(integer)') is not null as outbox_claim_rpc_exists;
select to_regprocedure('public.finish_franchise_outbox(uuid,boolean,text)') is not null as outbox_finish_rpc_exists;
select to_regprocedure('public.franchise_custom_access_token_hook(jsonb)') is not null as identity_hook_exists;
select to_regprocedure('public.claim_franchise_provider_requests(integer)') is not null as provider_claim_rpc_exists;
select to_regprocedure('public.finish_franchise_provider_request(uuid,boolean,text,text,text)') is not null as provider_finish_rpc_exists;
select to_regprocedure('public.franchise_role_can_manage_department(text)') is not null as department_scope_function_exists;
select to_regprocedure('public.franchise_staffing_is_ready(uuid)') is not null as staffing_gate_function_exists;
select to_regprocedure('public.franchise_opening_evidence_ready(uuid)') is not null as opening_evidence_gate_function_exists;
select to_regprocedure('public.franchise_consents_ready(uuid)') is not null as consent_receipt_gate_function_exists;
select to_regprocedure('public.franchise_documents_ready(uuid)') is not null as required_document_gate_function_exists;
select to_regprocedure('public.transition_franchise_case(uuid,smallint,text)') is not null as lifecycle_transition_rpc_exists;
select to_regprocedure('public.complete_franchise_followup(uuid,text,text)') is not null as followup_completion_rpc_exists;
select to_regprocedure('public.franchise_score_value(uuid)') is not null as candidate_score_function_exists;

select not has_function_privilege('authenticated','public.claim_franchise_outbox(integer)','EXECUTE') as authenticated_cannot_claim_outbox;
select has_function_privilege('service_role','public.claim_franchise_outbox(integer)','EXECUTE') as service_role_can_claim_outbox;
select not has_table_privilege('anon','public.franchise_cases','SELECT') as anon_cannot_read_cases;
select not has_table_privilege('anon','public.franchise_documents','SELECT') as anon_cannot_read_documents;
select not has_table_privilege('anon','public.franchise_provider_requests','SELECT') as anon_cannot_read_provider_requests;
select has_function_privilege('supabase_auth_admin','public.franchise_custom_access_token_hook(jsonb)','EXECUTE') as auth_admin_can_run_identity_hook;
select not has_function_privilege('authenticated','public.franchise_custom_access_token_hook(jsonb)','EXECUTE') as authenticated_cannot_run_identity_hook;
select not has_function_privilege('authenticated','public.claim_franchise_provider_requests(integer)','EXECUTE') as authenticated_cannot_claim_provider_queue;
select has_function_privilege('service_role','public.claim_franchise_provider_requests(integer)','EXECUTE') as service_role_can_claim_provider_queue;
select not has_function_privilege('anon','public.franchise_role_can_manage_department(text)','EXECUTE') as anon_cannot_test_department_scope;

select count(*)=7 as retention_categories_complete from public.franchise_document_retention;
select count(*)=10 as standard_staffing_roles_complete from public.franchise_staffing_rules where branch_type='standard' and is_active;
select not has_table_privilege('anon','public.franchise_opening_evidence','SELECT') as anon_cannot_read_opening_evidence;
select count(*)=17 as standard_document_requirements_complete from public.franchise_document_requirements where branch_type='standard' and is_active;
select not has_table_privilege('anon','public.franchise_case_stage_history','SELECT') as anon_cannot_read_stage_history;
select to_regclass('public.franchise_followup_status_v') is not null as followup_sla_view_exists;
select count(*)=7 and sum(weight)=100 as score_dimensions_complete from public.franchise_score_dimensions where is_active;
select exists(select 1 from information_schema.columns where table_schema='public' and table_name='franchise_board_decisions' and column_name='superseded_at') as score_revision_invalidates_board_ready;
select count(*)=31 as integration_event_contracts_complete from public.franchise_integration_event_contracts where is_active and contract_version=1;
select to_regprocedure('public.franchise_validate_integration_outbox()') is not null as integration_payload_guard_exists;
select to_regprocedure('public.complete_franchise_portal_item(uuid,text,text)') is not null as portal_action_rpc_exists;
select to_regprocedure('public.close_franchise_portal_assignment(uuid,text)') is not null as portal_assignment_close_rpc_exists;
select to_regclass('public.franchise_portal_work_v') is not null as portal_safe_view_exists;
select not has_table_privilege('anon','public.franchise_portal_assignments','SELECT') as anon_cannot_read_portal_assignments;
select not has_table_privilege('anon','public.franchise_portal_items','SELECT') as anon_cannot_read_portal_items;
select to_regprocedure('public.submit_franchise_application(text,text,text,uuid,text,text,text,text,text,text,smallint,text,text,text,text,text,text,text,text,text,text,boolean)') is not null as application_intake_rpc_exists;
select not has_table_privilege('anon','public.franchise_application_intakes','SELECT') as anon_cannot_read_application_intakes;
select not has_table_privilege('anon','public.franchise_application_profiles','SELECT') as anon_cannot_read_application_profiles;
select to_regprocedure('public.franchise_financial_readiness(uuid)') is not null as finance_opening_gate_exists;
select to_regprocedure('public.review_franchise_entry_fee_receipt(uuid,boolean,text)') is not null as accounting_receipt_checker_exists;
select to_regclass('public.franchise_payment_status_v') is not null as governed_payment_status_view_exists;
select not has_table_privilege('anon','public.franchise_financial_terms','SELECT') as anon_cannot_read_financial_terms;
select not has_table_privilege('anon','public.franchise_entry_fee_receipts','SELECT') as anon_cannot_read_entry_fee_receipts;
