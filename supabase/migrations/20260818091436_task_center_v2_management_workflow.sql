-- Task Center V2 management workflow.
-- User creation is completed by a JWT-protected Edge Function. These RPCs
-- keep authorization and project/branch scope enforcement in Postgres.

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
  where (
      (target_project.branch_id is not null and u.branch_id=target_project.branch_id)
      or (target_project.branch_id is null and u.branch_id is null)
    )
  order by u.is_active desc,coalesce(nullif(trim(u.full_name),''),u.email),u.id;
end
$$;

create or replace function public.task_user_admin_context(target_project_id uuid)
returns table(
  actor_app_user_id uuid,
  project_branch_id uuid
)
language plpgsql
stable
security definer
set search_path = public, app_private, pg_temp
as $$
begin
  if not app_private.task_can_manage_project(target_project_id) then
    raise exception 'User management denied' using errcode='42501';
  end if;

  return query
  select app_private.task_current_app_user_id(),p.branch_id
  from public.task_projects p
  where p.id=target_project_id and p.archived_at is null;

  if not found then
    raise exception 'Active project not found' using errcode='P0002';
  end if;
end
$$;

create or replace function public.list_task_project_users(target_project_id uuid)
returns table(
  user_id uuid,
  auth_user_id uuid,
  full_name text,
  email text,
  role text,
  is_active boolean
)
language plpgsql
stable
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  target_project public.task_projects;
begin
  if not app_private.task_can_manage_project(target_project_id) then
    raise exception 'User management denied' using errcode='42501';
  end if;

  select * into target_project
  from public.task_projects p
  where p.id=target_project_id and p.archived_at is null;

  return query
  select u.id,u.auth_user_id,u.full_name,u.email,u.role,u.is_active
  from public.app_users u
  where (
      (target_project.branch_id is not null and u.branch_id=target_project.branch_id)
      or (target_project.branch_id is null and u.branch_id is null)
    )
  order by u.is_active desc,u.full_name,u.id;
end
$$;

create or replace function public.register_task_project_user(
  target_project_id uuid,
  target_auth_user_id uuid,
  target_full_name text,
  target_email text,
  target_role text
)
returns public.app_users
language plpgsql
security definer
set search_path = public, app_private, auth, pg_temp
as $$
declare
  target_project public.task_projects;
  auth_email text;
  existing_user public.app_users;
  result public.app_users;
begin
  if not app_private.task_can_manage_project(target_project_id) then
    raise exception 'User management denied' using errcode='42501';
  end if;
  if nullif(trim(target_full_name),'') is null then
    raise exception 'Full name is required' using errcode='23514';
  end if;
  if nullif(trim(target_email),'') is null then
    raise exception 'Email is required' using errcode='23514';
  end if;

  select * into target_project
  from public.task_projects p
  where p.id=target_project_id and p.archived_at is null
  for share;

  if target_project.branch_id is not null and target_role<>all(array[
    'BRANCH_MANAGER','RECEPTION_STAFF','INSPECTION_TECHNICIAN',
    'TECHNICAL_SUPERVISOR','DEALER_OWNER','DEALER_STAFF'
  ]::text[]) then
    raise exception 'Role is outside branch scope' using errcode='42501';
  end if;
  if target_project.branch_id is null and target_role<>all(array[
    'CEO','GENERAL_MANAGER','REGIONAL_MANAGER','OPERATIONS','QUALITY_AUDITOR',
    'FINANCE','LEGAL','CRM_AGENT','FRANCHISE_SALES','MARKETING','HR',
    'ACADEMY_MANAGER','SUPPORT_AGENT'
  ]::text[]) then
    raise exception 'Role is outside HQ scope' using errcode='42501';
  end if;

  select lower(trim(u.email)) into auth_email
  from auth.users u
  where u.id=target_auth_user_id;

  if auth_email is null or auth_email<>lower(trim(target_email)) then
    raise exception 'Authentication user email mismatch' using errcode='23514';
  end if;

  if exists(
    select 1 from public.app_users u
    where u.auth_user_id=target_auth_user_id
      and lower(coalesce(u.email,''))<>auth_email
  ) then
    raise exception 'Authentication user is already linked' using errcode='23505';
  end if;

  select * into existing_user
  from public.app_users u
  where lower(coalesce(u.email,''))=auth_email
  for update;

  if found then
    if existing_user.auth_user_id is not null
       and existing_user.auth_user_id<>target_auth_user_id then
      raise exception 'Email is already linked to another account' using errcode='23505';
    end if;
    if target_project.branch_id is distinct from existing_user.branch_id then
      raise exception 'Existing user is outside project scope' using errcode='42501';
    end if;

    update public.app_users
    set auth_user_id=target_auth_user_id,
        full_name=trim(target_full_name),
        email=auth_email,
        role=target_role,
        is_active=true,
        updated_at=now()
    where id=existing_user.id
    returning * into result;
  else
    insert into public.app_users(auth_user_id,branch_id,full_name,email,role,is_active)
    values(target_auth_user_id,target_project.branch_id,trim(target_full_name),auth_email,target_role,true)
    returning * into result;
  end if;

  return result;
