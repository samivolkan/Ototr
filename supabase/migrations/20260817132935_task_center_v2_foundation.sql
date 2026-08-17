-- OTOTR Task Center V2 foundation. Additive/non-destructive migration.
-- Existing task, expertise, CRM, branch and user tables are not modified.

create extension if not exists pgcrypto;
create schema if not exists app_private;

create table if not exists public.task_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.task_organization_branches (
  organization_id uuid not null references public.task_organizations(id),
  branch_id uuid not null references public.branches(id),
  created_at timestamptz not null default now(),
  primary key (organization_id, branch_id)
);

create table if not exists public.task_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.task_organizations(id),
  branch_id uuid references public.branches(id),
  name text not null,
  description text,
  project_type text not null default 'other' check (project_type in ('branch_transformation','branch_opening','operations','marketing','software','legal','other')),
  status text not null default 'draft' check (status in ('draft','active','on_hold','completed','cancelled')),
  start_date date,
  target_date date,
  completed_at timestamptz,
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.task_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.task_projects(id),
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_by uuid not null references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (project_id, name)
);

create table if not exists public.task_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.task_projects(id),
  category_id uuid not null references public.task_categories(id),
  parent_task_id uuid references public.task_tasks(id),
  title text not null check (length(trim(title)) > 0),
  description text,
  status text not null default 'todo' check (status in ('todo','doing','review','done','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  due_at timestamptz,
  start_at timestamptz,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  actual_minutes integer check (actual_minutes is null or actual_minutes >= 0),
  requires_approval boolean not null default false,
  requires_evidence boolean not null default false,
  created_by uuid not null references public.app_users(id),
  completed_by uuid references public.app_users(id),
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint task_parent_not_self check (parent_task_id is null or parent_task_id <> id)
);

create table if not exists public.task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.task_tasks(id),
  user_id uuid not null references public.app_users(id),
  assigned_by uuid not null references public.app_users(id),
  assigned_at timestamptz not null default now(),
  unique (task_id, user_id)
);

create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.task_tasks(id),
  title text not null check (length(trim(title)) > 0),
  is_completed boolean not null default false,
  assigned_to_user_id uuid references public.app_users(id),
  due_at timestamptz,
  sort_order integer not null default 0,
  completed_by uuid references public.app_users(id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.task_tasks(id),
  user_id uuid not null references public.app_users(id),
  comment text not null check (length(trim(comment)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.task_tasks(id),
  uploaded_by uuid not null references public.app_users(id),
  storage_bucket text not null default 'task-evidence',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  attachment_type text not null default 'general' check (attachment_type in ('general','evidence','approval','invoice','design','photo','document')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (storage_bucket, storage_path)
);

create table if not exists public.task_activity_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.task_tasks(id),
  user_id uuid references public.app_users(id),
  action text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.task_approvals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.task_tasks(id),
  requested_by uuid not null references public.app_users(id),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references public.app_users(id),
  reviewed_at timestamptz,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  comment text
);

create unique index if not exists idx_task_approvals_one_pending on public.task_approvals(task_id) where status = 'pending';

create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  version text not null,
  is_active boolean not null default true,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  unique (name, version)
);

create table if not exists public.task_template_categories (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.task_templates(id),
  name text not null,
  description text,
  sort_order integer not null default 0,
  unique (template_id, name)
);

create table if not exists public.task_template_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.task_templates(id),
  template_category_id uuid not null references public.task_template_categories(id),
  title text not null,
  description text,
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  sort_order integer not null default 0,
  requires_approval boolean not null default false,
  requires_evidence boolean not null default false,
  unique (template_category_id, sort_order)
);

create index if not exists idx_task_projects_branch_active on public.task_projects(branch_id, archived_at);
create index if not exists idx_task_projects_org_status on public.task_projects(organization_id, status) where archived_at is null;
create index if not exists idx_task_categories_project_order on public.task_categories(project_id, sort_order) where archived_at is null;
create index if not exists idx_task_tasks_project_status on public.task_tasks(project_id, status) where archived_at is null;
create index if not exists idx_task_tasks_category_order on public.task_tasks(category_id, sort_order) where archived_at is null;
create index if not exists idx_task_tasks_parent on public.task_tasks(parent_task_id) where parent_task_id is not null;
create index if not exists idx_task_tasks_due on public.task_tasks(due_at) where archived_at is null and status not in ('done','cancelled');
create index if not exists idx_task_assignees_user on public.task_assignees(user_id, task_id);
create index if not exists idx_task_checklist_task on public.task_checklist_items(task_id, sort_order);
create index if not exists idx_task_comments_task on public.task_comments(task_id, created_at) where deleted_at is null;
create index if not exists idx_task_attachments_task on public.task_attachments(task_id, created_at) where deleted_at is null;
create index if not exists idx_task_activity_task on public.task_activity_logs(task_id, created_at desc);
create index if not exists idx_task_approvals_task on public.task_approvals(task_id, requested_at desc);

