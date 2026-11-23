-- Bounded read-only Isler v24 worker. No schedule is created by this migration.
create table app_private.office_readonly_workers(
 scope text primary key,authorized_by uuid not null,enabled boolean not null default false,
 expires_at timestamptz not null,started_at timestamptz not null default clock_timestamp(),
 last_attempt_at timestamptz,last_success_at timestamptz,
 last_status text not null default 'waiting' check(last_status in ('waiting','ok','error','expired','revoked','stopped')),
 consecutive_failures integer not null default 0,run_count bigint not null default 0
);
alter table app_private.office_readonly_workers enable row level security;
revoke all on app_private.office_readonly_workers from public,anon,authenticated;

create function app_private.office_worker_authorized(p_user uuid,p_scope text) returns boolean
language sql stable set search_path='' as $$
 select (select count(*) from public.app_users a where a.auth_user_id=p_user and a.is_active)=1
 and exists(select 1 from public.app_users a where a.auth_user_id=p_user and a.is_active and coalesce(a.branch_id::text,'hq')=p_scope)
 and exists(select 1 from auth.users u join saha_private.members m on lower(m.email)=lower(u.email)
 where u.id=p_user and u.email_confirmed_at is not null and coalesce(u.is_anonymous,false)=false
 and u.deleted_at is null and (u.banned_until is null or u.banned_until<=now())
 and m.active and m.role='admin' and m.org_role='headquarters');
$$;
revoke all on function app_private.office_worker_authorized(uuid,text) from public,anon,authenticated;

create function app_private.office_worker_expiry() returns timestamptz
language sql stable set search_path='' as $$
 select case when stop>now() then stop else stop+interval '1 day' end from
 (select (date_trunc('day',now() at time zone 'Europe/Istanbul')+interval '8 hours 30 minutes') at time zone 'Europe/Istanbul' as stop)t;
$$;
revoke all on function app_private.office_worker_expiry() from public,anon,authenticated;

create function app_private.office_worker_prune() returns void
language plpgsql set search_path='' as $$
begin
 if not exists(select 1 from app_private.office_readonly_workers where enabled and expires_at>clock_timestamp())
 and exists(select 1 from cron.job where jobname='ototr-office-work-health-v1') then
  perform cron.unschedule('ototr-office-work-health-v1');end if;
end $$;
revoke all on function app_private.office_worker_prune() from public,anon,authenticated;

create function app_private.office_worker_status() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s text;w app_private.office_readonly_workers;registered boolean;
begin
 s:=app_private.office_observation_scope();select * into w from app_private.office_readonly_workers where scope=s;
 registered:=exists(select 1 from cron.job where jobname='ototr-office-work-health-v1' and active);
 return jsonb_build_object('source','isler24','scope','current_user_scope','interval_minutes',5,
 'enabled',coalesce(w.enabled and w.expires_at>now(),false),'scheduled',coalesce(w.enabled and w.expires_at>now() and registered,false),
 'expires_at',w.expires_at,'next_stop',app_private.office_worker_expiry(),'last_attempt_at',w.last_attempt_at,
 'last_success_at',w.last_success_at,'last_status',case when w.enabled and w.expires_at<=now() then 'expired' else coalesce(w.last_status,'not_started') end,
 'consecutive_failures',coalesce(w.consecutive_failures,0),'run_count',coalesce(w.run_count,0));
end $$;

create function app_private.start_office_readonly_worker() returns jsonb
language plpgsql security definer set search_path='' as $$
declare s text;
begin
 s:=app_private.office_observation_scope();
 if app_private.office_worker_authorized(auth.uid(),s) is not true then raise exception 'Sürekli kontrol yetkisi doğrulanamadı.' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('office-readonly-worker',0));
 if exists(select 1 from cron.job where jobname='ototr-office-work-health-v1' and command<>'select app_private.tick_office_readonly_worker();') then
  raise exception 'Zamanlayıcı adı başka bir işlemde kullanılıyor.' using errcode='22023';end if;
 if exists(select 1 from app_private.office_readonly_workers where scope=s and enabled and expires_at>clock_timestamp()) and exists(select 1 from cron.job where jobname='ototr-office-work-health-v1' and active) then return app_private.office_worker_status();end if;
 insert into app_private.office_readonly_workers(scope,authorized_by,enabled,expires_at)
 values(s,auth.uid(),true,app_private.office_worker_expiry())
 on conflict(scope) do update set authorized_by=excluded.authorized_by,enabled=true,expires_at=excluded.expires_at,
 started_at=clock_timestamp(),last_status='waiting',consecutive_failures=0;
 perform cron.schedule('ototr-office-work-health-v1','*/5 * * * *','select app_private.tick_office_readonly_worker();');
 return app_private.office_worker_status();
