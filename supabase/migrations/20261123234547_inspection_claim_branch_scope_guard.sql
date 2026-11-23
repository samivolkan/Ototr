-- Restrict existing manual task claim to the technician's branch. No new agent permissions.
CREATE OR REPLACE FUNCTION public.claim_inspection_task(target_task_id uuid)
 RETURNS public.inspection_tasks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor_id uuid;
  actor_role text;
  previous_task public.inspection_tasks;
  next_task public.inspection_tasks;
begin
  actor_id := public.current_app_user_id();
  actor_role := public.current_app_user_role();
  if actor_id is null then
    raise exception 'Aktif kullanici bulunamadi.';
  end if;
  if actor_role is distinct from 'INSPECTION_TECHNICIAN' then
    raise exception 'Sadece usta basligi sahiplenebilir.';
  end if;

  select * into previous_task
  from public.inspection_tasks
  where id = target_task_id
  for update;

  if previous_task.id is null then
    raise exception 'Teknik baslik bulunamadi.';
  end if;

  if not exists (
    select 1 from public.expertise_cases c
    join public.app_users u on u.id=actor_id
    where c.id=previous_task.expertise_case_id and u.is_active
      and u.branch_id is not null and c.branch_id=u.branch_id
  ) then
    raise exception 'Gorev bu kullanicinin sube kapsaminda degil.' using errcode='42501';
  end if;

  if previous_task.owner_user_id is not null
     and previous_task.owner_user_id <> actor_id then
    raise exception 'Bu baslik baska bir usta tarafindan sahiplenilmis.';
  end if;

  perform set_config('ototr.task_claim', 'on', true);

  update public.inspection_tasks
  set
    owner_user_id = actor_id,
    claimed_at = now(),
    status = 'OPEN',
    release_reason = '',
    released_by_user_id = null,
    released_at = null,
    ownership_history = public.append_task_history(
      ownership_history,
      'CLAIMED',
      actor_id,
      actor_id,
      previous_task.owner_user_id,
      ''
    ),
    audit_log = public.append_task_audit(audit_log, 'claim', actor_id, '')
  where id = target_task_id
  returning * into next_task;

  perform public.log_task_audit(
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
$function$;
revoke all on function public.claim_inspection_task(uuid) from public,anon;
grant execute on function public.claim_inspection_task(uuid) to authenticated;
