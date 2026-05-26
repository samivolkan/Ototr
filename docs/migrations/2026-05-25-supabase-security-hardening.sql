-- OTOTR Supabase security and performance hardening.
--
-- Purpose:
-- 1) Pin public function search_path so functions do not inherit caller state.
-- 2) Remove anonymous/public execute rights from privileged functions.
-- 3) Keep only app-facing RPCs and RLS helpers executable by authenticated users.
-- 4) Add a read policy for report_delivery_events.
-- 5) Add covering indexes for foreign keys reported by Supabase advisors.

-- Function search_path hardening.
alter function public.set_updated_at() set search_path = public;
alter function public.prevent_locked_case_child_mutation() set search_path = public;
alter function public.audit_report_child_mutation() set search_path = public;
alter function public.approve_expertise_case(uuid, uuid) set search_path = public;
alter function public.request_expertise_case_revision(uuid, uuid, text) set search_path = public;
alter function public.current_app_user() set search_path = public;
alter function public.current_user_can_access_branch(uuid) set search_path = public;
alter function public.current_user_is_hq() set search_path = public;
alter function public.current_app_user_id() set search_path = public;
alter function public.current_app_user_role() set search_path = public;
alter function public.append_task_history(jsonb, text, uuid, uuid, uuid, text) set search_path = public;
alter function public.append_task_audit(jsonb, text, uuid, text) set search_path = public;
alter function public.log_task_audit(uuid, uuid, text, uuid, text, jsonb, jsonb) set search_path = public;
alter function public.claim_inspection_task(uuid) set search_path = public;
alter function public.release_inspection_task(uuid, text) set search_path = public;
alter function public.manager_assign_inspection_task(uuid, uuid, text) set search_path = public;
alter function public.manager_clear_inspection_task_owner(uuid, text) set search_path = public;
alter function public.manager_return_inspection_task(uuid, text) set search_path = public;
alter function public.submit_inspection_task(uuid) set search_path = public;
alter function public.enforce_inspection_task_owner_mutation() set search_path = public;
alter function public.enforce_inspection_child_task_owner_mutation() set search_path = public;
alter function public.list_branch_technicians() set search_path = public;

-- Start from no direct external execution. Grants below re-open only the
-- functions that the app or RLS policies must call.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from authenticated;

-- RLS helper functions used by policies.
grant execute on function public.current_user_can_access_branch(uuid) to authenticated;
grant execute on function public.current_user_is_hq() to authenticated;

-- App-facing RPC functions.
grant execute on function public.list_branch_technicians() to authenticated;
grant execute on function public.claim_inspection_task(uuid) to authenticated;
grant execute on function public.release_inspection_task(uuid, text) to authenticated;
grant execute on function public.manager_assign_inspection_task(uuid, uuid, text) to authenticated;
grant execute on function public.manager_clear_inspection_task_owner(uuid, text) to authenticated;
grant execute on function public.manager_return_inspection_task(uuid, text) to authenticated;
grant execute on function public.submit_inspection_task(uuid) to authenticated;

-- These report approval RPCs currently trust caller-supplied actor ids and are
-- not used by the Flutter app yet. Keep them closed until they are rebuilt
-- with auth.uid()-based actor resolution and role checks.
revoke execute on function public.approve_expertise_case(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.request_expertise_case_revision(uuid, uuid, text) from public, anon, authenticated;

-- Avoid per-row auth.uid() re-evaluation in the app_users policy.
drop policy if exists app_users_self_or_hq on public.app_users;
create policy app_users_self_or_hq
on public.app_users
for select
to authenticated
using (
  auth_user_id = (select auth.uid())
  or (select public.current_user_is_hq())
);

-- report_delivery_events had RLS enabled with no policy. Read access follows
-- the same branch-access model as the parent expertise case.
drop policy if exists report_delivery_events_case_access on public.report_delivery_events;
create policy report_delivery_events_case_access
on public.report_delivery_events
for select
to authenticated
using (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.id = report_delivery_events.expertise_case_id
      and public.current_user_can_access_branch(ec.branch_id)
  )
);

-- Covering indexes for foreign keys reported by Supabase performance advisors.
create index if not exists idx_app_users_branch_id on public.app_users(branch_id);

create index if not exists idx_appointments_assigned_user_id on public.appointments(assigned_user_id);
create index if not exists idx_appointments_branch_id on public.appointments(branch_id);
create index if not exists idx_appointments_customer_id on public.appointments(customer_id);
create index if not exists idx_appointments_package_plan_id on public.appointments(package_plan_id);
create index if not exists idx_appointments_vehicle_id on public.appointments(vehicle_id);

create index if not exists idx_expertise_cases_appointment_id on public.expertise_cases(appointment_id);
create index if not exists idx_expertise_cases_assigned_technician_id on public.expertise_cases(assigned_technician_id);
create index if not exists idx_expertise_cases_created_by on public.expertise_cases(created_by);
create index if not exists idx_expertise_cases_customer_id on public.expertise_cases(customer_id);
create index if not exists idx_expertise_cases_manager_approved_by on public.expertise_cases(manager_approved_by);
create index if not exists idx_expertise_cases_package_plan_id on public.expertise_cases(package_plan_id);
create index if not exists idx_expertise_cases_technical_supervisor_id on public.expertise_cases(technical_supervisor_id);
create index if not exists idx_expertise_cases_updated_by on public.expertise_cases(updated_by);

create index if not exists idx_external_query_results_expertise_case_id on public.external_query_results(expertise_case_id);

create index if not exists idx_inspection_evidence_assets_captured_by on public.inspection_evidence_assets(captured_by);
create index if not exists idx_inspection_evidence_assets_item_value_id on public.inspection_evidence_assets(item_value_id);
create index if not exists idx_inspection_evidence_assets_task_id on public.inspection_evidence_assets(task_id);

create index if not exists idx_inspection_item_values_created_by on public.inspection_item_values(created_by);
create index if not exists idx_inspection_item_values_task_id on public.inspection_item_values(task_id);
create index if not exists idx_inspection_item_values_updated_by on public.inspection_item_values(updated_by);

create index if not exists idx_inspection_tasks_assigned_by_manager_id on public.inspection_tasks(assigned_by_manager_id);
create index if not exists idx_inspection_tasks_assigned_user_id on public.inspection_tasks(assigned_user_id);
create index if not exists idx_inspection_tasks_released_by_user_id on public.inspection_tasks(released_by_user_id);

create index if not exists idx_report_audit_logs_actor_id on public.report_audit_logs(actor_id);

create index if not exists idx_report_delivery_events_delivered_by on public.report_delivery_events(delivered_by);
create index if not exists idx_report_delivery_events_expertise_case_id on public.report_delivery_events(expertise_case_id);

create index if not exists idx_report_gate_issues_task_id on public.report_gate_issues(task_id);

create index if not exists idx_report_revisions_requested_by on public.report_revisions(requested_by);

create index if not exists idx_technician_start_evidence_captured_by on public.technician_start_evidence(captured_by);

create index if not exists idx_vehicles_customer_id on public.vehicles(customer_id);
