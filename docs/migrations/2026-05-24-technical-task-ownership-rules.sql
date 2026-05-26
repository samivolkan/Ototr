-- Technical task ownership rules
-- One inspection task can have only one owner_user_id at a time.
-- Technicians can only claim available tasks, edit their own tasks, and
-- release owned tasks back to the pool with a reason. Direct reassignment is
-- manager-only.

alter table inspection_tasks
  add column if not exists owner_user_id uuid references app_users(id),
  add column if not exists claimed_at timestamptz,
  add column if not exists release_reason text not null default '',
  add column if not exists released_by_user_id uuid references app_users(id),
  add column if not exists released_at timestamptz,
  add column if not exists assigned_by_manager_id uuid references app_users(id),
  add column if not exists manager_assign_reason text not null default '',
  add column if not exists ownership_history jsonb not null default '[]'::jsonb,
  add column if not exists audit_log jsonb not null default '[]'::jsonb;

do $$
begin
  alter table inspection_tasks drop constraint if exists inspection_tasks_status_check;
  alter table inspection_tasks add constraint inspection_tasks_status_check
    check (status in (
      'AVAILABLE',
      'ASSIGNED',
      'LOCKED',
      'OPEN',
      'COMPLETED',
      'EVIDENCE_MISSING',
      'MANAGER_RETURNED',
      'CONFLICT_DETECTED'
    ));
end $$;

create index if not exists idx_inspection_tasks_owner
  on inspection_tasks(owner_user_id)
  where owner_user_id is not null;

create or replace function current_app_user_id()
returns uuid as $$
  select id
  from app_users
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1;
$$ language sql stable security definer;

create or replace function current_app_user_role()
returns text as $$
  select role
  from app_users
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1;
$$ language sql stable security definer;

create or replace function append_task_history(
  current_history jsonb,
  event_type text,
  actor_user_id uuid,
  owner_user_id uuid,
  previous_owner_user_id uuid,
  reason text
)
returns jsonb as $$
  select coalesce(current_history, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'event_type', event_type,
      'actor_user_id', actor_user_id,
      'owner_user_id', owner_user_id,
      'previous_owner_user_id', previous_owner_user_id,
      'reason', coalesce(reason, ''),
      'created_at', now()
    )
  );
$$ language sql stable;

create or replace function append_task_audit(
  current_audit jsonb,
  action_name text,
  actor_user_id uuid,
  note text
)
returns jsonb as $$
  select coalesce(current_audit, '[]'::jsonb) || jsonb_build_array(
    jsonb_build_object(
      'action', action_name,
      'actor_user_id', actor_user_id,
      'note', coalesce(note, ''),
      'created_at', now()
    )
  );
$$ language sql stable;

create or replace function log_task_audit(
  target_case_id uuid,
  actor_user_id uuid,
  action_name text,
  target_task_id uuid,
  note text,
  old_record jsonb,
  new_record jsonb
)
returns void as $$
begin
  insert into report_audit_logs (
    expertise_case_id,
    actor_id,
    action,
    entity_name,
    entity_id,
    old_value,
    new_value
  )
  values (
    target_case_id,
    actor_user_id,
    action_name,
    'inspection_tasks',
    target_task_id,
    old_record,
    coalesce(new_record, '{}'::jsonb) || jsonb_build_object('note', coalesce(note, ''))
  );
end;
$$ language plpgsql security definer;

create or replace function claim_inspection_task(target_task_id uuid)
returns inspection_tasks as $$
declare
  actor_id uuid;
  previous_task inspection_tasks;
  next_task inspection_tasks;
begin
  actor_id := current_app_user_id();
  if actor_id is null then
    raise exception 'Aktif kullanici bulunamadi.';
  end if;

  select * into previous_task
  from inspection_tasks
  where id = target_task_id
  for update;

  if previous_task.id is null then
    raise exception 'Teknik baslik bulunamadi.';
  end if;

  if previous_task.owner_user_id is not null
     and previous_task.owner_user_id <> actor_id then
    raise exception 'Bu baslik baska bir usta tarafindan sahiplenilmis.';
  end if;

  update inspection_tasks
  set
    owner_user_id = actor_id,
    claimed_at = now(),
    status = 'OPEN',
    release_reason = '',
    released_by_user_id = null,
    released_at = null,
    ownership_history = append_task_history(
      ownership_history,
      'CLAIMED',
      actor_id,
      actor_id,
      previous_task.owner_user_id,
      ''
    ),
    audit_log = append_task_audit(audit_log, 'claim', actor_id, '')
  where id = target_task_id
  returning * into next_task;

  perform log_task_audit(
    next_task.expertise_case_id,
    actor_id,
    'CLAIM_TASK',
    target_task_id,
    '',
    to_jsonb(previous_task),
    to_jsonb(next_task)
  );

  return next_task;
end;
$$ language plpgsql security definer;

create or replace function release_inspection_task(
  target_task_id uuid,
  release_reason text
)
returns inspection_tasks as $$
declare
  actor_id uuid;
  previous_task inspection_tasks;
  next_task inspection_tasks;
