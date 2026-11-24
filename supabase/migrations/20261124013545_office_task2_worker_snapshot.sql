-- Extend the already bounded worker. This migration creates no schedule and starts no worker.
create table app_private.office_task2_worker_snapshots(
 scope text primary key,last_attempt_at timestamptz not null,last_success_at timestamptz,
 status text not null check(status in ('ok','error')),snapshot jsonb
);
create table app_private.office_task2_worker_events(
 id bigint generated always as identity primary key,scope text not null,at timestamptz not null default clock_timestamp(),
 kind text not null check(kind in ('first_read','changed','recovered')),snapshot jsonb not null
);
alter table app_private.office_task2_worker_snapshots enable row level security;
alter table app_private.office_task2_worker_events enable row level security;
revoke all on app_private.office_task2_worker_snapshots,app_private.office_task2_worker_events from public,anon,authenticated;

create function app_private.collect_office_task2_snapshot(p_scope text) returns boolean
language plpgsql set search_path='' as $$
declare workspace jsonb;result jsonb;old app_private.office_task2_worker_snapshots;desk app_private.office_decision_desks;
 slots bigint;day_minutes bigint;week_minutes bigint;admission text;today date:=(clock_timestamp() at time zone 'Europe/Istanbul')::date;
begin
 begin
  select data into workspace from app_private.task2_workspace where scope=p_scope and version>0 for share;
  if not found or jsonb_typeof(workspace->'tasks') is distinct from 'array' then raise exception 'Unavailable TASK2 source';end if;
  if exists(select 1 from jsonb_array_elements(workspace->'tasks') t where jsonb_typeof(t->'id') is distinct from 'string' or length(t->>'id') not between 1 and 100)
   or (select count(*)<>count(distinct t->>'id') from jsonb_array_elements(workspace->'tasks') t) then raise exception 'Ambiguous TASK2 source';end if;
  with tasks as (
   select t,t->>'id' id,t->>'status' state,nullif(btrim(t->>'assignee'),'') owner,app_private.task2_assignment_revision(t) revision,
    exists(select 1 from public.app_users u where u.is_active and u.auth_user_id is not null and u.id::text=t->>'assignee' and (select count(*) from public.app_users other where other.is_active and other.auth_user_id=u.auth_user_id)=1 and coalesce(u.branch_id::text,'hq')=p_scope) owner_resolved
   from jsonb_array_elements(workspace->'tasks') t where t->'archived' is distinct from 'true'::jsonb
  ) select jsonb_build_object('total',count(*),'open',count(*) filter(where state in ('backlog','todo','progress','review')),
   'owner_missing',count(*) filter(where state in ('backlog','todo','progress','review') and owner is null),
   'owner_unresolved',count(*) filter(where state in ('backlog','todo','progress','review') and owner is not null and not owner_resolved),
   'acceptance_pending',count(*) filter(where state in ('backlog','todo','progress','review') and owner_resolved and not exists(select 1 from app_private.task2_assignment_receipts r where r.scope=p_scope and r.task_id=id and r.source_revision=revision and r.actor_id::text=owner)),
   'past_due',count(*) filter(where state in ('backlog','todo','progress','review') and app_private.office_health_date(t->>'due')<today),
   'handoff_pending',count(*) filter(where state in ('backlog','todo','progress') and exists(select 1 from app_private.task2_handoffs h where h.scope=p_scope and h.task_id=id and h.state='pending' and h.source_revision=revision)),
   'review_pending',count(*) filter(where state='review' and exists(select 1 from app_private.task2_deliveries d where d.scope=p_scope and d.task_id=id and d.source_revision=revision and d.state='submitted')),
   'closure_pending',count(*) filter(where state='review' and exists(select 1 from app_private.task2_deliveries d where d.scope=p_scope and d.task_id=id and d.source_revision=revision and d.state='reviewed')),
   'unknown_status',count(*) filter(where state is null or state not in ('backlog','todo','progress','review','done'))) into result from tasks;
  select * into desk from app_private.office_decision_desks where scope=p_scope;
  if not found then admission:='not_configured';slots:=0;day_minutes:=0;week_minutes:=0;
  else
   select count(*) filter(where state in ('review_required','pending')),
    coalesce(sum(case when state in ('review_required','pending') and scheduled_day=today then reserved_minutes when state='answered' and review_day=today then actual_minutes else 0 end),0),
    coalesce(sum(case when state in ('review_required','pending') and date_trunc('week',scheduled_day::timestamp)=date_trunc('week',today::timestamp) then reserved_minutes when state='answered' and date_trunc('week',review_day::timestamp)=date_trunc('week',today::timestamp) then actual_minutes else 0 end),0)
    into slots,day_minutes,week_minutes from app_private.office_decisions where scope=p_scope;
   admission:=case when not exists(select 1 from public.app_users u where u.id=desk.owner_id and u.is_active and coalesce(u.branch_id::text,'hq')=p_scope) then 'owner_unavailable'
    when slots>=10 then 'queue_full' when week_minutes>=840 then 'week_full' when day_minutes>=45 then 'day_full' else 'available' end;
  end if;
  result:=result||jsonb_build_object('decision_slots',slots,'decision_day_minutes',day_minutes,'decision_week_minutes',week_minutes,'decision_admission',admission);
  select * into old from app_private.office_task2_worker_snapshots where scope=p_scope for update;
  if old.snapshot is distinct from result or old.status='error' then
   insert into app_private.office_task2_worker_events(scope,kind,snapshot) values(p_scope,case when old.snapshot is null then 'first_read' when old.status='error' then 'recovered' else 'changed' end,result);
  end if;
  insert into app_private.office_task2_worker_snapshots(scope,last_attempt_at,last_success_at,status,snapshot)
   values(p_scope,clock_timestamp(),clock_timestamp(),'ok',result)
   on conflict(scope) do update set last_attempt_at=excluded.last_attempt_at,last_success_at=excluded.last_success_at,status='ok',snapshot=excluded.snapshot;
  return true;
 exception when others then
  -- Preserve old counts, but never label them as a successful new observation.
  insert into app_private.office_task2_worker_snapshots(scope,last_attempt_at,status) values(p_scope,clock_timestamp(),'error')
   on conflict(scope) do update set last_attempt_at=excluded.last_attempt_at,status='error';
  return false;
 end;
