-- Ownership changes only when the named recipient explicitly accepts current work.
-- Same ERP workspace only: no branch or financial permission is granted by a handoff.
create table app_private.task2_handoffs (
 scope text not null,task_id text not null,version bigint not null,
 state text not null check(state in ('pending','accepted','declined','cancelled')),
 source_revision text not null,result_revision text,
 sender_id uuid not null,recipient_id uuid not null,acceptance text not null,
 resolution text,created_at timestamptz not null,resolved_at timestamptz,
 primary key(scope,task_id),check(sender_id<>recipient_id)
);
create table app_private.task2_handoff_events (
 scope text not null,request_id uuid not null,task_id text not null,actor_id uuid not null,
 action text not null,source_revision text not null,expected_version bigint not null,
 payload jsonb not null,result_revision text not null,result_version bigint not null,
 at timestamptz not null default clock_timestamp(),primary key(scope,request_id)
);
alter table app_private.task2_handoffs enable row level security;
alter table app_private.task2_handoff_events enable row level security;
revoke all on app_private.task2_handoffs,app_private.task2_handoff_events from public,anon,authenticated;

create function app_private.task2_handoff_action(p_task_id text,p_action text,p_revision text,p_version bigint,p_request_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor public.app_users;recipient public.app_users;scope_name text;role_name text;recipient_role text;
 workspace jsonb;workspace_version bigint;task jsonb;revision text;new_revision text;is_current boolean;
 h app_private.task2_handoffs;e app_private.task2_handoff_events;
begin
 if auth.uid() is null then raise exception 'ERP oturumu gerekli' using errcode='42501';end if;
 select * into strict actor from public.app_users where auth_user_id=auth.uid() and is_active;
 scope_name:=coalesce(actor.branch_id::text,'hq');
 select role into role_name from app_private.kokpit_roles where user_id=actor.id;
 role_name:=coalesce(role_name,case when actor.role in ('CEO','GENERAL_MANAGER','BRANCH_MANAGER') then 'yonetici'
 when actor.role in ('INSPECTION_TECHNICIAN','OPERATIONS','CRM_AGENT','MARKETING','HR','FRANCHISE_SALES','SUPPORT_AGENT','ACADEMY_MANAGER') then 'calisan' else 'izleyici' end);
 if p_task_id is null or length(p_task_id) not between 1 and 100 or p_action is null or p_action not in ('read','offer','accept','decline','cancel') then
 raise exception 'Geçersiz devir işlemi' using errcode='22023';end if;
 select data,version into workspace,workspace_version from app_private.task2_workspace where scope=scope_name and version>0 for update;
 if not found or jsonb_typeof(workspace->'tasks') is distinct from 'array' then raise exception 'Görev kaynağı doğrulanamadı' using errcode='22023';end if;
 select value into strict task from jsonb_array_elements(workspace->'tasks') where value->>'id'=p_task_id;
 revision:=app_private.task2_assignment_revision(task);
 select * into h from app_private.task2_handoffs where scope=scope_name and task_id=p_task_id for update;
 is_current:=coalesce(revision=case when h.state='accepted' then h.result_revision else h.source_revision end,false);
 if p_action<>'read' then
  if role_name not in ('yonetici','calisan') then raise exception 'Yazma yetkisi gerekli' using errcode='42501';end if;
  if task->'archived'='true'::jsonb or task->>'status' is null or task->>'status' not in ('backlog','todo','progress') then
   raise exception 'Yalnız açık görev devredilebilir' using errcode='22023';end if;
  if p_version is null or p_request_id is null or p_revision is null or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>5000 then
   raise exception 'Kaynak sürümü ve geçerli işlem alanları gerekli' using errcode='22023';end if;
  select * into e from app_private.task2_handoff_events where scope=scope_name and request_id=p_request_id;
  if found then
   if e.task_id<>p_task_id or e.actor_id<>actor.id or e.action<>p_action or e.source_revision<>p_revision or e.expected_version<>p_version or e.payload<>p_payload then
    raise exception 'İstek kimliği farklı işlemde kullanıldı' using errcode='22023';end if;
   if e.result_revision<>revision or e.result_version is distinct from h.version then raise exception 'Devir veya kaynak değişti; yeniden okuyun' using errcode='40001';end if;
   return app_private.task2_handoff_action(p_task_id,'read',null,null,null,'{}'::jsonb);
  end if;
  if p_revision<>revision or p_version<>coalesce(h.version,0) then raise exception 'Devir veya kaynak değişti; yeniden okuyun' using errcode='40001';end if;
  if p_action='offer' then
   if task->>'assignee' is distinct from actor.id::text then raise exception 'Yalnız mevcut sorumlu devir önerebilir' using errcode='42501';end if;
   if is_current and h.state='pending' then raise exception 'Mevcut devir sonuçlanmalı' using errcode='22023';end if;
   if p_payload-'recipient_id'-'acceptance'<>'{}'::jsonb or jsonb_typeof(p_payload->'recipient_id') is distinct from 'string'
    or jsonb_typeof(p_payload->'acceptance') is distinct from 'string' or length(btrim(p_payload->>'acceptance')) not between 5 and 2000 then
    raise exception 'Alıcı ve kabul koşulu gerekli' using errcode='22023';end if;
   select * into strict recipient from public.app_users where id::text=p_payload->>'recipient_id' and is_active and coalesce(branch_id::text,'hq')=scope_name;
   select role into recipient_role from app_private.kokpit_roles where user_id=recipient.id;
   recipient_role:=coalesce(recipient_role,case when recipient.role in ('CEO','GENERAL_MANAGER','BRANCH_MANAGER') then 'yonetici'
    when recipient.role in ('INSPECTION_TECHNICIAN','OPERATIONS','CRM_AGENT','MARKETING','HR','FRANCHISE_SALES','SUPPORT_AGENT','ACADEMY_MANAGER') then 'calisan' else 'izleyici' end);
   if recipient.id=actor.id or recipient_role not in ('yonetici','calisan') then raise exception 'Farklı ve yetkili alıcı gerekli' using errcode='42501';end if;
   if not exists(select 1 from app_private.task2_assignment_receipts r where r.scope=scope_name and r.task_id=p_task_id and r.actor_id=actor.id and r.source_revision=revision) then
    raise exception 'Önce güncel görev kabulü gerekli' using errcode='22023';end if;
   insert into app_private.task2_handoffs(scope,task_id,version,state,source_revision,sender_id,recipient_id,acceptance,created_at)
   values(scope_name,p_task_id,coalesce(h.version,0)+1,'pending',revision,actor.id,recipient.id,btrim(p_payload->>'acceptance'),clock_timestamp())
   on conflict(scope,task_id) do update set version=excluded.version,state='pending',source_revision=excluded.source_revision,result_revision=null,
    sender_id=excluded.sender_id,recipient_id=excluded.recipient_id,acceptance=excluded.acceptance,resolution=null,created_at=excluded.created_at,resolved_at=null returning * into h;
  else
   if not is_current or h.state<>'pending' or task->>'assignee' is distinct from h.sender_id::text then
    raise exception 'Güncel bekleyen devir bulunamadı' using errcode='40001';end if;
   if p_action in ('accept','decline') and actor.id<>h.recipient_id then raise exception 'Yalnız belirtilen alıcı yanıtlayabilir' using errcode='42501';end if;
   if p_action='cancel' and actor.id<>h.sender_id and role_name<>'yonetici' then raise exception 'Sorumlu veya yönetici gerekli' using errcode='42501';end if;
   if p_action='accept' then
    if p_payload<>'{}'::jsonb then raise exception 'Kabul alanları geçersiz' using errcode='22023';end if;
    if not exists(select 1 from public.app_users u where u.id=h.sender_id and u.is_active and coalesce(u.branch_id::text,'hq')=scope_name) then
     raise exception 'Gönderen artık aktif değil; yönetici incelemesi gerekli' using errcode='42501';end if;
    task:=task||jsonb_build_object('assignee',actor.id::text,'updated',floor(extract(epoch from clock_timestamp())*1000));
    new_revision:=app_private.task2_assignment_revision(task);
    workspace:=jsonb_set(workspace,'{tasks}',(select jsonb_agg(case when value->>'id'=p_task_id then task else value end order by ordinality) from jsonb_array_elements(workspace->'tasks') with ordinality));
    update app_private.task2_workspace set data=workspace,version=version+1,updated_at=clock_timestamp(),updated_by=actor.id where scope=scope_name returning version into workspace_version;
    -- Ownership and the new owner's acknowledgement commit in the same transaction.
    insert into app_private.task2_assignment_receipts(scope,request_id,task_id,source_revision,actor_id)
     values(scope_name,gen_random_uuid(),p_task_id,new_revision,actor.id);
   else
    if p_payload-'reason'<>'{}'::jsonb or jsonb_typeof(p_payload->'reason') is distinct from 'string' or length(btrim(p_payload->>'reason')) not between 5 and 2000 then
     raise exception 'Ret veya iptal gerekçesi gerekli' using errcode='22023';end if;
   end if;
   update app_private.task2_handoffs set state=case p_action when 'accept' then 'accepted' when 'decline' then 'declined' else 'cancelled' end,
    version=version+1,result_revision=new_revision,resolution=p_payload->>'reason',resolved_at=clock_timestamp() where scope=scope_name and task_id=p_task_id returning * into h;
  end if;
  insert into app_private.task2_handoff_events(scope,request_id,task_id,actor_id,action,source_revision,expected_version,payload,result_revision,result_version)
   values(scope_name,p_request_id,p_task_id,actor.id,p_action,revision,p_version,p_payload,coalesce(new_revision,revision),h.version);
  revision:=coalesce(new_revision,revision);is_current:=true;
 end if;
 return jsonb_build_object('source','task2','task_id',p_task_id,'source_revision',revision,'workspace_version',workspace_version,
  'version',coalesce(h.version,0),'state',coalesce(h.state,'none'),'current',is_current,'sender_id',h.sender_id,'recipient_id',h.recipient_id,
  'acceptance',h.acceptance,'resolution',h.resolution,'created_at',h.created_at,'resolved_at',h.resolved_at,
  'is_owner',coalesce(task->>'assignee'=actor.id::text,false),'is_recipient',coalesce(h.recipient_id=actor.id,false),'is_manager',role_name='yonetici',
  'meaning','ownership_changes_only_on_recipient_acceptance');
exception when no_data_found or too_many_rows then raise exception 'Tekil aktif hesap, alıcı veya görev doğrulanamadı' using errcode='42501';
end $$;
revoke all on function app_private.task2_handoff_action(text,text,text,bigint,uuid,jsonb) from public,anon,authenticated;
create function public.task2_handoff_action(p_task_id text,p_action text default 'read',p_revision text default null,p_version bigint default null,p_request_id uuid default null,p_payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$select app_private.task2_handoff_action(p_task_id,p_action,p_revision,p_version,p_request_id,p_payload)$$;
revoke all on function public.task2_handoff_action(text,text,text,bigint,uuid,jsonb) from public,anon,authenticated;
grant execute on function app_private.task2_handoff_action(text,text,text,bigint,uuid,jsonb),public.task2_handoff_action(text,text,text,bigint,uuid,jsonb) to authenticated;
