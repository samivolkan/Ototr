-- Move RLS helper functions out of the public API schema.
--
-- Public RPC functions remain public because Flutter calls them through
-- PostgREST. RLS-only helpers live in app_private so they are not exposed as
-- /rpc endpoints in the public schema.

create schema if not exists app_private;

revoke all on schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;

create or replace function app_private.current_user_is_hq()
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

create or replace function app_private.current_user_can_access_branch(
  target_branch_id uuid
)
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
      and (
        u.role in ('CEO', 'GENERAL_MANAGER', 'QUALITY_AUDITOR', 'FINANCE', 'LEGAL')
        or u.branch_id = target_branch_id
      )
  );
$$;

revoke execute on function app_private.current_user_is_hq() from public, anon, authenticated;
revoke execute on function app_private.current_user_can_access_branch(uuid) from public, anon, authenticated;
grant execute on function app_private.current_user_is_hq() to authenticated;
grant execute on function app_private.current_user_can_access_branch(uuid) to authenticated;

revoke execute on function public.current_user_is_hq() from public, anon, authenticated;
revoke execute on function public.current_user_can_access_branch(uuid) from public, anon, authenticated;

drop policy if exists branches_branch_access on public.branches;
create policy branches_branch_access
on public.branches
for select
to authenticated
using (app_private.current_user_can_access_branch(id));

drop policy if exists app_users_self_or_hq on public.app_users;
create policy app_users_self_or_hq
on public.app_users
for select
to authenticated
using (
  auth_user_id = (select auth.uid())
  or (select app_private.current_user_is_hq())
);

drop policy if exists customers_case_access on public.customers;
create policy customers_case_access
on public.customers
for select
to authenticated
using (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.customer_id = customers.id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists vehicles_case_access on public.vehicles;
create policy vehicles_case_access
on public.vehicles
for select
to authenticated
using (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.vehicle_id = vehicles.id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists appointments_branch_access on public.appointments;
create policy appointments_branch_access
on public.appointments
for select
to authenticated
using (app_private.current_user_can_access_branch(branch_id));

drop policy if exists expertise_cases_branch_access on public.expertise_cases;
create policy expertise_cases_branch_access
on public.expertise_cases
for select
to authenticated
using (app_private.current_user_can_access_branch(branch_id));

drop policy if exists expertise_cases_branch_insert on public.expertise_cases;
create policy expertise_cases_branch_insert
on public.expertise_cases
for insert
to authenticated
with check (app_private.current_user_can_access_branch(branch_id));

drop policy if exists expertise_cases_branch_update on public.expertise_cases;
create policy expertise_cases_branch_update
on public.expertise_cases
for update
to authenticated
using (app_private.current_user_can_access_branch(branch_id))
with check (app_private.current_user_can_access_branch(branch_id));

drop policy if exists report_gate_issues_case_access on public.report_gate_issues;
create policy report_gate_issues_case_access
on public.report_gate_issues
for select
to authenticated
using (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.id = report_gate_issues.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists report_revisions_case_access on public.report_revisions;
create policy report_revisions_case_access
on public.report_revisions
for select
to authenticated
using (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.id = report_revisions.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists report_audit_logs_case_access on public.report_audit_logs;
create policy report_audit_logs_case_access
on public.report_audit_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.id = report_audit_logs.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists start_evidence_case_access on public.technician_start_evidence;
create policy start_evidence_case_access
on public.technician_start_evidence
for all
to authenticated
using (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.id = technician_start_evidence.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.id = technician_start_evidence.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists inspection_tasks_case_access on public.inspection_tasks;
create policy inspection_tasks_case_access
on public.inspection_tasks
for all
to authenticated
using (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.id = inspection_tasks.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.id = inspection_tasks.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists inspection_values_case_access on public.inspection_item_values;
create policy inspection_values_case_access
on public.inspection_item_values
for all
to authenticated
using (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.id = inspection_item_values.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.id = inspection_item_values.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists evidence_assets_case_access on public.inspection_evidence_assets;
create policy evidence_assets_case_access
on public.inspection_evidence_assets
for all
to authenticated
using (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.id = inspection_evidence_assets.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.id = inspection_evidence_assets.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists external_queries_case_access on public.external_query_results;
create policy external_queries_case_access
on public.external_query_results
for all
to authenticated
using (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.id = external_query_results.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
)
with check (
  exists (
    select 1
    from public.expertise_cases ec
    where ec.id = external_query_results.expertise_case_id
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);

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
      and app_private.current_user_can_access_branch(ec.branch_id)
  )
);
