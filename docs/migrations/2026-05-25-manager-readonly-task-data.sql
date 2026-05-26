-- Enforce manager read-only behavior for technical task data.
--
-- Managers may assign, clear ownership, and return a task through guarded RPCs.
-- They may not edit technical entries, evidence, or submit a task directly.
-- Claim/release/submit ownership mutations are also forced through RPCs by
-- local transaction flags so generic table updates cannot bypass the workflow.

create or replace function public.claim_inspection_task(target_task_id uuid)
returns inspection_tasks as $$
declare
  actor_id uuid;
  actor_role text;
  previous_task inspection_tasks;
  next_task inspection_tasks;
begin
  actor_id := current_app_user_id();
  actor_role := current_app_user_role();
  if actor_id is null then
    raise exception 'Aktif kullanici bulunamadi.';
  end if;
  if actor_role <> 'INSPECTION_TECHNICIAN' then
    raise exception 'Sadece usta basligi sahiplenebilir.';
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

  perform set_config('ototr.task_claim', 'on', true);

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
$$ language plpgsql security definer set search_path = public;

create or replace function public.release_inspection_task(
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

  perform set_config('ototr.task_release', 'on', true);

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
$$ language plpgsql security definer set search_path = public;

create or replace function public.manager_assign_inspection_task(
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

  perform set_config('ototr.manager_task_admin', 'on', true);

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
$$ language plpgsql security definer set search_path = public;

create or replace function public.manager_clear_inspection_task_owner(
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

  perform set_config('ototr.manager_task_admin', 'on', true);

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
$$ language plpgsql security definer set search_path = public;

create or replace function public.submit_inspection_task(target_task_id uuid)
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

  if previous_task.owner_user_id <> actor_id then
    raise exception 'Sadece gorev sahibi basligi gonderebilir.';
  end if;

  perform set_config('ototr.task_submit', 'on', true);

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
$$ language plpgsql security definer set search_path = public;

create or replace function public.manager_return_inspection_task(
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

  perform set_config('ototr.manager_task_admin', 'on', true);

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
$$ language plpgsql security definer set search_path = public;

create or replace function public.enforce_inspection_task_owner_mutation()
returns trigger as $$
declare
  actor_id uuid;
  actor_role text;
begin
  actor_id := current_app_user_id();
  actor_role := current_app_user_role();

  if actor_role = 'BRANCH_MANAGER' then
    if current_setting('ototr.manager_task_admin', true) = 'on' then
      return new;
    end if;
    raise exception 'Mudur teknik veriyi degistiremez; sadece sahiplik islemi yapabilir.';
  end if;

  if old.owner_user_id is null and new.owner_user_id is null then
    if old.status in ('LOCKED', 'ASSIGNED')
       and new.status = 'AVAILABLE'
       and (to_jsonb(new) - 'updated_at' - 'status') =
           (to_jsonb(old) - 'updated_at' - 'status') then
      return new;
    end if;
    raise exception 'Baslik sahiplenilmeden degistirilemez.';
  end if;

  if old.owner_user_id is null and new.owner_user_id is not null then
    if new.owner_user_id = actor_id
       and current_setting('ototr.task_claim', true) = 'on' then
      return new;
    end if;
    raise exception 'Baslik sadece claim RPC ile sahiplenilebilir.';
  end if;

  if old.owner_user_id <> actor_id then
    raise exception 'Sadece gorev sahibi bu basligi degistirebilir.';
  end if;

  if new.owner_user_id is null then
    if current_setting('ototr.task_release', true) = 'on' then
      return new;
    end if;
    raise exception 'Gorev sadece release RPC ile birakilabilir.';
  end if;

  if new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'Usta sahipligi dogrudan degistiremez.';
  end if;

  if new.status is distinct from old.status
     and current_setting('ototr.task_submit', true) <> 'on' then
    raise exception 'Baslik durumu sadece ilgili islem RPC ile degistirilebilir.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.enforce_inspection_child_task_owner_mutation()
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
    raise exception 'Mudur teknik kanit veya veri degistiremez.';
  end if;

  if tg_op = 'DELETE' then
    target_task_id := old.task_id;
  else
    target_task_id := new.task_id;
  end if;

  select owner_user_id into target_owner
  from inspection_tasks
  where id = target_task_id;

  if target_owner is null then
    raise exception 'Baslik sahiplenilmeden kanit/veri degistirilemez.';
  end if;

  if target_owner <> actor_id then
    raise exception 'Sadece gorev sahibi bu baslikta kanit/veri degistirebilir.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