create or replace function app_private.task_current_app_user_id()
returns uuid language sql stable security definer set search_path = public, pg_temp as $$
  select id from public.app_users where auth_user_id = (select auth.uid()) and is_active = true limit 1
$$;

create or replace function app_private.task_can_access_project(target_project_id uuid)
returns boolean language sql stable security definer set search_path = public, app_private, pg_temp as $$
  select exists (
    select 1 from public.task_projects p
    where p.id = target_project_id
      and p.archived_at is null
      and ((p.branch_id is null and app_private.current_user_is_hq())
        or (p.branch_id is not null and app_private.current_user_can_access_branch(p.branch_id)))
  )
$$;

create or replace function app_private.task_can_manage_project(target_project_id uuid)
returns boolean language sql stable security definer set search_path = public, app_private, pg_temp as $$
  select exists (
    select 1 from public.task_projects p
    where p.id = target_project_id
      and p.archived_at is null
      and ((p.branch_id is null and app_private.current_user_is_hq())
        or (p.branch_id is not null and (app_private.current_user_is_hq() or app_private.current_user_can_manage_branch(p.branch_id))))
  )
$$;

create or replace function app_private.task_can_access(target_task_id uuid)
returns boolean language sql stable security definer set search_path = public, app_private, pg_temp as $$
  select exists (select 1 from public.task_tasks t where t.id = target_task_id and app_private.task_can_access_project(t.project_id))
$$;

create or replace function app_private.task_can_mutate(target_task_id uuid)
returns boolean language sql stable security definer set search_path = public, app_private, pg_temp as $$
  select exists (
    select 1 from public.task_tasks t
    where t.id = target_task_id and (
      app_private.task_can_manage_project(t.project_id)
      or exists (select 1 from public.task_assignees a where a.task_id = t.id and a.user_id = app_private.task_current_app_user_id())
    )
  )
$$;

revoke all on function app_private.task_current_app_user_id() from public, anon;
revoke all on function app_private.task_can_access_project(uuid) from public, anon;
revoke all on function app_private.task_can_manage_project(uuid) from public, anon;
revoke all on function app_private.task_can_access(uuid) from public, anon;
revoke all on function app_private.task_can_mutate(uuid) from public, anon;
grant execute on function app_private.task_current_app_user_id() to authenticated;
grant execute on function app_private.task_can_access_project(uuid) to authenticated;
grant execute on function app_private.task_can_manage_project(uuid) to authenticated;
grant execute on function app_private.task_can_access(uuid) to authenticated;
grant execute on function app_private.task_can_mutate(uuid) to authenticated;

create or replace function app_private.enforce_task_center_status_gate()
returns trigger language plpgsql security definer set search_path = public, app_private, pg_temp as $$
begin
  if tg_op='UPDATE' and not app_private.task_can_manage_project(old.project_id) and row(
    new.project_id,new.category_id,new.parent_task_id,new.title,new.description,new.priority,new.due_at,new.start_at,
    new.estimated_minutes,new.requires_approval,new.requires_evidence,new.created_by,new.archived_at
  ) is distinct from row(
    old.project_id,old.category_id,old.parent_task_id,old.title,old.description,old.priority,old.due_at,old.start_at,
    old.estimated_minutes,old.requires_approval,old.requires_evidence,old.created_by,old.archived_at
  ) then raise exception 'Assignees may only update task execution fields' using errcode='42501'; end if;
  if not exists (
    select 1 from public.task_categories c where c.id = new.category_id and c.project_id = new.project_id and c.archived_at is null
  ) then raise exception 'Category does not belong to task project' using errcode = '23514'; end if;
  if new.parent_task_id is not null and not exists (
    select 1 from public.task_tasks p where p.id = new.parent_task_id and p.project_id = new.project_id and p.archived_at is null
  ) then raise exception 'Parent task does not belong to task project' using errcode = '23514'; end if;
  if new.status in ('review','done') and new.requires_evidence and not exists (
    select 1 from public.task_attachments a join storage.objects o on o.bucket_id=a.storage_bucket and o.name=a.storage_path
    where a.task_id = new.id and a.attachment_type = 'evidence' and a.deleted_at is null
  ) then raise exception 'Evidence is required before review or completion' using errcode = '23514'; end if;
  if new.status = 'done' and new.requires_approval and coalesce((
    select a.status from public.task_approvals a where a.task_id=new.id order by a.requested_at desc,a.id desc limit 1
  ),'missing') <> 'approved' then raise exception 'Approval is required before completion' using errcode = '23514'; end if;
  if new.status = 'done' and (tg_op = 'INSERT' or old.status <> 'done') then
    new.completed_at := now(); new.completed_by := app_private.task_current_app_user_id();
  elsif new.status <> 'done' then new.completed_at := null; new.completed_by := null; end if;
  return new;