end $$;

create function app_private.stop_office_readonly_worker() returns jsonb
language plpgsql security definer set search_path='' as $$
declare s text;
begin
 s:=app_private.office_observation_scope();perform pg_advisory_xact_lock(hashtextextended('office-readonly-worker',0));
 update app_private.office_readonly_workers set enabled=false,last_status='stopped' where scope=s;
 perform app_private.office_worker_prune();return app_private.office_worker_status();
end $$;
create function app_private.office_work_health_for_scope(p_scope text) returns jsonb
language sql stable set search_path='' as $$
 with records as (
  select t.id,t.version,t.data->>'status' as state,
   nullif(btrim(t.data->>'who'),'') as owner,
   nullif(t.data->>'due','') as due_text,
   app_private.office_health_date(t.data->>'due') as due,
   exists(select 1 from public.app_users u where u.is_active
    and coalesce(u.branch_id::text,'hq')=p_scope and u.id::text=t.data->>'who') as owner_resolved
  from app_private.isler24_tasks t where t.scope=p_scope and t.deleted_at is null
 ) select jsonb_build_object(
  'revision_token',md5(coalesce(string_agg(id::text||':'||version::text||':'||coalesce(state,'')||':'||coalesce(owner,'')||':'||coalesce(due_text,'')||':'||owner_resolved::text,',' order by id),'')||':'||(current_timestamp at time zone 'Europe/Istanbul')::date::text),
  'total',count(*),
  'open',count(*) filter(where state in ('yapilacak','devam')),
  'in_progress',count(*) filter(where state='devam'),
  'reported_done',count(*) filter(where state='bitti'),
  'owner_missing',count(*) filter(where state in ('yapilacak','devam') and owner is null),
  'owner_unresolved',count(*) filter(where state in ('yapilacak','devam') and owner is not null and not owner_resolved),
  'past_due',count(*) filter(where state in ('yapilacak','devam') and due < (current_timestamp at time zone 'Europe/Istanbul')::date),
  'due_missing',count(*) filter(where state in ('yapilacak','devam') and due_text is null),
  'due_invalid',count(*) filter(where state in ('yapilacak','devam') and due_text is not null and due is null),
  'unknown_status',count(*) filter(where state is null or state not in ('yapilacak','devam','bitti')),
  'acceptance_supported',false,'evidence_supported',false,
  'scope','current_user_scope','source','isler24','observed_at',current_timestamp
 ) from records;

$$;
revoke all on function app_private.office_work_health_for_scope(text) from public,anon,authenticated;
create or replace function app_private.office_work_health_summary() returns jsonb
language sql stable security definer set search_path='' as $$
 select app_private.office_work_health_for_scope(app_private.office_observation_scope());
$$;
alter table app_private.office_work_observation_events add column origin text not null default 'interactive' check(origin in ('interactive','worker'));
create function app_private.record_office_work_observations(p_scope text,p_actor uuid,p_origin text) returns jsonb
language plpgsql set search_path='' as $$
declare s text; snapshot jsonb;k text;n bigint;old app_private.office_work_observations;event_kind text;
begin
 s:=p_scope;
 if p_origin not in ('interactive','worker') or p_actor is null then raise exception 'Kontrol kaynağı gerekli';end if;
 perform pg_advisory_xact_lock(hashtextextended('office-observations:'||s,0));
 snapshot:=app_private.office_work_health_for_scope(s);
 foreach k in array array['owner_missing','owner_unresolved','past_due','due_missing','due_invalid','unknown_status'] loop
  n:=(snapshot->>k)::bigint;
  select * into old from app_private.office_work_observations where scope=s and code=k for update;
  event_kind:=null;
  if not found then
   if n=0 then continue; end if;
   insert into app_private.office_work_observations(scope,code,value,state,source_revision) values(s,k,n,'open',snapshot->>'revision_token');
   event_kind:='opened';
  elsif old.source_revision is distinct from snapshot->>'revision_token' then
   if old.value<>n or (n>0 and old.acknowledged_at is not null) then
    event_kind:=case when n=0 then 'resolved' when old.value=0 then 'reopened' else 'changed' end;
   end if;
   update app_private.office_work_observations set value=n,state=case when n=0 then 'resolved' else 'open' end,
    version=version+1,source_revision=snapshot->>'revision_token',observed_at=clock_timestamp(),
    last_changed_at=clock_timestamp(),acknowledged_at=null,acknowledged_by=null where scope=s and code=k;
  else
   update app_private.office_work_observations set observed_at=clock_timestamp() where scope=s and code=k;
  end if;
  if event_kind is not null then insert into app_private.office_work_observation_events(scope,code,kind,value,actor_id,origin)
   values(s,k,event_kind,n,p_actor,p_origin);end if;
 end loop;
 return app_private.office_observation_view(s);
