do $qa$
declare actor uuid; recipient uuid; recipient_role text; qa_id uuid:=gen_random_uuid(); settings_id uuid:=gen_random_uuid(); task_id uuid:=gen_random_uuid(); probe jsonb; baseline bigint;
begin
 select connected_by into actor from public.google_business_connections where id='ototr-primary';
 select auth_user_id,role into recipient,recipient_role from public.app_users where is_active and auth_user_id is not null order by role limit 1;
 if actor is null or recipient is null then raise exception 'QA actor missing'; end if;
 select count(*) into baseline from public.google_review_management_resources;
 begin
  probe:=public.google_review_save_resource('ototr-primary','branch-google-nilufer','templates',qa_id,qa_id::text,'{"name":"QA rollback","category":"test","body":"Do not publish","scope":"branch"}',0,actor);
  if (probe#>>'{resource,version}')::int<>1 then raise exception 'Create version failed'; end if;
  probe:=public.google_review_save_resource('ototr-primary','branch-google-nilufer','templates',qa_id,qa_id::text,'{"name":"QA rollback","category":"test","body":"Do not publish","scope":"branch"}',0,actor);
  if probe->>'replayed'<>'true' then raise exception 'Idempotent replay failed'; end if;
  probe:=public.google_review_save_resource('ototr-primary','branch-google-nilufer','templates',qa_id,qa_id::text,'{"name":"QA edited","category":"test","body":"Do not publish","scope":"branch"}',1,actor);
  if (probe#>>'{resource,version}')::int<>2 then raise exception 'Update version failed'; end if;
  begin perform public.google_review_save_resource('ototr-primary','branch-google-nilufer','templates',qa_id,qa_id::text,'{}',1,actor);raise exception 'Stale version accepted';exception when serialization_failure then null;end;
  probe:=public.google_review_save_resource('ototr-primary','branch-google-nilufer','branch_settings',settings_id,'default','{"lifecycle":"active","tone":"inherit","sla_hours":48}',0,actor);
  if (select default_sla_hours from public.google_review_policies where connection_id='ototr-primary')<>48 then raise exception 'Branch SLA failed';end if;
  update public.google_review_policies set default_sla_hours=36 where connection_id='ototr-primary';
  if (select (r.data->>'sla_hours')::int from public.google_review_management_resources r where r.id=settings_id)<>36 or (select r.version from public.google_review_management_resources r where r.id=settings_id)<>2 then raise exception 'SLA trigger failed';end if;
  perform public.google_review_save_resource('ototr-primary','branch-google-nilufer','experiments',gen_random_uuid(),'qa-one','{"name":"QA","variant_a":"A","variant_b":"B","status":"running","traffic_percent":50}',0,actor);
  begin perform public.google_review_save_resource('ototr-primary','branch-google-nilufer','experiments',gen_random_uuid(),'qa-two','{"name":"QA2","variant_a":"A","variant_b":"B","status":"running","traffic_percent":50}',0,actor);raise exception 'Two running experiments accepted';exception when unique_violation then null;end;
  insert into public.google_review_work_items(id,connection_id,account_id,location_id,review_id,branch_id,branch_name,kind,review_snapshot,reply_text,status,note,version,created_by,updated_by) values(task_id,'ototr-primary','1','1','qa-'||task_id::text,'branch-google-nilufer','QA rollback','legal','{"legal_hold":true,"rating":1}','','open','',1,actor,actor);
  begin perform public.google_review_save_resource('ototr-primary','branch-google-nilufer','legal_cases',gen_random_uuid(),task_id::text,jsonb_build_object('work_item_id',task_id,'category','QA','notes','QA rollback','stage','closed'),0,actor,task_id,1,'done');raise exception 'Held task closed';exception when serialization_failure then null;end;
  if (select w.version from public.google_review_work_items w where w.id=task_id)<>1 then raise exception 'Failed save changed task';end if;
  update public.google_review_work_items set review_snapshot='{"rating":1}' where id=task_id;
  probe:=public.google_review_save_resource('ototr-primary','branch-google-nilufer','legal_cases',gen_random_uuid(),task_id::text,jsonb_build_object('work_item_id',task_id,'category','QA','notes','QA rollback','stage','closed'),0,actor,task_id,1,'done');
  if probe#>>'{item,status}'<>'done' or (probe#>>'{item,version}')::int<>2 then raise exception 'Atomic task closure failed';end if;
  update public.google_review_work_items set status='open',created_at=now()-interval '3 days' where id=task_id;
  if recipient<>actor then perform public.google_review_save_resource('ototr-primary','branch-google-nilufer','user_permissions',gen_random_uuid(),recipient::text,jsonb_build_object('user_id',recipient,'role','viewer','active',true),0,actor);end if;
  perform public.google_review_save_resource('ototr-primary','branch-google-nilufer','escalation_rules',gen_random_uuid(),'qa-rule',jsonb_build_object('name','QA rollback','event','critical_review','after_hours',0,'to_role',recipient_role,'enabled',true),0,actor);
  probe:=public.google_review_run_escalation('ototr-primary',actor);if (probe->>'created')::int<1 then raise exception 'Notification creation failed';end if;
  probe:=public.google_review_run_escalation('ototr-primary',actor);if (probe->>'created')::int<>0 then raise exception 'Notification dedupe failed';end if;
  raise exception 'Rollback QA mutations' using errcode='ZX001';
 exception when sqlstate 'ZX001' then null;
 end;
 if (select count(*) from public.google_review_management_resources)<>baseline then raise exception 'QA rows leaked';end if;
end; $qa$;
select 'passed: resource CAS/replay, SLA sync, experiment uniqueness, legal hold, atomic task closure, notification dedupe; all QA mutations rolled back' as result;