end $$;

drop trigger if exists trg_task_center_status_gate on public.task_tasks;
create trigger trg_task_center_status_gate before insert or update on public.task_tasks for each row execute function app_private.enforce_task_center_status_gate();

create or replace function app_private.log_task_center_task_change()
returns trigger language plpgsql security definer set search_path = public, app_private, pg_temp as $$
begin
  insert into public.task_activity_logs(task_id,user_id,action,old_value,new_value)
  values (new.id, app_private.task_current_app_user_id(), case when tg_op='INSERT' then 'task_created' when old.status is distinct from new.status then 'status_changed' else 'task_updated' end, case when tg_op='UPDATE' then to_jsonb(old) end, to_jsonb(new));
  return new;
end $$;

drop trigger if exists trg_task_center_activity on public.task_tasks;
create trigger trg_task_center_activity after insert or update on public.task_tasks for each row execute function app_private.log_task_center_task_change();

create or replace function app_private.log_task_center_child_change()
returns trigger language plpgsql security definer set search_path = public, app_private, pg_temp as $$
declare row_task_id uuid; action_name text;
begin
  row_task_id := case when tg_op='DELETE' then old.task_id else new.task_id end;
  action_name := case
    when tg_table_name='task_assignees' and tg_op='INSERT' then 'assignee_added'
    when tg_table_name='task_assignees' and tg_op='DELETE' then 'assignee_removed'
    when tg_table_name='task_comments' then 'comment_added'
    when tg_table_name='task_attachments' then 'attachment_added'
    when tg_table_name='task_approvals' and tg_op='INSERT' then 'approval_requested'
    when tg_table_name='task_approvals' and tg_op='UPDATE' and new.status='approved' then 'approved'
    when tg_table_name='task_approvals' and tg_op='UPDATE' and new.status='rejected' then 'rejected'
    when tg_table_name='task_checklist_items' and tg_op='INSERT' then 'checklist_added'
    when tg_table_name='task_checklist_items' and tg_op='UPDATE' and new.is_completed and not old.is_completed then 'checklist_completed'
    else tg_table_name||'_'||lower(tg_op) end;
  insert into public.task_activity_logs(task_id,user_id,action,old_value,new_value)
  values(row_task_id,app_private.task_current_app_user_id(),action_name,case when tg_op<>'INSERT' then to_jsonb(old) end,case when tg_op<>'DELETE' then to_jsonb(new) end);
  return case when tg_op='DELETE' then old else new end;
end $$;

create or replace function app_private.enforce_task_checklist_completion()
returns trigger language plpgsql security definer set search_path = public, app_private, pg_temp as $$
begin
  if new.is_completed and (tg_op='INSERT' or not old.is_completed) then new.completed_at:=now();new.completed_by:=app_private.task_current_app_user_id();
  elsif not new.is_completed then new.completed_at:=null;new.completed_by:=null;end if;return new;
end $$;

drop trigger if exists trg_task_checklist_completion on public.task_checklist_items;
create trigger trg_task_checklist_completion before insert or update on public.task_checklist_items for each row execute function app_private.enforce_task_checklist_completion();
drop trigger if exists trg_task_assignees_activity on public.task_assignees;
create trigger trg_task_assignees_activity after insert or delete on public.task_assignees for each row execute function app_private.log_task_center_child_change();
drop trigger if exists trg_task_checklist_activity on public.task_checklist_items;
create trigger trg_task_checklist_activity after insert or update on public.task_checklist_items for each row execute function app_private.log_task_center_child_change();
drop trigger if exists trg_task_comments_activity on public.task_comments;
create trigger trg_task_comments_activity after insert on public.task_comments for each row execute function app_private.log_task_center_child_change();
drop trigger if exists trg_task_attachments_activity on public.task_attachments;
create trigger trg_task_attachments_activity after insert on public.task_attachments for each row execute function app_private.log_task_center_child_change();
drop trigger if exists trg_task_approvals_activity on public.task_approvals;
create trigger trg_task_approvals_activity after insert or update on public.task_approvals for each row execute function app_private.log_task_center_child_change();

do $$ declare n text; begin
  foreach n in array array['task_organizations','task_projects','task_categories','task_tasks','task_checklist_items','task_comments'] loop
    execute format('drop trigger if exists %I on public.%I', 'trg_'||n||'_updated_at', n);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', 'trg_'||n||'_updated_at', n);
  end loop;
end $$;

