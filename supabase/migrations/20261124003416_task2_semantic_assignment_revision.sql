-- Assignment scope excludes progress and display-only metadata.
-- Historical receipts are retained; no receipt is rewritten to invent consent.
create function app_private.task2_assignment_revision(task jsonb) returns text
language sql immutable set search_path='' as $$
 with normalized as (
 select task - array['status','updated','updatedBy','completedAt','fav','order','elapsed','archivedAt'] as value
 ), content as (
 select case when jsonb_typeof(value->'subtasks')='array' then jsonb_set(value,'{subtasks}',
   coalesce((select jsonb_agg((s.item - array['done','updated','completedAt','elapsed']) order by s.position)
    from jsonb_array_elements(value->'subtasks') with ordinality s(item,position)),'[]'::jsonb)) else value end as value
 from normalized
 ) select md5('assignment-v2:' || value::text) from content;
$$;
revoke all on function app_private.task2_assignment_revision(jsonb) from public,anon,authenticated;

create or replace function app_private.task2_assignment_receipt(p_task_id text,p_revision text,p_request_id uuid,p_accept boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor public.app_users; scope_name text; role_name text; workspace jsonb; workspace_version bigint; task jsonb;
 revision text; receipt app_private.task2_assignment_receipts; existing app_private.task2_assignment_receipts;
begin
 if auth.uid() is null then raise exception 'ERP oturumu gerekli' using errcode='42501';end if;
 select * into strict actor from public.app_users where auth_user_id=auth.uid() and is_active;
 scope_name:=coalesce(actor.branch_id::text,'hq');
 if p_task_id is null or length(p_task_id) not between 1 and 100 then raise exception 'Görev kimliği gerekli' using errcode='22023';end if;
 select data,version into workspace,workspace_version from app_private.task2_workspace where scope=scope_name and version>0 for update;
 if not found or jsonb_typeof(workspace->'tasks') is distinct from 'array' then raise exception 'Görev kaynağı doğrulanamadı' using errcode='22023';end if;
 select value into strict task from jsonb_array_elements(workspace->'tasks') where value->>'id'=p_task_id;
 revision:=app_private.task2_assignment_revision(task);
 if p_accept then
  select role into role_name from app_private.kokpit_roles where user_id=actor.id;
  role_name:=coalesce(role_name,case when actor.role in ('CEO','GENERAL_MANAGER','BRANCH_MANAGER') then 'yonetici'
   when actor.role in ('INSPECTION_TECHNICIAN','OPERATIONS','CRM_AGENT','MARKETING','HR','FRANCHISE_SALES','SUPPORT_AGENT','ACADEMY_MANAGER') then 'calisan' else 'izleyici' end);
  if role_name not in ('yonetici','calisan') or task->>'assignee' is distinct from actor.id::text then
   raise exception 'Görevi yalnız atanmış ve yetkili çalışan kabul edebilir' using errcode='42501';end if;
  if task->'archived'='true'::jsonb or task->>'status' is null or task->>'status' not in ('backlog','todo','progress') then
   raise exception 'Bu görev kabul aşamasında değil' using errcode='22023';end if;
  if p_revision is distinct from revision or p_request_id is null then raise exception 'Görev değişti; yeniden okuyun' using errcode='40001';end if;
  select * into existing from app_private.task2_assignment_receipts where scope=scope_name and request_id=p_request_id;
  if found then
   if existing.task_id<>p_task_id or existing.source_revision<>revision or existing.actor_id<>actor.id then
    raise exception 'İstek kimliği farklı işlemde kullanıldı' using errcode='22023';end if;
  else
   insert into app_private.task2_assignment_receipts(scope,request_id,task_id,source_revision,actor_id)
   values(scope_name,p_request_id,p_task_id,revision,actor.id);
  end if;
 end if;
 select * into receipt from app_private.task2_assignment_receipts
 where scope=scope_name and task_id=p_task_id and source_revision=revision and actor_id::text=task->>'assignee'
 order by accepted_at desc limit 1;
 return jsonb_build_object('source','task2','task_id',p_task_id,'source_revision',revision,'workspace_version',workspace_version,
  'accepted',receipt.request_id is not null,'accepted_at',receipt.accepted_at,
  'current_owner',task->>'assignee'=actor.id::text,'archived',coalesce(task->'archived'='true'::jsonb,false),
  'task_status',task->>'status','meaning','assignment_acknowledgement_only');
exception when no_data_found or too_many_rows then
 raise exception 'Tekil aktif hesap veya görev doğrulanamadı' using errcode='42501';
end $$;

-- Read-only TASK2 aggregate. No fallback to legacy v24, no task or identity payload.
create or replace function app_private.office_task2_health_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor public.app_users; scope_name text; result jsonb; workspace jsonb;
begin
 if auth.uid() is null or app_private.franchise_office_manager() is not true then
  raise exception 'Yetkili merkez oturumu gerekli.' using errcode='42501';
 end if;
 select * into strict actor from public.app_users where auth_user_id=auth.uid() and is_active;
 scope_name:=coalesce(actor.branch_id::text,'hq');
 select data into workspace from app_private.task2_workspace where scope=scope_name and version>0;
 if not found or jsonb_typeof(workspace->'tasks') is distinct from 'array' then raise exception 'TASK2 çalışma alanı doğrulanamadı.' using errcode='22023';end if;
 with records as (
  select t.value->>'status' as state,
   exists(select 1 from app_private.task2_assignment_receipts r where r.scope=scope_name and r.task_id=t.value->>'id' and r.source_revision=app_private.task2_assignment_revision(t.value) and r.actor_id::text=t.value->>'assignee') as accepted,
   nullif(btrim(t.value->>'assignee'),'') as owner,
   nullif(t.value->>'due','') as due_text,
   app_private.office_health_date(t.value->>'due') as due,
   exists(select 1 from public.app_users u where u.is_active
    and coalesce(u.branch_id::text,'hq')=scope_name and u.id::text=t.value->>'assignee') as owner_resolved
  from jsonb_array_elements(workspace->'tasks') t where t.value->'archived' is distinct from 'true'::jsonb
 ) select jsonb_build_object(
  'total',count(*),
  'accepted_open',count(*) filter(where state in ('backlog','todo','progress','review') and owner_resolved and accepted),
  'acceptance_pending',count(*) filter(where state in ('backlog','todo','progress','review') and owner_resolved and not accepted),
  'acceptance_unavailable',count(*) filter(where state in ('backlog','todo','progress','review') and not owner_resolved),
  'review_pending',count(*) filter(where state='review'),
  'archived',(select count(*) from jsonb_array_elements(workspace->'tasks') a where a.value->'archived'='true'::jsonb),
  'open',count(*) filter(where state in ('backlog','todo','progress','review')),
  'in_progress',count(*) filter(where state='progress'),
  'reported_done',count(*) filter(where state='done'),
  'owner_missing',count(*) filter(where state in ('backlog','todo','progress','review') and owner is null),
  'owner_unresolved',count(*) filter(where state in ('backlog','todo','progress','review') and owner is not null and not owner_resolved),
  'past_due',count(*) filter(where state in ('backlog','todo','progress','review') and due < (current_timestamp at time zone 'Europe/Istanbul')::date),
  'due_missing',count(*) filter(where state in ('backlog','todo','progress','review') and due_text is null),
  'due_invalid',count(*) filter(where state in ('backlog','todo','progress','review') and due_text is not null and due is null),
  'unknown_status',count(*) filter(where state is null or state not in ('backlog','todo','progress','review','done')),
  'acceptance_supported',true,'evidence_supported',false,
  'scope','current_user_scope','source','task2','observed_at',current_timestamp
 ) into result from records;
 return result;
exception when no_data_found or too_many_rows then
 raise exception 'Tekil ve aktif ERP hesabı doğrulanamadı.' using errcode='42501';
end $$;
