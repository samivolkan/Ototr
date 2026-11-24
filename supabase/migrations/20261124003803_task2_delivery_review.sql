-- Evidence references are claims until a separate authorized human reviews them.
-- No customer messages, financial policy or inspection report mutation.
create table app_private.task2_deliveries (
 scope text not null, task_id text not null, source_revision text not null,
 version bigint not null, state text not null check(state in ('submitted','rejected','reviewed','closed')),
 producer_id uuid not null, evidence_reference text not null, submitted_at timestamptz not null,
 reviewer_id uuid, review_note text, reviewed_at timestamptz, closed_by uuid, closed_at timestamptz,
 primary key(scope,task_id),check(reviewer_id is null or reviewer_id<>producer_id)
);
create table app_private.task2_delivery_events (
 scope text not null, request_id uuid not null, task_id text not null,
 source_revision text not null, expected_version bigint not null, action text not null,
 actor_id uuid not null, payload jsonb not null, resulting_version bigint not null,
 at timestamptz not null default clock_timestamp(),primary key(scope,request_id)
);
alter table app_private.task2_deliveries enable row level security;
alter table app_private.task2_delivery_events enable row level security;
revoke all on app_private.task2_deliveries,app_private.task2_delivery_events from public,anon,authenticated;

create function app_private.task2_delivery_action(p_task_id text,p_action text,p_revision text,p_version bigint,p_request_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor public.app_users;scope_name text;role_name text;workspace jsonb;workspace_version bigint;task jsonb;
 revision text;d app_private.task2_deliveries;e app_private.task2_delivery_events;owner boolean;manager boolean;
begin
 if auth.uid() is null then raise exception 'ERP oturumu gerekli' using errcode='42501';end if;
 select * into strict actor from public.app_users where auth_user_id=auth.uid() and is_active;
 scope_name:=coalesce(actor.branch_id::text,'hq');
 select role into role_name from app_private.kokpit_roles where user_id=actor.id;
 role_name:=coalesce(role_name,case when actor.role in ('CEO','GENERAL_MANAGER','BRANCH_MANAGER') then 'yonetici'
 when actor.role in ('INSPECTION_TECHNICIAN','OPERATIONS','CRM_AGENT','MARKETING','HR','FRANCHISE_SALES','SUPPORT_AGENT','ACADEMY_MANAGER') then 'calisan' else 'izleyici' end);
 manager:=role_name='yonetici';
 if p_task_id is null or length(p_task_id) not between 1 and 100 or p_action is null or p_action not in ('read','submit','review','close') then
 raise exception 'Geçersiz teslim işlemi' using errcode='22023';end if;
 select data,version into workspace,workspace_version from app_private.task2_workspace where scope=scope_name and version>0 for update;
 if not found or jsonb_typeof(workspace->'tasks') is distinct from 'array' then raise exception 'Görev kaynağı doğrulanamadı' using errcode='22023';end if;
 select value into strict task from jsonb_array_elements(workspace->'tasks') where value->>'id'=p_task_id;
 revision:=app_private.task2_assignment_revision(task);
 owner:=coalesce(task->>'assignee'=actor.id::text,false);
 select * into d from app_private.task2_deliveries where scope=scope_name and task_id=p_task_id for update;
 if p_action<>'read' then
  if role_name not in ('yonetici','calisan') then raise exception 'Yazma yetkisi gerekli' using errcode='42501';end if;
  if task->'archived'='true'::jsonb then raise exception 'Arşivlenen görev ilerletilemez' using errcode='22023';end if;
  if p_revision is distinct from revision or p_version is null or p_request_id is null then raise exception 'Kaynak sürümü değişti; yeniden okuyun' using errcode='40001';end if;
  if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>5000 then raise exception 'Geçersiz kanıt alanları' using errcode='22023';end if;
  select * into e from app_private.task2_delivery_events where scope=scope_name and request_id=p_request_id;
  if found then
   if e.task_id<>p_task_id or e.source_revision<>revision or e.expected_version<>p_version or e.action<>p_action or e.actor_id<>actor.id or e.payload<>p_payload then
    raise exception 'İstek kimliği farklı işlemde kullanıldı' using errcode='22023';end if;
   return app_private.task2_delivery_action(p_task_id,'read',null,null,null,'{}'::jsonb);
  end if;
  if p_version<>coalesce(d.version,0) then raise exception 'Teslim başka kullanıcı tarafından değiştirildi' using errcode='40001';end if;
  if p_action='submit' then
   if not owner then raise exception 'Yalnız atanmış çalışan teslim edebilir' using errcode='42501';end if;
   if task->>'status' is null or task->>'status' not in ('progress','review') then raise exception 'Önce görevi başlatın' using errcode='22023';end if;
   if not exists(select 1 from app_private.task2_assignment_receipts r where r.scope=scope_name and r.task_id=p_task_id and r.actor_id=actor.id and r.source_revision=revision) then
    raise exception 'Güncel görev kabulü gerekli' using errcode='22023';end if;
   if p_payload-'reference'<>'{}'::jsonb or jsonb_typeof(p_payload->'reference') is distinct from 'string' or length(btrim(p_payload->>'reference')) not between 5 and 1000 then
    raise exception 'Kanıt referansı gerekli' using errcode='22023';end if;
   if d.source_revision=revision and d.state in ('submitted','reviewed','closed') then raise exception 'Mevcut teslim ilerletilmeli; üzerine yazılamaz' using errcode='22023';end if;
   insert into app_private.task2_deliveries(scope,task_id,source_revision,version,state,producer_id,evidence_reference,submitted_at)
   values(scope_name,p_task_id,revision,coalesce(d.version,0)+1,'submitted',actor.id,btrim(p_payload->>'reference'),clock_timestamp())
   on conflict(scope,task_id) do update set source_revision=excluded.source_revision,version=excluded.version,state='submitted',producer_id=excluded.producer_id,
    evidence_reference=excluded.evidence_reference,submitted_at=excluded.submitted_at,reviewer_id=null,review_note=null,reviewed_at=null,closed_by=null,closed_at=null returning * into d;
  else
   if not manager then raise exception 'Yönetici yetkisi gerekli' using errcode='42501';end if;
   if d.task_id is null or d.source_revision<>revision then raise exception 'Güncel teslim bulunamadı' using errcode='40001';end if;
   if p_action='review' then
    if d.state<>'submitted' or d.producer_id=actor.id then raise exception 'Üreticiden farklı yetkili inceleyen gerekli' using errcode='42501';end if;
    if p_payload-'decision'-'note'<>'{}'::jsonb or p_payload->>'decision' is null or p_payload->>'decision' not in ('approve','reject') or jsonb_typeof(p_payload->'note') is distinct from 'string' or length(btrim(p_payload->>'note')) not between 5 and 2000 then
     raise exception 'İnceleme kararı ve gerekçesi gerekli' using errcode='22023';end if;
    update app_private.task2_deliveries set state=case when p_payload->>'decision'='approve' then 'reviewed' else 'rejected' end,version=version+1,
     reviewer_id=actor.id,review_note=btrim(p_payload->>'note'),reviewed_at=clock_timestamp() where scope=scope_name and task_id=p_task_id returning * into d;
   elsif p_action='close' then
    if p_payload<>'{}'::jsonb or d.state<>'reviewed' or d.reviewer_id is null or not exists(select 1 from public.app_users u where u.id=d.reviewer_id and u.is_active and coalesce(u.branch_id::text,'hq')=scope_name) then
     raise exception 'Bağımsız inceleme ve aktif inceleyen gerekli' using errcode='22023';end if;
    update app_private.task2_deliveries set state='closed',version=version+1,closed_by=actor.id,closed_at=clock_timestamp() where scope=scope_name and task_id=p_task_id returning * into d;
   end if;
  end if;
  -- Only this task's status metadata changes; unrelated workspace fields remain intact.
  workspace:=jsonb_set(workspace,'{tasks}',(select jsonb_agg(case when value->>'id'=p_task_id then value||jsonb_build_object(
    'status',case when d.state='closed' then 'done' when d.state='rejected' then 'progress' else 'review' end,
    'updated',floor(extract(epoch from clock_timestamp())*1000))||case when d.state='closed' then jsonb_build_object('completedAt',floor(extract(epoch from clock_timestamp())*1000)) else '{}'::jsonb end else value end order by ordinality)
    from jsonb_array_elements(workspace->'tasks') with ordinality));
  update app_private.task2_workspace set data=workspace,version=version+1,updated_at=clock_timestamp(),updated_by=actor.id where scope=scope_name returning version into workspace_version;
  insert into app_private.task2_delivery_events(scope,request_id,task_id,source_revision,expected_version,action,actor_id,payload,resulting_version)
   values(scope_name,p_request_id,p_task_id,revision,p_version,p_action,actor.id,p_payload,d.version);
 end if;
 return jsonb_build_object('source','task2','task_id',p_task_id,'source_revision',revision,'workspace_version',workspace_version,
  'version',coalesce(d.version,0),'state',coalesce(d.state,'not_submitted'),'current',d.task_id is not null and d.source_revision=revision,
  'reference',d.evidence_reference,'submitted_at',d.submitted_at,'review_note',d.review_note,'reviewed_at',d.reviewed_at,'closed_at',d.closed_at,
  'is_owner',owner,'is_manager',manager,'is_producer',coalesce(d.producer_id=actor.id,false),'archived',coalesce(task->'archived'='true'::jsonb,false),
  'meaning','human_review_required');
exception when no_data_found or too_many_rows then raise exception 'Tekil aktif hesap veya görev doğrulanamadı' using errcode='42501';
end $$;
revoke all on function app_private.task2_delivery_action(text,text,text,bigint,uuid,jsonb) from public,anon,authenticated;
create function public.task2_delivery_action(p_task_id text,p_action text default 'read',p_revision text default null,p_version bigint default null,p_request_id uuid default null,p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.task2_delivery_action(p_task_id,p_action,p_revision,p_version,p_request_id,p_payload);
$$;
revoke all on function public.task2_delivery_action(text,text,text,bigint,uuid,jsonb) from public,anon,authenticated;
grant execute on function app_private.task2_delivery_action(text,text,text,bigint,uuid,jsonb),public.task2_delivery_action(text,text,text,bigint,uuid,jsonb) to authenticated;