create or replace function public.create_task_project_from_template(template_id uuid, branch_id uuid, project_name text, target_date date default null)
returns uuid language plpgsql security definer set search_path = public, app_private, pg_temp as $$
declare actor uuid; org uuid; project uuid;
begin
  actor := app_private.task_current_app_user_id();
  if actor is null then raise exception 'Authentication required' using errcode='28000'; end if;
  if branch_id is not null and not (app_private.current_user_is_hq() or app_private.current_user_can_manage_branch(branch_id)) then raise exception 'Branch access denied' using errcode='42501'; end if;
  if branch_id is null and not app_private.current_user_is_hq() then raise exception 'HQ access required' using errcode='42501'; end if;
  select organization_id into org from public.task_organization_branches where task_organization_branches.branch_id = create_task_project_from_template.branch_id limit 1;
  if org is null then select id into org from public.task_organizations where archived_at is null order by created_at limit 1; end if;
  if org is null then raise exception 'Task organization is not configured'; end if;
  if not exists(select 1 from public.task_templates x where x.id=create_task_project_from_template.template_id and x.is_active) then raise exception 'Active template not found'; end if;
  insert into public.task_projects(organization_id,branch_id,name,project_type,status,start_date,target_date,created_by)
  values(org,create_task_project_from_template.branch_id,trim(create_task_project_from_template.project_name),'branch_transformation','active',current_date,create_task_project_from_template.target_date,actor) returning id into project;
  insert into public.task_categories(id,project_id,name,description,sort_order,created_by)
  select gen_random_uuid(),project,c.name,c.description,c.sort_order,actor from public.task_template_categories c where c.template_id=create_task_project_from_template.template_id;
  insert into public.task_tasks(project_id,category_id,title,description,priority,requires_approval,requires_evidence,sort_order,created_by)
  select project,c.id,t.title,t.description,t.priority,t.requires_approval,t.requires_evidence,t.sort_order,actor
  from public.task_template_tasks t join public.task_template_categories tc on tc.id=t.template_category_id
  join public.task_categories c on c.project_id=project and c.name=tc.name where t.template_id=create_task_project_from_template.template_id;
  return project;
end $$;

create or replace function public.update_task_with_version(target_task_id uuid, expected_updated_at timestamptz, patch jsonb)
returns public.task_tasks language plpgsql security definer set search_path = public, app_private, pg_temp as $$
declare current_task public.task_tasks; result public.task_tasks;
begin
  if not app_private.task_can_mutate(target_task_id) then raise exception 'Task update denied' using errcode='42501'; end if;
  select * into current_task from public.task_tasks where id=target_task_id for update;
  if current_task.updated_at <> expected_updated_at then raise exception 'Stale task version' using errcode='40001'; end if;
  update public.task_tasks set
    title=coalesce(patch->>'title',title), description=case when patch?'description' then patch->>'description' else description end,
    status=coalesce(patch->>'status',status), priority=coalesce(patch->>'priority',priority),
    due_at=case when patch?'due_at' then nullif(patch->>'due_at','')::timestamptz else due_at end,
    actual_minutes=case when patch?'actual_minutes' then (patch->>'actual_minutes')::integer else actual_minutes end,
    archived_at=case when patch?'archived_at' then (patch->>'archived_at')::timestamptz else archived_at end
  where id=target_task_id returning * into result;
  return result;
end $$;

create or replace function public.request_task_approval(target_task_id uuid, request_comment text default null)
returns public.task_approvals language plpgsql security definer set search_path = public, app_private, pg_temp as $$
declare actor uuid; approval public.task_approvals;
begin
  actor:=app_private.task_current_app_user_id(); if not app_private.task_can_mutate(target_task_id) then raise exception 'Approval request denied' using errcode='42501'; end if;
  insert into public.task_approvals(task_id,requested_by,comment) values(target_task_id,actor,request_comment) returning * into approval;
  update public.task_tasks set status='review' where id=target_task_id;
  return approval;
end $$;

create or replace function public.approve_task(target_task_id uuid, review_comment text default null)
returns public.task_tasks language plpgsql security definer set search_path = public, app_private, pg_temp as $$
declare actor uuid; result public.task_tasks;
begin
  actor:=app_private.task_current_app_user_id();
  if not exists(select 1 from public.task_tasks t where t.id=target_task_id and app_private.task_can_manage_project(t.project_id)) then raise exception 'Approval denied' using errcode='42501'; end if;
  update public.task_approvals set status='approved',reviewed_by=actor,reviewed_at=now(),comment=coalesce(review_comment,comment) where task_id=target_task_id and status='pending';
  if not found then raise exception 'Pending approval not found'; end if;
  update public.task_tasks set status='done' where id=target_task_id returning * into result; return result;
end $$;

