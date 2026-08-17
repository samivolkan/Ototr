-- Task Center V2 is authenticated-only. Older Supabase projects may still
-- auto-grant new public-schema tables to anon, so revoke that API surface
-- explicitly and then restore only the permissions used by the V2 client.
revoke all on table
  public.task_organizations,
  public.task_organization_branches,
  public.task_projects,
  public.task_categories,
  public.task_tasks,
  public.task_assignees,
  public.task_checklist_items,
  public.task_comments,
  public.task_attachments,
  public.task_activity_logs,
  public.task_approvals,
  public.task_templates,
  public.task_template_categories,
  public.task_template_tasks
from public, anon;

grant select, insert, update on table
  public.task_projects,
  public.task_categories,
  public.task_tasks,
  public.task_checklist_items,
  public.task_comments,
  public.task_attachments
to authenticated;

grant select, insert, update, delete on table public.task_assignees to authenticated;
grant select on table public.task_activity_logs, public.task_approvals to authenticated;
grant select, insert, update on table
  public.task_organizations,
  public.task_organization_branches,
  public.task_templates,
  public.task_template_categories,
  public.task_template_tasks
to authenticated;

-- Trigger functions are internal implementation details and are never called
-- through the Data API. Triggers continue to execute without caller grants.
revoke all on function app_private.enforce_task_center_status_gate() from public, anon, authenticated;
revoke all on function app_private.log_task_center_task_change() from public, anon, authenticated;
revoke all on function app_private.log_task_center_child_change() from public, anon, authenticated;
revoke all on function app_private.enforce_task_checklist_completion() from public, anon, authenticated;
