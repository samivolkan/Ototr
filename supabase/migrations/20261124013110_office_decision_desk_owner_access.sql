-- Canonical ERP headquarters authorization controls desk ownership; TASK2 manager rights still gate plan creation/review.
create or replace function app_private.office_decision_queue(p_action text,p_payload jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor public.app_users;scope_name text;role_name text;desk app_private.office_decision_desks;
 entry app_private.office_decisions;previous app_private.office_decision_events;
 workspace jsonb;task jsonb;delivery app_private.task2_deliveries;
 today date:=(clock_timestamp() at time zone 'Europe/Istanbul')::date;
 day_to_reserve date;minutes_to_reserve integer;used_day bigint;used_week bigint;pending_count bigint;
 revision text;field text;items jsonb;review_items jsonb;budget jsonb;
begin
 if auth.uid() is null or app_private.franchise_office_manager() is not true then raise exception 'Yetkili merkez oturumu gerekli' using errcode='42501';end if;
 select * into strict actor from public.app_users where auth_user_id=auth.uid() and is_active;
 scope_name:=coalesce(actor.branch_id::text,'hq');
 select role into role_name from app_private.kokpit_roles where user_id=actor.id;
 role_name:=coalesce(role_name,case when actor.role in ('CEO','GENERAL_MANAGER','BRANCH_MANAGER') then 'yonetici' else 'izleyici' end);
 if p_action in ('enqueue','review') and role_name<>'yonetici' then raise exception 'Görev yöneticisi yetkisi gerekli' using errcode='42501';end if;
 if p_action is null or p_action not in ('read','initialize','enqueue','review','answer','cancel') or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>15000 then
  raise exception 'Geçersiz karar işlemi' using errcode='22023';end if;
 -- Same lock order as task mutation adapters: workspace, then queue policy.
 select data into workspace from app_private.task2_workspace where scope=scope_name and version>0 for update;
 if not found or jsonb_typeof(workspace->'tasks') is distinct from 'array' then raise exception 'Görev kaynağı doğrulanamadı' using errcode='22023';end if;
 if p_action='initialize' then
  if p_payload<>'{}'::jsonb then raise exception 'Kurulum alanları geçersiz' using errcode='22023';end if;
  insert into app_private.office_decision_desks(scope,owner_id) values(scope_name,actor.id) on conflict(scope) do nothing;
 end if;
 select * into desk from app_private.office_decision_desks where scope=scope_name for update;
 if not found then
  if p_action='read' then return jsonb_build_object('source','office_decision_queue','configured',false,'scope','current_user_scope');end if;
  raise exception 'Karar masası sahibi henüz belirlenmedi' using errcode='22023';
 end if;
 if p_action='initialize' and desk.owner_id<>actor.id then raise exception 'Karar masası başka sahibine bağlı; sahip değiştirilemez' using errcode='42501';end if;
 if not exists(select 1 from public.app_users u where u.id=desk.owner_id and u.is_active and coalesce(u.branch_id::text,'hq')=scope_name) then
  raise exception 'Karar sahibi etkin kapsamda değil; yönetişim incelemesi gerekli' using errcode='42501';end if;
 if p_action in ('enqueue','review','answer','cancel') then
  if p_request_id is null then raise exception 'Tekil istek kimliği gerekli' using errcode='22023';end if;
  select * into previous from app_private.office_decision_events where scope=scope_name and request_id=p_request_id;
  if found then
   if previous.actor_id<>actor.id or previous.action<>p_action or previous.payload<>p_payload then raise exception 'İstek kimliği farklı içerikle kullanıldı' using errcode='22023';end if;
   return app_private.office_decision_queue('read','{}'::jsonb,null);
  end if;
  if p_action='enqueue' then
   if p_payload-'task_id'-'source_revision'-'delivery_version'-'decision_key'-'plan'-'priority'-'minutes'-'day'<>'{}'::jsonb then raise exception 'Tanımsız karar alanı' using errcode='22023';end if;
   if jsonb_typeof(p_payload->'plan') is distinct from 'object' then raise exception 'Karar planı gerekli' using errcode='22023';end if;
   foreach field in array array['finding','evidence','recommendation','risk','effort','decision'] loop
    if jsonb_typeof(p_payload->'plan'->field) is distinct from 'string' or length(btrim(p_payload->'plan'->>field)) not between 3 and 2000 then raise exception 'Zorunlu plan alanı eksik: %',field using errcode='22023';end if;
   end loop;
   if p_payload->'plan'->>'risk' not in ('para','yetki','veri','şema','tasarım','düşük') or length(btrim(coalesce(p_payload->>'decision_key',''))) not between 3 and 100 then raise exception 'Risk ve karar anahtarı gerekli' using errcode='22023';end if;
   select value into strict task from jsonb_array_elements(workspace->'tasks') where value->>'id'=p_payload->>'task_id';
   revision:=app_private.task2_assignment_revision(task);
   select * into delivery from app_private.task2_deliveries where scope=scope_name and task_id=task->>'id';
   if task->'archived'='true'::jsonb or task->>'status' is distinct from 'review' or p_payload->>'source_revision' is distinct from revision
    or delivery.source_revision is distinct from revision or delivery.state is distinct from 'reviewed' or delivery.version::text is distinct from p_payload->>'delivery_version'
    or delivery.reviewer_id is null or delivery.reviewer_id=delivery.producer_id or not exists(select 1 from public.app_users u where u.id=delivery.reviewer_id and u.is_active and coalesce(u.branch_id::text,'hq')=scope_name) then
    raise exception 'Güncel kaynak ve bağımsız incelenmiş teslim gerekli' using errcode='40001';end if;
   if p_payload->'plan'->>'evidence' is distinct from delivery.evidence_reference then raise exception 'İncelenmiş teslim kanıtı kullanılmalı' using errcode='22023';end if;
   if exists(select 1 from app_private.office_decisions q where q.scope=scope_name and q.task_id=task->>'id' and q.source_revision=revision and q.decision_key=lower(btrim(p_payload->>'decision_key'))) then
    raise exception 'Bu kaynak ve karar başlığı zaten kayıtlı; mevcut kaydı inceleyin' using errcode='22023';end if;
   if coalesce(p_payload->>'minutes','')!~'^[0-9]{1,2}$' or coalesce(p_payload->>'priority','')!~'^[1-3]$' or coalesce(p_payload->>'day','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Süre, öncelik ve tarih gerekli' using errcode='22023';end if;
   minutes_to_reserve:=(p_payload->>'minutes')::integer;day_to_reserve:=(p_payload->>'day')::date;
   if minutes_to_reserve not between 1 and 45 or day_to_reserve<today or day_to_reserve>today+13 then raise exception 'İnceleme planı sınır dışında' using errcode='22023';end if;
   select count(*) into pending_count from app_private.office_decisions where scope=scope_name and state in ('review_required','pending');
   if pending_count>=10 then raise exception 'Karar kuyruğu dolu: önce mevcut 10 maddeyi azaltın' using errcode='54000';end if;
   select coalesce(sum(case when state in ('review_required','pending') and scheduled_day=day_to_reserve then reserved_minutes when state='answered' and review_day=day_to_reserve then actual_minutes else 0 end),0),
    coalesce(sum(case when state in ('review_required','pending') and date_trunc('week',scheduled_day::timestamp)=date_trunc('week',day_to_reserve::timestamp) then reserved_minutes when state='answered' and date_trunc('week',review_day::timestamp)=date_trunc('week',day_to_reserve::timestamp) then actual_minutes else 0 end),0)
    into used_day,used_week from app_private.office_decisions where scope=scope_name;
   if used_day+minutes_to_reserve>45 or used_week+minutes_to_reserve>840 then raise exception 'İnceleme süresi dolu; mevcut işleri azaltın veya başka güne planlayın' using errcode='54000';end if;
   insert into app_private.office_decisions(scope,task_id,source_revision,delivery_version,decision_key,plan,priority,reserved_minutes,scheduled_day,state,created_by)
    values(scope_name,task->>'id',revision,delivery.version,lower(btrim(p_payload->>'decision_key')),p_payload->'plan',(p_payload->>'priority')::integer,minutes_to_reserve,day_to_reserve,'review_required',actor.id) returning * into entry;
  elsif p_action='review' then
   if p_payload-'id'-'version'-'note'<>'{}'::jsonb then raise exception 'Tanımsız inceleme alanı' using errcode='22023';end if;
   select * into strict entry from app_private.office_decisions where scope=scope_name and id::text=p_payload->>'id';
   if entry.created_by=actor.id then raise exception 'Planı üreten kişi inceleyemez' using errcode='42501';end if;
   if entry.state<>'review_required' or entry.version::text is distinct from p_payload->>'version' then raise exception 'İnceleme kaydı değişti' using errcode='40001';end if;
   if jsonb_typeof(p_payload->'note') is distinct from 'string' or length(btrim(p_payload->>'note')) not between 5 and 2000 then raise exception 'İnceleme kanıtı ve gerekçesi gerekli' using errcode='22023';end if;
   select value into strict task from jsonb_array_elements(workspace->'tasks') where value->>'id'=entry.task_id;
   select * into delivery from app_private.task2_deliveries where scope=scope_name and task_id=entry.task_id;
   if app_private.task2_assignment_revision(task)<>entry.source_revision or task->'archived'='true'::jsonb or task->>'status' is distinct from 'review' or delivery.version is distinct from entry.delivery_version or delivery.state is distinct from 'reviewed' then raise exception 'Kaynak veya inceleme değişti' using errcode='40001';end if;
   update app_private.office_decisions set state='pending',reviewed_by=actor.id,reviewed_at=clock_timestamp(),review_note=btrim(p_payload->>'note'),version=version+1 where id=entry.id returning * into entry;
  else
   if desk.owner_id<>actor.id then raise exception 'Yalnız karar masasının sahibi sonuçlandırabilir' using errcode='42501';end if;
   if p_payload-'id'-'version'-'answer'-'minutes'<>'{}'::jsonb then raise exception 'Tanımsız karar sonuç alanı' using errcode='22023';end if;
   select * into strict entry from app_private.office_decisions where scope=scope_name and id::text=p_payload->>'id';
   if (p_action='answer' and entry.state<>'pending') or (p_action='cancel' and entry.state not in ('review_required','pending')) or entry.version::text is distinct from p_payload->>'version' then raise exception 'Karar kaydı değişti; yeniden okuyun' using errcode='40001';end if;
   if jsonb_typeof(p_payload->'answer') is distinct from 'string' or length(btrim(p_payload->>'answer')) not between 3 and 2000 then raise exception 'Karar veya iptal gerekçesi gerekli' using errcode='22023';end if;
   if p_action='answer' then
    if entry.reviewed_by is null or entry.reviewed_by=entry.created_by or not exists(select 1 from public.app_users u where u.id=entry.reviewed_by and u.is_active and coalesce(u.branch_id::text,'hq')=scope_name) then raise exception 'Aktif bağımsız plan inceleyen gerekli' using errcode='42501';end if;
    select value into strict task from jsonb_array_elements(workspace->'tasks') where value->>'id'=entry.task_id;
    select * into delivery from app_private.task2_deliveries where scope=scope_name and task_id=entry.task_id;
    if app_private.task2_assignment_revision(task)<>entry.source_revision or task->'archived'='true'::jsonb or task->>'status' is distinct from 'review' or delivery.version is distinct from entry.delivery_version or delivery.state is distinct from 'reviewed' then raise exception 'Kaynak veya inceleme değişti; eski talep yanıtlanamaz' using errcode='40001';end if;
    if coalesce(p_payload->>'minutes','')!~'^[0-9]{1,4}$' or (p_payload->>'minutes')::integer not between 0 and 1440 then raise exception 'Gerçek inceleme süresi gerekli' using errcode='22023';end if;
   end if;
   -- Record actual overrun honestly; it blocks new reservations rather than hiding spent time.
   update app_private.office_decisions set state=case when p_action='answer' then 'answered' else 'cancelled' end,answer=btrim(p_payload->>'answer'),
    actual_minutes=case when p_action='answer' then (p_payload->>'minutes')::integer else null end,review_day=case when p_action='answer' then today else null end,
    version=version+1,resolved_by=actor.id,resolved_at=clock_timestamp() where id=entry.id returning * into entry;
  end if;
  insert into app_private.office_decision_events(scope,request_id,actor_id,action,payload,decision_id,result_version) values(scope_name,p_request_id,actor.id,p_action,p_payload,entry.id,entry.version);
 end if;
 select coalesce(jsonb_agg((to_jsonb(q)-'scope'-'created_by'-'resolved_by')||jsonb_build_object('can_review',q.state='review_required' and q.created_by<>actor.id and role_name='yonetici','source_current',exists(select 1 from jsonb_array_elements(workspace->'tasks') t join app_private.task2_deliveries d on d.scope=scope_name and d.task_id=t->>'id' where t->>'id'=q.task_id and app_private.task2_assignment_revision(t)=q.source_revision and t->'archived' is distinct from 'true'::jsonb and t->>'status'='review' and d.version=q.delivery_version and d.state='reviewed')) order by q.priority,q.created_at),'[]'::jsonb) into items from app_private.office_decisions q where scope=scope_name and state='pending';
 select coalesce(jsonb_agg((to_jsonb(q)-'scope'-'created_by'-'resolved_by')||jsonb_build_object('can_review',q.state='review_required' and q.created_by<>actor.id and role_name='yonetici','source_current',exists(select 1 from jsonb_array_elements(workspace->'tasks') t join app_private.task2_deliveries d on d.scope=scope_name and d.task_id=t->>'id' where t->>'id'=q.task_id and app_private.task2_assignment_revision(t)=q.source_revision and t->'archived' is distinct from 'true'::jsonb and t->>'status'='review' and d.version=q.delivery_version and d.state='reviewed')) order by q.priority,q.created_at),'[]'::jsonb) into review_items from app_private.office_decisions q where scope=scope_name and state='review_required';
 select jsonb_build_object('pending',count(*) filter(where state in ('review_required','pending')),'queue_limit',10,'daily_limit',45,'weekly_limit',840,
  'today_reserved',coalesce(sum(reserved_minutes) filter(where state in ('review_required','pending') and scheduled_day=today),0),
  'today_actual',coalesce(sum(actual_minutes) filter(where state='answered' and review_day=today),0),
  'week_reserved',coalesce(sum(reserved_minutes) filter(where state in ('review_required','pending') and date_trunc('week',scheduled_day::timestamp)=date_trunc('week',today::timestamp)),0),
  'week_actual',coalesce(sum(actual_minutes) filter(where state='answered' and date_trunc('week',review_day::timestamp)=date_trunc('week',today::timestamp)),0)) into budget from app_private.office_decisions where scope=scope_name;
 return jsonb_build_object('source','office_decision_queue','configured',true,'scope','current_user_scope','is_owner',desk.owner_id=actor.id,'observed_at',clock_timestamp(),'budget',budget,'items',items,'review_items',review_items,'business_actions_executed',false);
exception when no_data_found or too_many_rows then raise exception 'Tekil hesap, görev veya karar doğrulanamadı' using errcode='42501';
end $$;