end $$;
revoke all on function app_private.collect_office_task2_snapshot(text) from public,anon,authenticated;

create or replace function app_private.tick_office_readonly_worker() returns jsonb
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
   if not app_private.collect_office_task2_snapshot(w.scope) then
    update app_private.office_readonly_workers set last_attempt_at=clock_timestamp(),last_status='error',consecutive_failures=consecutive_failures+1,enabled=(consecutive_failures+1<3) where scope=w.scope;
    error_count:=error_count+1;continue;
   end if;
   update app_private.office_readonly_workers set last_attempt_at=clock_timestamp(),last_success_at=clock_timestamp(),last_status='ok',consecutive_failures=0,run_count=run_count+1 where scope=w.scope;
   ok_count:=ok_count+1;
  exception when others then
   update app_private.office_readonly_workers set last_attempt_at=clock_timestamp(),last_status='error',consecutive_failures=consecutive_failures+1,enabled=(consecutive_failures+1<3) where scope=w.scope;
   error_count:=error_count+1;
  end;
 end loop;
 perform app_private.office_worker_prune();return jsonb_build_object('ok',ok_count,'errors',error_count);
end $$;

create or replace function app_private.office_worker_status() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s text;w app_private.office_readonly_workers;registered boolean;
begin
 s:=app_private.office_observation_scope();select * into w from app_private.office_readonly_workers where scope=s;
 registered:=exists(select 1 from cron.job where jobname='ototr-office-work-health-v1' and active);
 return jsonb_build_object('source','isler24','scope','current_user_scope','interval_minutes',5,
 'enabled',coalesce(w.enabled and w.expires_at>now(),false),'scheduled',coalesce(w.enabled and w.expires_at>now() and registered,false),
 'expires_at',w.expires_at,'next_stop',app_private.office_worker_expiry(),'last_attempt_at',w.last_attempt_at,
 'last_success_at',w.last_success_at,'last_status',case when w.enabled and w.expires_at<=now() then 'expired' else coalesce(w.last_status,'not_started') end,
 'task2',(select jsonb_build_object('status',x.status,'last_attempt_at',x.last_attempt_at,'last_success_at',x.last_success_at,'snapshot',x.snapshot) from app_private.office_task2_worker_snapshots x where x.scope=s),'consecutive_failures',coalesce(w.consecutive_failures,0),'run_count',coalesce(w.run_count,0));
end $$;

