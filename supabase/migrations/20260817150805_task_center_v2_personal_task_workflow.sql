-- Authenticated Task Center users need a small, explicit API surface for the
-- browser. Staff may create self-assigned tasks in projects they can access;
-- assigning other people remains limited to project managers.

create or replace function public.task_current_user_context()
returns table(
  app_user_id uuid,
  full_name text,
  email text,
  role text,
  branch_id uuid,
  can_manage_projects boolean
)
language plpgsql
stable
security definer
set search_path = public, app_private, pg_temp
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;

  return query
  select
    u.id,
    u.full_name,
    u.email,
    u.role,
    u.branch_id,
    app_private.current_user_is_hq()
      or app_private.current_user_can_manage_branch(u.branch_id)
  from public.app_users u
  where u.auth_user_id=(select auth.uid())
    and u.is_active=true
  limit 1;

  if not found then
    raise exception 'Active application user not found' using errcode='42501';
  end if;
end
$$;

create or replace function public.list_task_project_members(target_project_id uuid)
returns table(
  user_id uuid,
  full_name text,
  role text
)
language plpgsql
stable
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  target_project public.task_projects;
begin
  if not app_private.task_can_access_project(target_project_id) then
    raise exception 'Project access denied' using errcode='42501';
  end if;

  select * into target_project
  from public.task_projects p
  where p.id=target_project_id and p.archived_at is null;

  return query
  select
    u.id,
    coalesce(nullif(trim(u.full_name),''),split_part(u.email,'@',1)),
    u.role
  from public.app_users u
  where u.is_active=true
    and (
      (target_project.branch_id is not null and u.branch_id=target_project.branch_id)
      or (
        target_project.branch_id is null
        and u.role=any(array[
          'CEO','GENERAL_MANAGER','OPERATIONS','QUALITY_AUDITOR','FINANCE',
          'LEGAL','CRM_AGENT','FRANCHISE_SALES','MARKETING','HR',
          'ACADEMY_MANAGER','SUPPORT_AGENT'
        ]::text[])
      )
    )
  order by coalesce(nullif(trim(u.full_name),''),u.email),u.id;
end
$$;

create or replace function public.create_task_for_project(
  target_project_id uuid,
  target_category_id uuid,
  task_title text,
  task_description text default null,
  task_priority text default 'medium',
  task_due_at timestamptz default null,
  assignee_user_ids uuid[] default null
)
returns public.task_tasks
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  actor_id uuid;
  target_project public.task_projects;
  selected_assignees uuid[];
  can_manage boolean;
  next_sort_order integer;
  created_task public.task_tasks;
begin
  actor_id:=app_private.task_current_app_user_id();
  if actor_id is null then
    raise exception 'Active application user not found' using errcode='42501';
  end if;
  if not app_private.task_can_access_project(target_project_id) then
    raise exception 'Project access denied' using errcode='42501';
  end if;
  if nullif(trim(task_title),'') is null then
    raise exception 'Task title is required' using errcode='23514';
  end if;
  if task_priority not in ('low','medium','high','critical') then
    raise exception 'Invalid task priority' using errcode='23514';
  end if;

  select * into target_project
  from public.task_projects p
  where p.id=target_project_id and p.archived_at is null
  for update;

  if not exists(
    select 1
    from public.task_categories c
    where c.id=target_category_id
      and c.project_id=target_project_id
      and c.archived_at is null
  ) then
    raise exception 'Category does not belong to project' using errcode='23514';
  end if;

  if coalesce(cardinality(assignee_user_ids),0)=0 then
    selected_assignees:=array[actor_id];
  else
    select array_agg(distinct requested_user_id order by requested_user_id)
    into selected_assignees
    from unnest(assignee_user_ids) requested_user_id;
  end if;

  can_manage:=app_private.task_can_manage_project(target_project_id);
  if not can_manage and not (
    cardinality(selected_assignees)=1 and selected_assignees[1]=actor_id
  ) then
    raise exception 'Staff may only assign a new task to themselves' using errcode='42501';
  end if;

  if exists(
    select 1
    from unnest(selected_assignees) requested_user_id
    left join public.app_users u on u.id=requested_user_id and u.is_active=true
    where u.id is null
      or (target_project.branch_id is not null and u.branch_id is distinct from target_project.branch_id)
      or (
        target_project.branch_id is null
        and u.role<>all(array[
          'CEO','GENERAL_MANAGER','OPERATIONS','QUALITY_AUDITOR','FINANCE',
          'LEGAL','CRM_AGENT','FRANCHISE_SALES','MARKETING','HR',
          'ACADEMY_MANAGER','SUPPORT_AGENT'
        ]::text[])
      )
  ) then
    raise exception 'One or more assignees are outside the project scope' using errcode='42501';
  end if;

  select coalesce(max(t.sort_order),0)+1
  into next_sort_order
  from public.task_tasks t
  where t.project_id=target_project_id;

  insert into public.task_tasks(
    project_id,category_id,title,description,priority,due_at,created_by,sort_order
  )
  values(
    target_project_id,target_category_id,trim(task_title),
    nullif(trim(task_description),''),task_priority,task_due_at,actor_id,next_sort_order
  )
  returning * into created_task;

  insert into public.task_assignees(task_id,user_id,assigned_by)
  select created_task.id,requested_user_id,actor_id
  from unnest(selected_assignees) requested_user_id;

  return created_task;
end
$$;

revoke all on function public.task_current_user_context() from public, anon;
revoke all on function public.list_task_project_members(uuid) from public, anon;
revoke all on function public.create_task_for_project(uuid,uuid,text,text,text,timestamptz,uuid[]) from public, anon;

grant execute on function public.task_current_user_context() to authenticated;
grant execute on function public.list_task_project_members(uuid) to authenticated;
grant execute on function public.create_task_for_project(uuid,uuid,text,text,text,timestamptz,uuid[]) to authenticated;
