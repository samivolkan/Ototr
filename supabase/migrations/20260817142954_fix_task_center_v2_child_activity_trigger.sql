-- A single trigger function serves multiple child tables. Access fields via
-- JSONB so PostgreSQL never resolves a column that is absent on another table.
create or replace function app_private.log_task_center_child_change()
returns trigger
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  old_row jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  new_row jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  row_task_id uuid;
  action_name text;
begin
  row_task_id := coalesce((new_row->>'task_id')::uuid,(old_row->>'task_id')::uuid);
  action_name := case
    when tg_table_name='task_assignees' and tg_op='INSERT' then 'assignee_added'
    when tg_table_name='task_assignees' and tg_op='DELETE' then 'assignee_removed'
    when tg_table_name='task_comments' then 'comment_added'
    when tg_table_name='task_attachments' then 'attachment_added'
    when tg_table_name='task_approvals' and tg_op='INSERT' then 'approval_requested'
    when tg_table_name='task_approvals' and tg_op='UPDATE' and new_row->>'status'='approved' then 'approved'
    when tg_table_name='task_approvals' and tg_op='UPDATE' and new_row->>'status'='rejected' then 'rejected'
    when tg_table_name='task_checklist_items' and tg_op='INSERT' then 'checklist_added'
    when tg_table_name='task_checklist_items'
      and tg_op='UPDATE'
      and coalesce((new_row->>'is_completed')::boolean,false)
      and not coalesce((old_row->>'is_completed')::boolean,false)
      then 'checklist_completed'
    else tg_table_name||'_'||lower(tg_op)
  end;

  insert into public.task_activity_logs(task_id,user_id,action,old_value,new_value)
  values(row_task_id,app_private.task_current_app_user_id(),action_name,old_row,new_row);

  return case when tg_op='DELETE' then old else new end;
end
$$;

revoke all on function app_private.log_task_center_child_change() from public, anon, authenticated;