end
$$;

create or replace function public.update_task_project_user(
  target_project_id uuid,
  target_user_id uuid,
  target_full_name text,
  target_role text,
  target_is_active boolean
)
returns public.app_users
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  actor_id uuid;
  target_project public.task_projects;
  current_user_row public.app_users;
  result public.app_users;
begin
  actor_id:=app_private.task_current_app_user_id();
  if not app_private.task_can_manage_project(target_project_id) then
    raise exception 'User management denied' using errcode='42501';
  end if;
  if nullif(trim(target_full_name),'') is null then
    raise exception 'Full name is required' using errcode='23514';
  end if;

  select * into target_project
  from public.task_projects p
  where p.id=target_project_id and p.archived_at is null;

  select * into current_user_row
  from public.app_users u
  where u.id=target_user_id
  for update;

  if not found
     or target_project.branch_id is distinct from current_user_row.branch_id then
    raise exception 'User is outside project scope' using errcode='42501';
  end if;
  if target_user_id=actor_id and not target_is_active then
    raise exception 'You cannot deactivate your own account' using errcode='42501';
  end if;
  if target_project.branch_id is not null and target_role<>all(array[
    'BRANCH_MANAGER','RECEPTION_STAFF','INSPECTION_TECHNICIAN',
    'TECHNICAL_SUPERVISOR','DEALER_OWNER','DEALER_STAFF'
  ]::text[]) then
    raise exception 'Role is outside branch scope' using errcode='42501';
  end if;
  if target_project.branch_id is null and target_role<>all(array[
    'CEO','GENERAL_MANAGER','REGIONAL_MANAGER','OPERATIONS','QUALITY_AUDITOR',
    'FINANCE','LEGAL','CRM_AGENT','FRANCHISE_SALES','MARKETING','HR',
    'ACADEMY_MANAGER','SUPPORT_AGENT'
  ]::text[]) then
    raise exception 'Role is outside HQ scope' using errcode='42501';
  end if;

  update public.app_users
  set full_name=trim(target_full_name),
      role=target_role,
      is_active=target_is_active,
      updated_at=now()
  where id=target_user_id
  returning * into result;

  return result;
end
$$;