create or replace function public.reject_task(target_task_id uuid, review_comment text)
returns public.task_tasks language plpgsql security definer set search_path = public, app_private, pg_temp as $$
declare actor uuid; result public.task_tasks;
begin
  actor:=app_private.task_current_app_user_id();
  if nullif(trim(review_comment),'') is null then raise exception 'Rejection comment is required'; end if;
  if not exists(select 1 from public.task_tasks t where t.id=target_task_id and app_private.task_can_manage_project(t.project_id)) then raise exception 'Rejection denied' using errcode='42501'; end if;
  update public.task_approvals set status='rejected',reviewed_by=actor,reviewed_at=now(),comment=review_comment where task_id=target_task_id and status='pending';
  if not found then raise exception 'Pending approval not found'; end if;
  update public.task_tasks set status='doing' where id=target_task_id returning * into result; return result;
end $$;

revoke all on function public.create_task_project_from_template(uuid,uuid,text,date) from public, anon;
revoke all on function public.update_task_with_version(uuid,timestamptz,jsonb) from public, anon;
revoke all on function public.request_task_approval(uuid,text) from public, anon;
revoke all on function public.approve_task(uuid,text) from public, anon;
revoke all on function public.reject_task(uuid,text) from public, anon;
grant execute on function public.create_task_project_from_template(uuid,uuid,text,date) to authenticated;
grant execute on function public.update_task_with_version(uuid,timestamptz,jsonb) to authenticated;
grant execute on function public.request_task_approval(uuid,text) to authenticated;
grant execute on function public.approve_task(uuid,text) to authenticated;
grant execute on function public.reject_task(uuid,text) to authenticated;

do $$ declare n text; begin foreach n in array array['task_organizations','task_organization_branches','task_projects','task_categories','task_tasks','task_assignees','task_checklist_items','task_comments','task_attachments','task_activity_logs','task_approvals','task_templates','task_template_categories','task_template_tasks'] loop execute format('alter table public.%I enable row level security',n); end loop; end $$;

create policy task_projects_select on public.task_projects for select to authenticated using (app_private.task_can_access_project(id));
create policy task_projects_insert on public.task_projects for insert to authenticated with check (created_by=app_private.task_current_app_user_id() and ((branch_id is null and app_private.current_user_is_hq()) or (branch_id is not null and (app_private.current_user_is_hq() or app_private.current_user_can_manage_branch(branch_id)))));
create policy task_projects_update on public.task_projects for update to authenticated using (app_private.task_can_manage_project(id)) with check (app_private.task_can_manage_project(id));
create policy task_categories_select on public.task_categories for select to authenticated using (app_private.task_can_access_project(project_id));
create policy task_categories_insert on public.task_categories for insert to authenticated with check (created_by=app_private.task_current_app_user_id() and app_private.task_can_manage_project(project_id));
create policy task_categories_update on public.task_categories for update to authenticated using (app_private.task_can_manage_project(project_id)) with check (app_private.task_can_manage_project(project_id));
create policy task_tasks_select on public.task_tasks for select to authenticated using (app_private.task_can_access_project(project_id));
create policy task_tasks_insert on public.task_tasks for insert to authenticated with check (created_by=app_private.task_current_app_user_id() and app_private.task_can_manage_project(project_id));
create policy task_tasks_update on public.task_tasks for update to authenticated using (app_private.task_can_mutate(id)) with check (app_private.task_can_access_project(project_id));
create policy task_assignees_select on public.task_assignees for select to authenticated using (app_private.task_can_access(task_id));
create policy task_assignees_manage on public.task_assignees for all to authenticated using (exists(select 1 from public.task_tasks t where t.id=task_id and app_private.task_can_manage_project(t.project_id))) with check (assigned_by=app_private.task_current_app_user_id() and exists(select 1 from public.task_tasks t where t.id=task_id and app_private.task_can_manage_project(t.project_id)));
create policy task_checklist_select on public.task_checklist_items for select to authenticated using (app_private.task_can_access(task_id));
create policy task_checklist_mutate on public.task_checklist_items for all to authenticated using (app_private.task_can_mutate(task_id)) with check (app_private.task_can_mutate(task_id));
create policy task_comments_select on public.task_comments for select to authenticated using (app_private.task_can_access(task_id));
create policy task_comments_insert on public.task_comments for insert to authenticated with check (user_id=app_private.task_current_app_user_id() and app_private.task_can_access(task_id));
create policy task_comments_update on public.task_comments for update to authenticated using (user_id=app_private.task_current_app_user_id()) with check (user_id=app_private.task_current_app_user_id());
create policy task_attachments_select on public.task_attachments for select to authenticated using (app_private.task_can_access(task_id));
create policy task_attachments_insert on public.task_attachments for insert to authenticated with check (uploaded_by=app_private.task_current_app_user_id() and app_private.task_can_access(task_id));
create policy task_attachments_update on public.task_attachments for update to authenticated using (uploaded_by=app_private.task_current_app_user_id() or app_private.task_can_mutate(task_id)) with check (app_private.task_can_access(task_id));
create policy task_activity_select on public.task_activity_logs for select to authenticated using (app_private.task_can_access(task_id));
create policy task_approvals_select on public.task_approvals for select to authenticated using (app_private.task_can_access(task_id));
create policy task_templates_select on public.task_templates for select to authenticated using (is_active or app_private.current_user_is_hq());
create policy task_templates_manage on public.task_templates for all to authenticated using (app_private.current_user_is_hq()) with check (app_private.current_user_is_hq());
create policy task_template_categories_select on public.task_template_categories for select to authenticated using (exists(select 1 from public.task_templates t where t.id=template_id and (t.is_active or app_private.current_user_is_hq())));
create policy task_template_categories_manage on public.task_template_categories for all to authenticated using (app_private.current_user_is_hq()) with check (app_private.current_user_is_hq());
create policy task_template_tasks_select on public.task_template_tasks for select to authenticated using (exists(select 1 from public.task_templates t where t.id=template_id and (t.is_active or app_private.current_user_is_hq())));
create policy task_template_tasks_manage on public.task_template_tasks for all to authenticated using (app_private.current_user_is_hq()) with check (app_private.current_user_is_hq());
create policy task_org_select on public.task_organizations for select to authenticated using (app_private.current_user_is_hq() or exists(select 1 from public.task_organization_branches ob where ob.organization_id=id and app_private.current_user_can_access_branch(ob.branch_id)));
create policy task_org_manage on public.task_organizations for all to authenticated using (app_private.current_user_is_hq()) with check (app_private.current_user_is_hq());
create policy task_org_branches_select on public.task_organization_branches for select to authenticated using (app_private.current_user_is_hq() or app_private.current_user_can_access_branch(branch_id));
create policy task_org_branches_manage on public.task_organization_branches for all to authenticated using (app_private.current_user_is_hq()) with check (app_private.current_user_is_hq());

