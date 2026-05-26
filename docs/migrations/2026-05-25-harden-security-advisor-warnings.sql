-- Tighten Supabase security advisor findings without changing app behavior.
-- Keeps only the RPC functions the mobile app currently calls executable by
-- authenticated users, removes anonymous access, and fixes mutable search_path.

-- report_delivery_events is read through branch-scoped RLS only.
alter table public.report_delivery_events enable row level security;

revoke all on table public.report_delivery_events from anon;
revoke delete, truncate, references, trigger on table public.report_delivery_events
  from authenticated;
grant select, insert on table public.report_delivery_events to authenticated;

drop policy if exists report_delivery_events_case_access
  on public.report_delivery_events;
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

drop policy if exists report_delivery_events_insert_case_access
  on public.report_delivery_events;
create policy report_delivery_events_insert_case_access
  on public.report_delivery_events
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.expertise_cases ec
      where ec.id = report_delivery_events.expertise_case_id
        and public.current_user_can_access_branch(ec.branch_id)
    )
  );

-- Fix mutable search_path findings.
alter function public.set_updated_at() set search_path = public;
alter function public.prevent_locked_case_child_mutation()
  set search_path = public;
alter function public.audit_report_child_mutation() set search_path = public;
alter function public.approve_expertise_case(uuid, uuid) set search_path = public;
alter function public.request_expertise_case_revision(uuid, uuid, text)
  set search_path = public;
alter function public.current_app_user() set search_path = public;
alter function public.current_user_can_access_branch(uuid)
  set search_path = public;
alter function public.current_app_user_id() set search_path = public;
alter function public.current_app_user_role() set search_path = public;
alter function public.append_task_history(jsonb, text, uuid, uuid, uuid, text)
  set search_path = public;
alter function public.append_task_audit(jsonb, text, uuid, text)
  set search_path = public;
alter function public.log_task_audit(uuid, uuid, text, uuid, text, jsonb, jsonb)
  set search_path = public;
alter function public.claim_inspection_task(uuid) set search_path = public;
alter function public.submit_inspection_task(uuid) set search_path = public;
alter function public.manager_return_inspection_task(uuid, text)
  set search_path = public;
alter function public.enforce_inspection_task_owner_mutation()
  set search_path = public;
alter function public.enforce_inspection_child_task_owner_mutation()
  set search_path = public;
alter function public.release_inspection_task(uuid, text) set search_path = public;
alter function public.manager_assign_inspection_task(uuid, uuid, text)
  set search_path = public;
alter function public.manager_clear_inspection_task_owner(uuid, text)
  set search_path = public;
alter function public.current_user_is_hq() set search_path = public;
alter function public.list_branch_technicians() set search_path = public;

-- Remove public/anonymous execution from SECURITY DEFINER functions.
revoke execute on function public.approve_expertise_case(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.request_expertise_case_revision(uuid, uuid, text)
  from public, anon, authenticated;
revoke execute on function public.current_app_user()
  from public, anon, authenticated;
revoke execute on function public.current_app_user_id()
  from public, anon, authenticated;
revoke execute on function public.current_app_user_role()
  from public, anon, authenticated;
revoke execute on function public.log_task_audit(uuid, uuid, text, uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
revoke execute on function public.enforce_inspection_task_owner_mutation()
  from public, anon, authenticated;
revoke execute on function public.enforce_inspection_child_task_owner_mutation()
  from public, anon, authenticated;

revoke execute on function public.current_user_can_access_branch(uuid)
  from public, anon;
revoke execute on function public.current_user_is_hq() from public, anon;

revoke execute on function public.claim_inspection_task(uuid) from public, anon;
revoke execute on function public.submit_inspection_task(uuid) from public, anon;
revoke execute on function public.release_inspection_task(uuid, text)
  from public, anon;
revoke execute on function public.manager_return_inspection_task(uuid, text)
  from public, anon;
revoke execute on function public.manager_assign_inspection_task(uuid, uuid, text)
  from public, anon;
revoke execute on function public.manager_clear_inspection_task_owner(uuid, text)
  from public, anon;
revoke execute on function public.list_branch_technicians() from public, anon;

-- Explicitly keep only app-facing RPCs available to signed-in users.
grant execute on function public.claim_inspection_task(uuid) to authenticated;
grant execute on function public.submit_inspection_task(uuid) to authenticated;
grant execute on function public.release_inspection_task(uuid, text)
  to authenticated;
grant execute on function public.manager_return_inspection_task(uuid, text)
  to authenticated;
grant execute on function public.manager_assign_inspection_task(uuid, uuid, text)
  to authenticated;
grant execute on function public.manager_clear_inspection_task_owner(uuid, text)
  to authenticated;
grant execute on function public.list_branch_technicians() to authenticated;

-- Helper functions used by RLS policies must remain executable for policy
-- evaluation, but are no longer anonymous.
grant execute on function public.current_user_can_access_branch(uuid)
  to authenticated;
grant execute on function public.current_user_is_hq() to authenticated;