end $$;


revoke all on function app_private.record_office_work_observations(text,uuid,text) from public,anon,authenticated;
create or replace function app_private.refresh_office_work_observations() returns jsonb
language sql security definer set search_path='' as $$
 select app_private.record_office_work_observations(app_private.office_observation_scope(),auth.uid(),'interactive');
$$;
create or replace function app_private.office_observation_view(p_scope text) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('mode','source_observation_journal','observations',coalesce((select jsonb_agg(jsonb_build_object(
 'code',o.code,'value',o.value,'state',o.state,'version',o.version,'first_seen_at',o.first_seen_at,
 'last_changed_at',o.last_changed_at,'observed_at',o.observed_at,'acknowledged_at',o.acknowledged_at) order by o.code)
 from app_private.office_work_observations o where o.scope=p_scope),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.id desc) from (
 select id,code,kind,value,at,origin from app_private.office_work_observation_events where scope=p_scope order by id desc limit 30)e),'[]'::jsonb));
$$;
create function app_private.tick_office_readonly_worker() returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='3s' set statement_timeout='20s' as $$
declare w app_private.office_readonly_workers;ok_count integer:=0;error_count integer:=0;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('office-readonly-worker',0)) then return jsonb_build_object('skipped','already_running');end if;
 for w in select * from app_private.office_readonly_workers where enabled order by scope for update loop
  if w.expires_at<=clock_timestamp() then
   update app_private.office_readonly_workers set enabled=false,last_status='expired' where scope=w.scope;continue;
  end if;
  if app_private.office_worker_authorized(w.authorized_by,w.scope) is not true then
   update app_private.office_readonly_workers set enabled=false,last_status='revoked',last_attempt_at=clock_timestamp() where scope=w.scope;continue;
  end if;
  begin
   perform app_private.record_office_work_observations(w.scope,w.authorized_by,'worker');
   update app_private.office_readonly_workers set last_attempt_at=clock_timestamp(),last_success_at=clock_timestamp(),last_status='ok',consecutive_failures=0,run_count=run_count+1 where scope=w.scope;
   ok_count:=ok_count+1;
  exception when others then
   update app_private.office_readonly_workers set last_attempt_at=clock_timestamp(),last_status='error',consecutive_failures=consecutive_failures+1,enabled=(consecutive_failures+1<3) where scope=w.scope;
   error_count:=error_count+1;
  end;
 end loop;
 perform app_private.office_worker_prune();return jsonb_build_object('ok',ok_count,'errors',error_count);
end $$;
revoke all on function app_private.tick_office_readonly_worker() from public,anon,authenticated;

create function public.office_worker_status() returns jsonb language sql stable security invoker set search_path='' as $$ select app_private.office_worker_status(); $$;
create function public.start_office_readonly_worker() returns jsonb language sql security invoker set search_path='' as $$ select app_private.start_office_readonly_worker(); $$;
create function public.stop_office_readonly_worker() returns jsonb language sql security invoker set search_path='' as $$ select app_private.stop_office_readonly_worker(); $$;
revoke all on function app_private.office_worker_status(),app_private.start_office_readonly_worker(),app_private.stop_office_readonly_worker(),public.office_worker_status(),public.start_office_readonly_worker(),public.stop_office_readonly_worker() from public,anon,authenticated;
grant execute on function app_private.office_worker_status(),app_private.start_office_readonly_worker(),app_private.stop_office_readonly_worker(),public.office_worker_status(),public.start_office_readonly_worker(),public.stop_office_readonly_worker() to authenticated;
