-- Assignment acknowledgement only. Does not approve, complete or reassign tasks.
create table app_private.task2_assignment_receipts (
 scope text not null, request_id uuid not null, task_id text not null,
 source_revision text not null, actor_id uuid not null, accepted_at timestamptz not null default clock_timestamp(),
 primary key(scope,request_id)
);
create index task2_assignment_receipts_task on app_private.task2_assignment_receipts(scope,task_id,accepted_at desc);
alter table app_private.task2_assignment_receipts enable row level security;
revoke all on app_private.task2_assignment_receipts from public,anon,authenticated;

create function app_private.task2_assignment_receipt(p_task_id text,p_revision text,p_request_id uuid,p_accept boolean)
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
 revision:=md5(task::text);
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
revoke all on function app_private.task2_assignment_receipt(text,text,uuid,boolean) from public,anon,authenticated;

create function public.get_task2_assignment_receipt(p_task_id text) returns jsonb
language sql security invoker set search_path='' as $$ select app_private.task2_assignment_receipt(p_task_id,null,null,false); $$;
create function public.accept_task2_assignment(p_task_id text,p_revision text,p_request_id uuid) returns jsonb
language sql security invoker set search_path='' as $$ select app_private.task2_assignment_receipt(p_task_id,p_revision,p_request_id,true); $$;
revoke all on function public.get_task2_assignment_receipt(text),public.accept_task2_assignment(text,text,uuid) from public,anon,authenticated;
grant execute on function app_private.task2_assignment_receipt(text,text,uuid,boolean),public.get_task2_assignment_receipt(text),public.accept_task2_assignment(text,text,uuid) to authenticated;
