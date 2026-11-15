-- Private, connection-scoped management data. Public clients use authenticated
-- Edge handlers; no authenticated/anon direct table or RPC access is granted.
create table public.google_review_management_resources (
 id uuid primary key default gen_random_uuid(),
 connection_id text not null references public.google_business_connections(id),
 branch_id text not null check (branch_id = 'branch-google-nilufer'),
 kind text not null check (kind in ('templates','experiments','escalation_rules','notification_rules','store_groups','branch_settings','delegations','legal_cases','complaints','compensations','retention_policy','user_permissions','ai_config')),
 key text not null check (length(key) between 1 and 200),
 data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 40000),
 version integer not null default 1 check (version > 0), archived boolean not null default false,
 created_by uuid not null references auth.users(id), updated_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique (connection_id, branch_id, kind, key)
);
create index google_review_management_kind on public.google_review_management_resources(connection_id, branch_id, kind, archived);
create unique index google_review_one_running_experiment on public.google_review_management_resources(connection_id,branch_id) where kind='experiments' and not archived and data->>'status'='running';
create index google_review_management_creator on public.google_review_management_resources(created_by);
create index google_review_management_updater on public.google_review_management_resources(updated_by);
create table public.google_review_notifications (
 id uuid primary key default gen_random_uuid(), connection_id text not null references public.google_business_connections(id),
 branch_id text not null check (branch_id = 'branch-google-nilufer'), user_id uuid not null references auth.users(id),
 event text not null check (event in ('sla_overdue','critical_review','legal_hold')),
 title text not null check (length(title) between 1 and 200), body text not null check (length(body) <= 1000),
 work_item_id uuid references public.google_review_work_items(id), source_key text not null,
 created_at timestamptz not null default now(), read_at timestamptz,
 unique (connection_id, branch_id, user_id, source_key)
);
create index google_review_notifications_user on public.google_review_notifications(connection_id, branch_id, user_id, created_at desc);
create index google_review_notifications_recipient on public.google_review_notifications(user_id);
create index google_review_notifications_work on public.google_review_notifications(work_item_id);
create table public.google_review_ai_generations (
 id uuid primary key default gen_random_uuid(), connection_id text not null references public.google_business_connections(id),
 branch_id text not null check (branch_id = 'branch-google-nilufer'), actor_id uuid not null references auth.users(id),
 review_id text, context text not null check (context in ('generate','playground')), model text not null,
 input_tokens integer check(input_tokens>=0), output_tokens integer check(output_tokens>=0), cached_input_tokens integer check(cached_input_tokens>=0), total_tokens integer check(total_tokens>=0),
 latency_ms integer not null check(latency_ms>=0), status text not null check(status in ('succeeded','failed')), failure_code text,
 quality_score integer check(quality_score between 0 and 100), requires_human_review boolean,
 experiment_id uuid references public.google_review_management_resources(id), experiment_version integer, variant text check(variant in ('a','b')),
 input_price_per_million numeric check(input_price_per_million>=0), output_price_per_million numeric check(output_price_per_million>=0), cached_input_price_per_million numeric check(cached_input_price_per_million>=0), cost_usd numeric check(cost_usd>=0), reply_sha256 text check(reply_sha256 ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now()
);
create index google_review_ai_generations_branch on public.google_review_ai_generations(connection_id, branch_id, created_at desc);
create index google_review_ai_generations_experiment on public.google_review_ai_generations(experiment_id, experiment_version, variant);
create index google_review_ai_generations_actor on public.google_review_ai_generations(actor_id);
create table public.google_review_ai_outcomes (
 id uuid primary key default gen_random_uuid(), generation_id uuid not null references public.google_review_ai_generations(id),
 connection_id text not null references public.google_business_connections(id), branch_id text not null check(branch_id='branch-google-nilufer'),
 work_item_id uuid not null references public.google_review_work_items(id), action text not null check(action in ('saved','edited','rejected','published')),
 event_key text not null unique, actor_id uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create index google_review_ai_outcomes_generation on public.google_review_ai_outcomes(generation_id, created_at);
create index google_review_ai_outcomes_connection on public.google_review_ai_outcomes(connection_id);
create index google_review_ai_outcomes_work on public.google_review_ai_outcomes(work_item_id);
create index google_review_ai_outcomes_actor on public.google_review_ai_outcomes(actor_id);
alter table public.google_review_management_resources enable row level security;
alter table public.google_review_notifications enable row level security;
alter table public.google_review_ai_generations enable row level security;
alter table public.google_review_ai_outcomes enable row level security;
revoke all on public.google_review_management_resources, public.google_review_notifications, public.google_review_ai_generations, public.google_review_ai_outcomes from public, anon, authenticated;
grant select, insert, update on public.google_review_management_resources, public.google_review_notifications to service_role;
grant select, insert on public.google_review_ai_generations, public.google_review_ai_outcomes to service_role;

-- The existing policy remains the authoritative SLA. Keep branch editors in
-- sync even when the established policy endpoint is used by another client.
create function public.google_review_sync_policy_sla() returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 update public.google_review_management_resources set data=jsonb_set(data,'{sla_hours}',to_jsonb(new.default_sla_hours)),version=version+1,updated_by=coalesce(new.updated_by,updated_by),updated_at=clock_timestamp()
 where connection_id=new.connection_id and branch_id='branch-google-nilufer' and kind='branch_settings' and key='default' and not archived and (data->>'sla_hours')::integer is distinct from new.default_sla_hours;
 return new;
end; $$;
revoke all on function public.google_review_sync_policy_sla() from public,anon,authenticated;
grant execute on function public.google_review_sync_policy_sla() to service_role;
create trigger google_review_policy_sla_changed after update of default_sla_hours on public.google_review_policies for each row execute function public.google_review_sync_policy_sla();

-- Atomically save metadata with its task status. Only the server role can call
-- this function, after the Edge handler validates the strict per-kind schema.
create function public.google_review_save_resource(p_connection_id text, p_branch_id text, p_kind text, p_id uuid, p_key text, p_data jsonb, p_expected_version integer, p_actor_id uuid, p_work_id uuid default null, p_expected_work_version integer default null, p_work_status text default null)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare saved public.google_review_management_resources; work public.google_review_work_items; before_resource jsonb;
begin
 if p_branch_id <> 'branch-google-nilufer' or p_expected_version < 0 then raise exception 'Invalid resource scope/version' using errcode='22023'; end if;
 if p_expected_version=0 and p_id is not null then
  select * into saved from public.google_review_management_resources where id=p_id;
  if found then
   if saved.connection_id=p_connection_id and saved.branch_id=p_branch_id and saved.kind=p_kind and saved.key=p_key and saved.data=p_data and saved.version=1 and not saved.archived then return jsonb_build_object('resource',to_jsonb(saved),'item',null,'replayed',true); end if;
   raise exception 'Resource identity already used' using errcode='40001';
  end if;
 end if;
 if p_kind in ('legal_cases','complaints') then
  if p_work_id is null or p_expected_work_version is null or p_data->>'work_item_id' <> p_work_id::text then raise exception 'Task identity/version required' using errcode='22023'; end if;
  select * into work from public.google_review_work_items where id=p_work_id and connection_id=p_connection_id and branch_id=p_branch_id for update;
  if not found then raise exception 'Task not found' using errcode='P0002'; end if;
  if work.version <> p_expected_work_version then raise exception 'Task changed' using errcode='40001'; end if;
  if work.kind <> (case when p_kind='legal_cases' then 'legal' else 'complaint' end) or p_work_status not in ('open','done') then raise exception 'Task kind/status mismatch' using errcode='22023'; end if;
  if p_work_status='done' and coalesce((work.review_snapshot->>'legal_hold')::boolean,false) then raise exception 'Legal hold must be released first' using errcode='40001'; end if;
 elsif p_work_id is not null then raise exception 'Unexpected task mutation' using errcode='22023'; end if;
 if p_expected_version=0 then
  insert into public.google_review_management_resources(id,connection_id,branch_id,kind,key,data,created_by,updated_by) values(coalesce(p_id,gen_random_uuid()),p_connection_id,p_branch_id,p_kind,p_key,p_data,p_actor_id,p_actor_id) returning * into saved;
 else
  select to_jsonb(r) into before_resource from public.google_review_management_resources r where id=p_id and connection_id=p_connection_id and branch_id=p_branch_id and kind=p_kind and version=p_expected_version and not archived for update;
  if not found then raise exception 'Resource changed' using errcode='40001'; end if;
  update public.google_review_management_resources set data=p_data,version=version+1,updated_by=p_actor_id,updated_at=clock_timestamp() where id=p_id returning * into saved;
 end if;
 if p_work_id is not null then
  update public.google_review_work_items set status=p_work_status,note=coalesce(p_data->>'notes',''),version=version+1,updated_by=p_actor_id,updated_at=clock_timestamp() where id=p_work_id returning * into work;
 end if;
 if p_kind='branch_settings' then update public.google_review_policies set default_sla_hours=(p_data->>'sla_hours')::integer,updated_by=p_actor_id,updated_at=clock_timestamp() where connection_id=p_connection_id; end if;
 insert into public.google_review_audit_log(connection_id,actor_id,actor_role,action,entity_type,entity_id,before_state,after_state,detail)
 values(p_connection_id,p_actor_id,'MANAGEMENT','resource_save',p_kind,saved.id::text,coalesce(before_resource,'{}'::jsonb),jsonb_build_object('version',saved.version,'key',saved.key), 'Yönetim kaydı kaydedildi.');
 return jsonb_build_object('resource',to_jsonb(saved),'item',case when p_work_id is null then null else to_jsonb(work) end);
end; $$;
revoke all on function public.google_review_save_resource(text,text,text,uuid,text,jsonb,integer,uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.google_review_save_resource(text,text,text,uuid,text,jsonb,integer,uuid,uuid,integer,text) to service_role;

-- Scheduled in-app escalation uses no HTTP endpoint, API key or external channel.
create function public.google_review_run_escalation(p_connection_id text default null, p_actor_id uuid default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare created_count integer; evaluated_count integer; affected text[]; affected_id text;
begin
 select count(*) into evaluated_count from public.google_review_management_resources r join public.google_review_work_items w on w.connection_id=r.connection_id and w.branch_id=r.branch_id
 where r.kind='escalation_rules' and not r.archived and r.data->>'enabled'='true' and w.status in ('open','approval_pending','publish_failed','publish_unknown') and (p_connection_id is null or r.connection_id=p_connection_id);
 with inserted as (
  insert into public.google_review_notifications(connection_id,branch_id,user_id,event,title,body,work_item_id,source_key)
  select r.connection_id,r.branch_id,u.auth_user_id,r.data->>'event',r.data->>'name',
   'Bursa görevi '||w.id::text||': '||case r.data->>'event' when 'sla_overdue' then 'SLA aşıldı.' when 'critical_review' then 'Düşük puanlı yorum.' else 'Hukuki kilit açık.' end,w.id,r.id::text||':'||w.id::text
  from public.google_review_management_resources r
  join public.google_review_work_items w on w.connection_id=r.connection_id and w.branch_id=r.branch_id
  join public.google_review_policies p on p.connection_id=r.connection_id
  join public.google_business_connections c on c.id=r.connection_id
  join public.app_users u on u.role=r.data->>'to_role' and u.is_active and u.auth_user_id is not null
  left join public.google_review_management_resources bs on bs.connection_id=r.connection_id and bs.branch_id=r.branch_id and bs.kind='branch_settings' and bs.key='default' and not bs.archived
  left join public.google_review_management_resources pref on pref.connection_id=r.connection_id and pref.branch_id=r.branch_id and pref.kind='notification_rules' and pref.key=u.auth_user_id::text||':'||(r.data->>'event') and not pref.archived
  where r.kind='escalation_rules' and not r.archived and r.data->>'enabled'='true' and (p_connection_id is null or r.connection_id=p_connection_id)
   and coalesce(bs.data->>'lifecycle','active')='active' and coalesce(pref.data->>'enabled','true')='true'
   and (u.auth_user_id=c.connected_by or exists(select 1 from public.google_review_management_resources access where access.connection_id=r.connection_id and access.branch_id=r.branch_id and access.kind='user_permissions' and access.key=u.auth_user_id::text and not access.archived and access.data->>'active'='true' and access.data->>'role' in ('viewer','operator','legal','admin')))
   and w.status in ('open','approval_pending','publish_failed','publish_unknown')
   and extract(epoch from (clock_timestamp()-w.created_at))/3600 >= (r.data->>'after_hours')::integer + case when r.data->>'event'='sla_overdue' then p.default_sla_hours else 0 end
   and (r.data->>'event'='sla_overdue' or (r.data->>'event'='critical_review' and (w.review_snapshot->>'rating')::numeric between 1 and 2) or (r.data->>'event'='legal_hold' and w.kind='legal' and w.review_snapshot->>'legal_hold'='true'))
  on conflict(connection_id,branch_id,user_id,source_key) do nothing returning connection_id
 ) select count(*),array_agg(distinct connection_id) into created_count,affected from inserted;
 if p_connection_id is not null and affected is null then affected:=array[p_connection_id]; end if;
 foreach affected_id in array coalesce(affected,array[]::text[]) loop
  insert into public.google_review_audit_log(connection_id,actor_id,actor_role,action,entity_type,entity_id,detail,after_state)
  values(affected_id,p_actor_id,case when p_actor_id is null then 'SYSTEM' else 'MANAGEMENT' end,'escalation_run','branch','branch-google-nilufer','Uygulama içi eskalasyon kuralları çalıştırıldı.',jsonb_build_object('created',created_count,'evaluated',evaluated_count));
 end loop;
 return jsonb_build_object('created',created_count,'evaluated',evaluated_count);
end; $$;
revoke all on function public.google_review_run_escalation(text,uuid) from public,anon,authenticated;
grant execute on function public.google_review_run_escalation(text,uuid) to service_role;
select cron.schedule('ototr-google-review-escalation','*/15 * * * *', $cron$select public.google_review_run_escalation(null,null);$cron$);