begin
  actor_id := current_app_user_id();
  if actor_id is null then
    raise exception 'Aktif kullanici bulunamadi.';
  end if;

  if release_inspection_task.release_reason is null
     or length(trim(release_inspection_task.release_reason)) = 0 then
    raise exception 'releaseReason zorunludur.';
  end if;

  select * into previous_task
  from inspection_tasks
  where id = target_task_id
  for update;

  if previous_task.owner_user_id <> actor_id then
    raise exception 'Sadece gorev sahibi basligi havuza birakabilir.';
  end if;

  update inspection_tasks
  set
    owner_user_id = null,
    claimed_at = null,
    status = 'AVAILABLE',
    release_reason = trim(release_inspection_task.release_reason),
    released_by_user_id = actor_id,
    released_at = now(),
    ownership_history = append_task_history(
      ownership_history,
      'RELEASED',
      actor_id,
      null,
      previous_task.owner_user_id,
      trim(release_inspection_task.release_reason)
    ),
    audit_log = append_task_audit(
      audit_log,
      'release',
      actor_id,
      trim(release_inspection_task.release_reason)
    )
  where id = target_task_id
  returning * into next_task;

  perform log_task_audit(
    next_task.expertise_case_id,
    actor_id,
    'RELEASE_TASK',
    target_task_id,
    trim(release_inspection_task.release_reason),
    to_jsonb(previous_task),
    to_jsonb(next_task)
  );

  return next_task;
end;
$$ language plpgsql security definer;

create or replace function manager_assign_inspection_task(
  target_task_id uuid,
  next_owner_user_id uuid,
  manager_assign_reason text
)
returns inspection_tasks as $$
declare
  actor_id uuid;
  actor_role text;
  previous_task inspection_tasks;
  next_task inspection_tasks;
begin
  actor_id := current_app_user_id();
  actor_role := current_app_user_role();

  if actor_role <> 'BRANCH_MANAGER' then
    raise exception 'Baska ustaya dogrudan atama sadece mudur yetkisindedir.';
  end if;
  if next_owner_user_id is null then
    raise exception 'Yeni usta zorunludur.';
  end if;
  if manager_assign_inspection_task.manager_assign_reason is null
     or length(trim(manager_assign_inspection_task.manager_assign_reason)) = 0 then
    raise exception 'managerAssignReason zorunludur.';
  end if;

  select * into previous_task
  from inspection_tasks
  where id = target_task_id
  for update;

  update inspection_tasks
  set
    owner_user_id = next_owner_user_id,
    claimed_at = now(),
    status = 'OPEN',
    assigned_by_manager_id = actor_id,
    manager_assign_reason = trim(manager_assign_inspection_task.manager_assign_reason),
    ownership_history = append_task_history(
      ownership_history,
      'MANAGER_REASSIGNED',
      actor_id,
      next_owner_user_id,
      previous_task.owner_user_id,
      trim(manager_assign_inspection_task.manager_assign_reason)
    ),
    audit_log = append_task_audit(
      audit_log,
      'manager_reassigned',
      actor_id,
      trim(manager_assign_inspection_task.manager_assign_reason)
    )
  where id = target_task_id
  returning * into next_task;

  perform log_task_audit(
    next_task.expertise_case_id,
    actor_id,
    'MANAGER_REASSIGN_TASK',
    target_task_id,
    trim(manager_assign_inspection_task.manager_assign_reason),
    to_jsonb(previous_task),
    to_jsonb(next_task)
  );

  return next_task;
end;
$$ language plpgsql security definer;

create or replace function manager_clear_inspection_task_owner(
  target_task_id uuid,
  release_reason text
)
returns inspection_tasks as $$
declare
  actor_id uuid;
  actor_role text;
  previous_task inspection_tasks;
  next_task inspection_tasks;
begin
  actor_id := current_app_user_id();
  actor_role := current_app_user_role();

  if actor_role <> 'BRANCH_MANAGER' then
    raise exception 'Sahipligi kaldirma sadece mudur yetkisindedir.';
  end if;
  if manager_clear_inspection_task_owner.release_reason is null
     or length(trim(manager_clear_inspection_task_owner.release_reason)) = 0 then
    raise exception 'Gerekce zorunludur.';
  end if;

  select * into previous_task
  from inspection_tasks
  where id = target_task_id
  for update;

  update inspection_tasks
  set
    owner_user_id = null,
    claimed_at = null,
    status = 'AVAILABLE',
    release_reason = trim(manager_clear_inspection_task_owner.release_reason),
    released_by_user_id = actor_id,
    released_at = now(),
    ownership_history = append_task_history(
      ownership_history,
      'MANAGER_RELEASED',
      actor_id,
      null,
      previous_task.owner_user_id,
      trim(manager_clear_inspection_task_owner.release_reason)
    ),
    audit_log = append_task_audit(
      audit_log,
      'manager_released',
      actor_id,
      trim(manager_clear_inspection_task_owner.release_reason)
    )
  where id = target_task_id
  returning * into next_task;

  perform log_task_audit(
    next_task.expertise_case_id,
    actor_id,
    'MANAGER_RELEASE_TASK',
    target_task_id,
    trim(manager_clear_inspection_task_owner.release_reason),
    to_jsonb(previous_task),
    to_jsonb(next_task)
  );

  return next_task;
