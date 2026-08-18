-- Task Center V2 owner/manager archive workflow.

create or replace function public.archive_task_for_project(
  target_task_id uuid,
  expected_updated_at timestamptz
)
returns public.task_tasks
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  actor_id uuid;
  current_task public.task_tasks;
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
  if current_task.created_by is distinct from actor_id
     and not app_private.task_can_manage_project(current_task.project_id) then
    raise exception 'Task archive denied' using errcode='42501';
  end if;
  if current_task.updated_at<>expected_updated_at then
    raise exception 'Stale task version' using errcode='40001';
  end if;

  update public.task_tasks
  set archived_at=now()
  where id=target_task_id
  returning * into result;

  return result;
end
$$;

revoke all on function public.archive_task_for_project(uuid,timestamptz) from public, anon;
grant execute on function public.archive_task_for_project(uuid,timestamptz) to authenticated;
