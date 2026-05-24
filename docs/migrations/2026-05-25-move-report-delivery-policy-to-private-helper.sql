-- Use private RLS helpers for report delivery events so helper functions are
-- not exposed through the public REST RPC surface.

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
        and app_private.current_user_can_access_branch(ec.branch_id)
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
        and app_private.current_user_can_access_branch(ec.branch_id)
    )
  );

revoke execute on function public.current_user_can_access_branch(uuid)
  from public, anon, authenticated;
revoke execute on function public.current_user_is_hq()
  from public, anon, authenticated;