grant select,insert,update on public.task_projects,public.task_categories,public.task_tasks,public.task_assignees,public.task_checklist_items,public.task_comments,public.task_attachments to authenticated;
grant select on public.task_activity_logs,public.task_approvals to authenticated;
grant select,insert,update on public.task_organizations,public.task_organization_branches,public.task_templates,public.task_template_categories,public.task_template_tasks to authenticated;

insert into storage.buckets(id,name,public) values('task-evidence','task-evidence',false) on conflict(id) do update set public=false;
create or replace function app_private.task_storage_project_id(object_name text)
returns uuid language sql immutable set search_path = public, pg_temp as $$
  select case when split_part(object_name,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then split_part(object_name,'/',1)::uuid end
$$;
revoke all on function app_private.task_storage_project_id(text) from public, anon;
grant execute on function app_private.task_storage_project_id(text) to authenticated;
create policy task_evidence_read on storage.objects for select to authenticated using (bucket_id='task-evidence' and app_private.task_can_access_project(app_private.task_storage_project_id(name)));
create policy task_evidence_insert on storage.objects for insert to authenticated with check (bucket_id='task-evidence' and app_private.task_can_access_project(app_private.task_storage_project_id(name)));
create policy task_evidence_update on storage.objects for update to authenticated using (bucket_id='task-evidence' and app_private.task_can_access_project(app_private.task_storage_project_id(name))) with check (bucket_id='task-evidence' and app_private.task_can_access_project(app_private.task_storage_project_id(name)));
create policy task_evidence_delete on storage.objects for delete to authenticated using (bucket_id='task-evidence' and app_private.task_can_manage_project(app_private.task_storage_project_id(name)));

do $$ declare n text; begin foreach n in array array['task_tasks','task_assignees','task_checklist_items','task_comments','task_attachments','task_approvals'] loop if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=n) then execute format('alter publication supabase_realtime add table public.%I',n); end if; end loop; end $$;

-- Stable, idempotent seed: one template, eleven categories, exactly 100 original tasks.
insert into public.task_organizations(id,name,code)
values('30000000-0000-4000-8000-000000000001','OTOTR Merkez','OTOTR')
on conflict(code) do update set name=excluded.name;

insert into public.task_templates(id,name,description,version,is_active)
values('10000000-0000-4000-8000-000000000001','OTOTR Referans Şube Dönüşüm Şablonu','OTOTR bayi dönüşümü için doğrulanmış 100 maddelik başlangıç planı.','1.0',true)
on conflict(name,version) do update set description=excluded.description,is_active=true;