end;
$$ language plpgsql security definer;

create or replace function submit_inspection_task(target_task_id uuid)
returns inspection_tasks as $$
declare
  actor_id uuid;
  previous_task inspection_tasks;
  next_task inspection_tasks;
begin
  actor_id := current_app_user_id();
  if actor_id is null then
    raise exception 'Aktif kullanici bulunamadi.';
  end if;

  select * into previous_task
  from inspection_tasks
  where id = target_task_id
  for update;

  if previous_task.owner_user_id <> actor_id
     and current_app_user_role() <> 'BRANCH_MANAGER' then
    raise exception 'Sadece gorev sahibi basligi gonderebilir.';
  end if;

  update inspection_tasks
  set
    status = 'COMPLETED',
    ownership_history = append_task_history(
      ownership_history,
      'SUBMITTED',
      actor_id,
      previous_task.owner_user_id,
      previous_task.owner_user_id,
      'completed'
    ),
    audit_log = append_task_audit(audit_log, 'submit', actor_id, 'completed')
  where id = target_task_id
  returning * into next_task;

  perform log_task_audit(
    next_task.expertise_case_id,
    actor_id,
    'SUBMIT_TASK',
    target_task_id,
    'completed',
    to_jsonb(previous_task),
    to_jsonb(next_task)
  );

  return next_task;
end;
$$ language plpgsql security definer;

create or replace function manager_return_inspection_task(
  target_task_id uuid,
  return_reason text
)
returns inspection_tasks as $$
declare
  actor_id uuid;
  actor_role text;
  previous_task inspection_tasks;
  next_task inspection_tasks;
begin
  actor_id := current_app_user_id();
  actor_role := current_app_user_role();

  if actor_role <> 'BRANCH_MANAGER' then
    raise exception 'Iade sadece mudur yetkisindedir.';
  end if;
  if manager_return_inspection_task.return_reason is null
     or length(trim(manager_return_inspection_task.return_reason)) = 0 then
    raise exception 'Iade gerekcesi zorunludur.';
  end if;

  select * into previous_task
  from inspection_tasks
  where id = target_task_id
  for update;

  update inspection_tasks
  set
    status = 'MANAGER_RETURNED',
    manager_return_reason = trim(manager_return_inspection_task.return_reason),
    revision_no = revision_no + 1,
    ownership_history = append_task_history(
      ownership_history,
      'MANAGER_RETURNED',
      actor_id,
      owner_user_id,
      owner_user_id,
      trim(manager_return_inspection_task.return_reason)
    ),
    audit_log = append_task_audit(
      audit_log,
      'manager_returned',
      actor_id,
      trim(manager_return_inspection_task.return_reason)
    )
  where id = target_task_id
  returning * into next_task;

  perform log_task_audit(
    next_task.expertise_case_id,
    actor_id,
    'MANAGER_RETURN_TASK',
    target_task_id,
    trim(manager_return_inspection_task.return_reason),
    to_jsonb(previous_task),
    to_jsonb(next_task)
  );

  return next_task;
end;
$$ language plpgsql security definer;

create or replace function enforce_inspection_task_owner_mutation()
returns trigger as $$
declare
  actor_id uuid;
  actor_role text;
  target_owner uuid;
begin
  actor_id := current_app_user_id();
  actor_role := current_app_user_role();

  if actor_role = 'BRANCH_MANAGER' then
    return new;
  end if;

  target_owner := coalesce(old.owner_user_id, new.owner_user_id);
  if target_owner is not null and target_owner <> actor_id then
    raise exception 'Sadece gorev sahibi bu basligi degistirebilir.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_enforce_inspection_task_owner on inspection_tasks;
create trigger trg_enforce_inspection_task_owner
before update on inspection_tasks
for each row execute function enforce_inspection_task_owner_mutation();

create or replace function enforce_inspection_child_task_owner_mutation()
returns trigger as $$
declare
  actor_id uuid;
  actor_role text;
  target_task_id uuid;
  target_owner uuid;
begin
  actor_id := current_app_user_id();
  actor_role := current_app_user_role();

  if actor_role = 'BRANCH_MANAGER' then
    return new;
  end if;

  if tg_op = 'DELETE' then
    target_task_id := old.task_id;
  else
    target_task_id := new.task_id;
  end if;

  select owner_user_id into target_owner
  from inspection_tasks
  where id = target_task_id;

  if target_owner is not null and target_owner <> actor_id then
    raise exception 'Sadece gorev sahibi bu baslikta kanit/veri degistirebilir.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_enforce_inspection_values_owner on inspection_item_values;
create trigger trg_enforce_inspection_values_owner
before insert or update or delete on inspection_item_values
for each row execute function enforce_inspection_child_task_owner_mutation();

drop trigger if exists trg_enforce_evidence_assets_owner on inspection_evidence_assets;
create trigger trg_enforce_evidence_assets_owner
before insert or update or delete on inspection_evidence_assets
for each row execute function enforce_inspection_child_task_owner_mutation();
