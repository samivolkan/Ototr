-- RLS read policies required by the Flutter Supabase data source.
-- Run after 2026-05-24-expertise-report-backbone.sql if the base migration
-- was already applied before these policies were added.

alter table package_plans enable row level security;

drop policy if exists package_plans_authenticated_read on package_plans;
create policy package_plans_authenticated_read
on package_plans
for select
to authenticated
using (is_active = true);

drop policy if exists customers_case_access on customers;
create policy customers_case_access
on customers
for select
to authenticated
using (
  exists (
    select 1
    from expertise_cases ec
    where ec.customer_id = customers.id
      and current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists vehicles_case_access on vehicles;
create policy vehicles_case_access
on vehicles
for select
to authenticated
using (
  exists (
    select 1
    from expertise_cases ec
    where ec.vehicle_id = vehicles.id
      and current_user_can_access_branch(ec.branch_id)
  )
);

drop policy if exists appointments_branch_access on appointments;
create policy appointments_branch_access
on appointments
for select
to authenticated
using (current_user_can_access_branch(branch_id));