insert into public.task_template_categories(id,template_id,name,sort_order) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','A. Projeyi Başlatma ve Mevcut Durum',0),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','B. Dış Cephe ve Tabela',1),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','C. Müşteri Karşılama Alanı',2),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001','D. Kurumsal İç Mekân',3),
('20000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001','E. Ekspertiz Hattı ve Teknik Alan',4),
('20000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000001','F. Ekspertiz Operasyon Standardı',5),
('20000000-0000-4000-8000-000000000007','10000000-0000-4000-8000-000000000001','G. OTOTR Yazılım / ERP / Rapor',6),
('20000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000001','H. Müşteri Raporu ve Güven Sistemi',7),
('20000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000001','I. Personel ve Kurumsal Disiplin',8),
('20000000-0000-4000-8000-000000000010','10000000-0000-4000-8000-000000000001','J. Hukuki / Kurumsal / Ticari Hazırlık',9),
('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','K. Pilot Şube Lansmanı',10)
on conflict(template_id,name) do update set sort_order=excluded.sort_order;

with seed(category_id,titles) as (values
('20000000-0000-4000-8000-000000000001'::uuid,array['Mevcut dükkânın tüm alanlarının ölçülerini çıkar.','Dükkânın dış cephesinin karşıdan, sağdan ve soldan fotoğraflarını çek.','İç mekânın mevcut durumunu komple fotoğraf/video ile kayıt altına al.','Mevcut tabela ölçülerini çıkar.','Yol tarafından maksimum görünürlük sağlayacak tabela alanını belirle.','Araç giriş-çıkış güzergâhını planla.','Müşteri girişini ekspertiz araç girişinden mümkün olduğunca ayır.','Dükkân içindeki mevcut ekipmanların envanterini çıkar.','Kullanılacak, yenilenecek ve kaldırılacak ekipmanları ayır.','OTOTR dönüşümü için tadilat ve uygulama bütçesi oluştur.']),
('20000000-0000-4000-8000-000000000002'::uuid,array['Kilitlediğimiz OTOTR logosunu ana standart olarak kullan.','Ana dış cephe OTOTR tabela tasarımını kesinleştir.','Tabela için kesin üretim ölçülerini oluştur.','Gece görünürlüğü için tabela aydınlatmasını belirle.','Cephe renklerini OTOTR kurumsal kimliğine dönüştür.','Cam yüzeylere uygulanacak folyo/giydirme tasarımlarını hazırla.','Oto Ekspertiz hizmet tanımının dış cephedeki konumunu belirle.','Yol yönlendirme ve giriş tabelalarını hazırla.','Çalışma saatleri / iletişim bilgilerinin dış cephe uygulamasını hazırla.','İlk şubenin dış cephe uygulamasını ileride tüm bayilere uygulanabilecek standart olarak dokümante et.']),
('20000000-0000-4000-8000-000000000003'::uuid,array['Müşteri karşılama bankosunun yerini kesinleştir.','Daha önce çalıştığımız OTOTR karşılama bankosu tasarımını uygulamaya hazırla.','Banko arkasına ışıklı OTOTR logosu uygula.','Müşteri bekleme koltuklarını belirle.','Bekleme alanının masa/sehpa düzenini oluştur.','Müşteri Wi-Fi sistemini hazırla.','Telefon şarj noktaları oluştur.','Su/kahve ikram alanı oluştur.','Bekleme alanında ekran/TV konumlandır.','Ekranda OTOTR hizmetleri, süreç ve güven unsurlarını anlatacak içerik döngüsü hazırla.']),
('20000000-0000-4000-8000-000000000004'::uuid,array['İç duvarların OTOTR renk standardını belirle.','Zeminlerin mevcut durumunu kontrol et ve gerekiyorsa yenile.','Ekspertiz alanının profesyonel aydınlatmasını kontrol et.','Müşteri alanı ile teknik alanı görsel olarak ayır.','OTOTR kurumsal duvar grafiklerini tasarla.','Hizmet paketlerini gösteren kurumsal pano oluştur.','Garanti/güven sistemini anlatan pano oluştur.','TSE/HYB ve diğer yetki-belgelerinin sergileneceği alanı oluştur.','Personel ve müşteriye açık alanların yönlendirme levhalarını standartlaştır.','Şubenin iç mekân uygulama standardının fotoğraflı dokümantasyonunu hazırla.']),
('20000000-0000-4000-8000-000000000005'::uuid,array['Araç kabul noktasını belirle.','Ekspertiz hattının işlem sırasını fiziksel yerleşime göre kesinleştir.','Lift/kaldırma sistemini kontrol et.','Fren test cihazını kontrol ve kalibre ettir.','Süspansiyon test cihazını kontrol ve kalibre ettir.','Yanal kayma test sistemini kontrol et.','Dyno/motor performans cihazını kontrol et.','OBD/diagnostik cihazlarını ve lisanslarını kontrol et.','Boya ölçüm ve kaporta kontrol ekipmanlarını standartlaştır.','Kullanılan tüm cihazların marka/model/seri no/kalibrasyon bilgilerinden OTOTR Şube Teknik Envanteri oluştur.']),
('20000000-0000-4000-8000-000000000006'::uuid,array['Araç kabul prosedürünü yazılı hale getir.','Araç kabul sırasında çekilecek zorunlu fotoğrafları belirle.','Kilometre/şasi/plaka doğrulama sürecini standartlaştır.','Kaporta kontrol sırasını kesinleştir.','Şasi kontrol sırasını kesinleştir.','Mekanik kontrol sırasını kesinleştir.','Elektronik/diagnostik kontrol sırasını kesinleştir.','Alt takım kontrol sırasını kesinleştir.','Test sonuçlarının ERP’ye hangi aşamada girileceğini belirle.','Araç girişinden rapor teslimine kadar hedef ekspertiz süresini belirle.']),
('20000000-0000-4000-8000-000000000007'::uuid,array['Şubeyi OTOTR ERP sistemine tanımla.','Personel kullanıcı hesaplarını oluştur.','Usta/teknisyen yetki seviyelerini belirle.','Sahadan veri girişi yapılacak Android/tablet sistemini hazırla.','Şasi giriş ekranının saha testini tamamla.','Kaporta giriş ekranının saha testini tamamla.','Teknik kontrol verilerinin rapora doğru aktarılmasını test et.','OTOTR ekspertiz raporunun nihai A4 tasarımını kilitle.','QR kod / dijital rapor doğrulama sistemini hazırla.','Gerçek araçlarla en az 20 deneme ekspertizi yaparak yazılım–saha–rapor zincirini test et.']),
('20000000-0000-4000-8000-000000000008'::uuid,array['OTOTR antetli ekspertiz rapor tasarımını kesinleştir.','Kaporta görsel raporunu kesinleştir.','Şasi görsel raporunu kesinleştir.','Sorunlu parçaların müşteri tarafından kolay anlaşılacağı özet alanını tamamla.','ORJİNAL parçaların raporda gereksiz kalabalık oluşturmaması standardını uygula.','OTOTR 1.000 KM Garanti sisteminin kapsam ve koşullarını kesinleştir.','Daha önce seçtiğimiz 1.000 KM garanti hologramını üretime hazırla.','Hologramın rapordaki/evraktaki kesin konumunu belirle.','Müşteriye ekspertiz sonucunun nasıl anlatılacağına ilişkin teslim standardı oluştur.','Ekspertiz sonrası müşteri memnuniyet/şikâyet/geri bildirim sistemini kur.']),
('20000000-0000-4000-8000-000000000009'::uuid,array['OTOTR personel kıyafetlerini tasarla ve sipariş et.','Personel isimliklerini hazırla.','Teknik personel için görev tanımlarını yaz.','Karşılama/personel konuşma standardını oluştur.','Araç teslim ve rapor anlatım standardı için eğitim ver.','Günlük açılış-kapanış kontrol listesini oluştur.','Şube temizlik standardını oluştur.','Şube yöneticisinin haftalık kalite kontrol checklistini oluştur.']),
('20000000-0000-4000-8000-000000000010'::uuid,array['OTOTR markasının şubede kullanılmasına ilişkin şirket/işletme yapısını kesinleştir.','Fatura/POS/ödeme sistemlerini OTOTR operasyonuna uygun hale getir.','KVKK kapsamında müşteri ve araç verisi süreçlerini düzenle.','Kamera sistemi ve gerekli bilgilendirmeleri kontrol et.','Ekspertiz hizmet sözleşmesi/onay metinlerini kesinleştir.','Garanti koşulları, sorumluluk sınırları ve müşteri bilgilendirme metinlerini hukuki kontrolden geçir.']),
('20000000-0000-4000-8000-000000000011'::uuid,array['Google/harita, web sitesi ve sosyal medya şube bilgilerini OTOTR olarak hazırla/güncelle.','Profesyonel dış cephe ve iç mekân fotoğraf/video çekimi yap.','OTOTR açıldı yerel lansman kampanyasını hazırla.','Açılış öncesinde seçilmiş gerçek araçlarla tam operasyon provası yap.','İlk 30 günlük pilot işletme döneminde hata, müşteri geri bildirimi, işlem süresi ve operasyon sorunlarını kayıt altına al.','Pilot şubede doğrulanan sistemi OTOTR Bayi Dönüşüm Standardı v1.0 haline getir ve sonraki tüm bayilere aynı standartla uygula.'])
), expanded as (
  select category_id,title,ordinality::integer-1 as sort_order from seed cross join lateral unnest(titles) with ordinality as x(title,ordinality)
)
insert into public.task_template_tasks(template_id,template_category_id,title,priority,sort_order,requires_approval,requires_evidence)
select '10000000-0000-4000-8000-000000000001',category_id,title,'medium',sort_order,false,false from expanded
on conflict(template_category_id,sort_order) do update set title=excluded.title,priority=excluded.priority;