create or replace function app_private.enforce_task_center_status_gate()
returns trigger
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  actor_id uuid;
begin
  actor_id:=app_private.task_current_app_user_id();
  if tg_op='UPDATE'
     and (new.project_id is distinct from old.project_id
       or new.created_by is distinct from old.created_by) then
    raise exception 'Task ownership fields cannot be changed' using errcode='42501';
  end if;
  if tg_op='UPDATE'
     and not app_private.task_can_manage_project(old.project_id)
     and old.created_by is distinct from actor_id
     and row(
       new.category_id,new.parent_task_id,new.title,new.description,new.priority,new.due_at,new.start_at,
       new.estimated_minutes,new.requires_approval,new.requires_evidence,new.archived_at
     ) is distinct from row(
       old.category_id,old.parent_task_id,old.title,old.description,old.priority,old.due_at,old.start_at,
       old.estimated_minutes,old.requires_approval,old.requires_evidence,old.archived_at
     ) then
    raise exception 'Assignees may only update task execution fields' using errcode='42501';
  end if;
  if not exists(
    select 1 from public.task_categories c
    where c.id=new.category_id and c.project_id=new.project_id and c.archived_at is null
  ) then
    raise exception 'Category does not belong to task project' using errcode='23514';
  end if;
  if new.parent_task_id is not null and not exists(
    select 1 from public.task_tasks p
    where p.id=new.parent_task_id and p.project_id=new.project_id and p.archived_at is null
  ) then
    raise exception 'Parent task does not belong to task project' using errcode='23514';
  end if;
  if new.status in ('review','done') and new.requires_evidence and not exists(
    select 1
    from public.task_attachments a
    join storage.objects o on o.bucket_id=a.storage_bucket and o.name=a.storage_path
    where a.task_id=new.id and a.attachment_type='evidence' and a.deleted_at is null
  ) then
    raise exception 'Evidence is required before review or completion' using errcode='23514';
  end if;
  if new.status='done' and new.requires_approval and coalesce((
    select a.status from public.task_approvals a
    where a.task_id=new.id
    order by a.requested_at desc,a.id desc limit 1
  ),'missing')<>'approved' then
    raise exception 'Approval is required before completion' using errcode='23514';
  end if;
  if new.status='done' and (tg_op='INSERT' or old.status<>'done') then
    new.completed_at:=now();
    new.completed_by:=actor_id;
  elsif new.status<>'done' then
    new.completed_at:=null;
    new.completed_by:=null;
  end if;
  return new;
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
    select 1 from public.task_categories c
    where c.id=target_category_id
      and c.project_id=target_project_id
      and c.archived_at is null
  ) then
    raise exception 'Category does not belong to project' using errcode='23514';
  end if;

  if assignee_user_ids is null then
    selected_assignees:=array[actor_id];
  elsif cardinality(assignee_user_ids)=0 then
    selected_assignees:=array[]::uuid[];
  else
    select array_agg(distinct requested_user_id order by requested_user_id)
    into selected_assignees
    from unnest(assignee_user_ids) requested_user_id;
  end if;

  can_manage:=app_private.task_can_manage_project(target_project_id);
  if not can_manage and not(
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
      or (target_project.branch_id is null and u.branch_id is not null)
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

create or replace function public.update_task_for_project(
  target_task_id uuid,
  expected_updated_at timestamptz,
  target_category_id uuid,
  task_title text,
  task_description text,
  task_priority text,
  task_due_at timestamptz,
  assignee_user_ids uuid[] default null
)
returns public.task_tasks
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  actor_id uuid;
  current_task public.task_tasks;
  target_project public.task_projects;
  selected_assignees uuid[];
  can_manage boolean;
  result public.task_tasks;
begin
  actor_id:=app_private.task_current_app_user_id();
  select * into current_task
  from public.task_tasks t
  where t.id=target_task_id and t.archived_at is null
  for update;

  if not found then
    raise exception 'Active task not found' using errcode='P0002';
  end if;
  can_manage:=app_private.task_can_manage_project(current_task.project_id);
  if not can_manage and current_task.created_by is distinct from actor_id then
    raise exception 'Task edit denied' using errcode='42501';
  end if;
  if current_task.updated_at<>expected_updated_at then
    raise exception 'Stale task version' using errcode='40001';
  end if;
  if nullif(trim(task_title),'') is null then
    raise exception 'Task title is required' using errcode='23514';
  end if;
  if task_priority not in ('low','medium','high','critical') then
    raise exception 'Invalid task priority' using errcode='23514';
  end if;
  if not exists(
    select 1 from public.task_categories c
    where c.id=target_category_id
      and c.project_id=current_task.project_id
      and c.archived_at is null
  ) then
    raise exception 'Category does not belong to project' using errcode='23514';
  end if;

  select * into target_project
  from public.task_projects p
  where p.id=current_task.project_id and p.archived_at is null;

  if assignee_user_ids is not null then
    if cardinality(assignee_user_ids)=0 then
      selected_assignees:=array[]::uuid[];
    else
      select array_agg(distinct requested_user_id order by requested_user_id)
      into selected_assignees
      from unnest(assignee_user_ids) requested_user_id;
    end if;

    if not can_manage and not(
      cardinality(selected_assignees)=1 and selected_assignees[1]=actor_id
    ) then
      raise exception 'Staff may only keep themselves assigned' using errcode='42501';
    end if;
    if exists(
      select 1
      from unnest(selected_assignees) requested_user_id
      left join public.app_users u on u.id=requested_user_id and u.is_active=true
      where u.id is null
        or (target_project.branch_id is not null and u.branch_id is distinct from target_project.branch_id)
        or (target_project.branch_id is null and u.branch_id is not null)
    ) then
      raise exception 'One or more assignees are outside the project scope' using errcode='42501';
    end if;
  end if;

  update public.task_tasks
  set category_id=target_category_id,
      title=trim(task_title),
      description=nullif(trim(task_description),''),
      priority=task_priority,
      due_at=task_due_at
  where id=target_task_id
  returning * into result;

  if assignee_user_ids is not null then
    delete from public.task_assignees where task_id=target_task_id;
    insert into public.task_assignees(task_id,user_id,assigned_by)
    select target_task_id,requested_user_id,actor_id
    from unnest(selected_assignees) requested_user_id;
  end if;

  return result;
end
$$;

revoke all on function public.task_user_admin_context(uuid) from public, anon;
revoke all on function public.list_task_project_users(uuid) from public, anon;
revoke all on function public.register_task_project_user(uuid,uuid,text,text,text) from public, anon;
revoke all on function public.update_task_project_user(uuid,uuid,text,text,boolean) from public, anon;
revoke all on function public.update_task_for_project(uuid,timestamptz,uuid,text,text,text,timestamptz,uuid[]) from public, anon;

grant execute on function public.task_user_admin_context(uuid) to authenticated;
grant execute on function public.list_task_project_users(uuid) to authenticated;
grant execute on function public.register_task_project_user(uuid,uuid,text,text,text) to authenticated;
grant execute on function public.update_task_project_user(uuid,uuid,text,text,boolean) to authenticated;
grant execute on function public.update_task_for_project(uuid,timestamptz,uuid,text,text,text,timestamptz,uuid[]) to authenticated;
