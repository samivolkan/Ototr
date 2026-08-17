-- Cover foreign keys that are expected in assignee, audit, approval and
-- template lookups. All statements are additive and safe on existing data.
create index if not exists idx_task_activity_user on public.task_activity_logs(user_id);
create index if not exists idx_task_approvals_requested_by on public.task_approvals(requested_by);
create index if not exists idx_task_approvals_reviewed_by on public.task_approvals(reviewed_by);
create index if not exists idx_task_assignees_assigned_by on public.task_assignees(assigned_by);
create index if not exists idx_task_attachments_uploaded_by on public.task_attachments(uploaded_by);
create index if not exists idx_task_categories_created_by on public.task_categories(created_by);
create index if not exists idx_task_checklist_assigned_user on public.task_checklist_items(assigned_to_user_id);
create index if not exists idx_task_checklist_completed_by on public.task_checklist_items(completed_by);
create index if not exists idx_task_comments_user on public.task_comments(user_id);
create index if not exists idx_task_org_branches_branch on public.task_organization_branches(branch_id);
create index if not exists idx_task_projects_created_by on public.task_projects(created_by);
create index if not exists idx_task_tasks_completed_by on public.task_tasks(completed_by);
create index if not exists idx_task_tasks_created_by on public.task_tasks(created_by);
create index if not exists idx_task_template_tasks_template on public.task_template_tasks(template_id);
create index if not exists idx_task_templates_created_by on public.task_templates(created_by);

-- Avoid overlapping permissive SELECT policies. Mutation policies are kept
-- action-specific so read access has one unambiguous policy per table.
drop policy if exists task_assignees_manage on public.task_assignees;
create policy task_assignees_insert on public.task_assignees
  for insert to authenticated
  with check (
    assigned_by=app_private.task_current_app_user_id()
    and exists(
      select 1 from public.task_tasks t
      where t.id=task_id and app_private.task_can_manage_project(t.project_id)
    )
  );
create policy task_assignees_delete on public.task_assignees
  for delete to authenticated
  using (
    exists(
      select 1 from public.task_tasks t
      where t.id=task_id and app_private.task_can_manage_project(t.project_id)
    )
  );
revoke update on table public.task_assignees from authenticated;

drop policy if exists task_checklist_mutate on public.task_checklist_items;
create policy task_checklist_insert on public.task_checklist_items
  for insert to authenticated
  with check (app_private.task_can_mutate(task_id));
create policy task_checklist_update on public.task_checklist_items
  for update to authenticated
  using (app_private.task_can_mutate(task_id))
  with check (app_private.task_can_mutate(task_id));

drop policy if exists task_org_manage on public.task_organizations;
create policy task_org_insert on public.task_organizations
  for insert to authenticated
  with check (app_private.current_user_is_hq());
create policy task_org_update on public.task_organizations
  for update to authenticated
  using (app_private.current_user_is_hq())
  with check (app_private.current_user_is_hq());

drop policy if exists task_org_branches_manage on public.task_organization_branches;
create policy task_org_branches_insert on public.task_organization_branches
  for insert to authenticated
  with check (app_private.current_user_is_hq());
create policy task_org_branches_update on public.task_organization_branches
  for update to authenticated
  using (app_private.current_user_is_hq())
  with check (app_private.current_user_is_hq());

drop policy if exists task_templates_manage on public.task_templates;
create policy task_templates_insert on public.task_templates
  for insert to authenticated
  with check (app_private.current_user_is_hq());
create policy task_templates_update on public.task_templates
  for update to authenticated
  using (app_private.current_user_is_hq())
  with check (app_private.current_user_is_hq());

drop policy if exists task_template_categories_manage on public.task_template_categories;
create policy task_template_categories_insert on public.task_template_categories
  for insert to authenticated
  with check (app_private.current_user_is_hq());
create policy task_template_categories_update on public.task_template_categories
  for update to authenticated
  using (app_private.current_user_is_hq())
  with check (app_private.current_user_is_hq());

drop policy if exists task_template_tasks_manage on public.task_template_tasks;
create policy task_template_tasks_insert on public.task_template_tasks
  for insert to authenticated
  with check (app_private.current_user_is_hq());
create policy task_template_tasks_update on public.task_template_tasks
  for update to authenticated
  using (app_private.current_user_is_hq())
  with check (app_private.current_user_is_hq());
