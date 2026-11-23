-- Source tables remain read-only. This journal stores aggregate follow-up metadata only.
-- No employee/task text, automatic decisions, notifications or scheduled execution.
create or replace function app_private.office_work_health_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor public.app_users; scope_name text; result jsonb;
begin
 if auth.uid() is null or app_private.franchise_office_manager() is not true then
  raise exception 'Yetkili merkez oturumu gerekli.' using errcode='42501';
 end if;
 select * into strict actor from public.app_users where auth_user_id=auth.uid() and is_active;
 scope_name:=coalesce(actor.branch_id::text,'hq');
 with records as (
  select t.id,t.version,t.data->>'status' as state,
   nullif(btrim(t.data->>'who'),'') as owner,
   nullif(t.data->>'due','') as due_text,
   app_private.office_health_date(t.data->>'due') as due,
   exists(select 1 from public.app_users u where u.is_active
    and coalesce(u.branch_id::text,'hq')=scope_name and u.id::text=t.data->>'who') as owner_resolved
  from app_private.isler24_tasks t where t.scope=scope_name and t.deleted_at is null
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
 ) into result from records;
 return result;
exception when no_data_found or too_many_rows then
 raise exception 'Tekil ve aktif ERP hesabı doğrulanamadı.' using errcode='42501';
end $$;

create or replace function public.office_work_health_summary() returns jsonb
language sql stable security invoker set search_path='' as $$
 select app_private.office_work_health_summary()-'revision_token';
$$;

create function app_private.office_observation_scope() returns text
language plpgsql stable security definer set search_path='' as $$
declare actor public.app_users;
begin
 if auth.uid() is null or app_private.franchise_office_manager() is not true then
  raise exception 'Yetkili merkez oturumu gerekli.' using errcode='42501'; end if;
 select * into strict actor from public.app_users where auth_user_id=auth.uid() and is_active;
 return coalesce(actor.branch_id::text,'hq');
exception when no_data_found or too_many_rows then
 raise exception 'Tekil aktif ERP hesabı gerekli.' using errcode='42501';
end $$;
revoke all on function app_private.office_observation_scope() from public,anon,authenticated;

create table app_private.office_work_observations(
 scope text not null, code text not null check(code in ('owner_missing','owner_unresolved','past_due','due_missing','due_invalid','unknown_status')),
 value bigint not null check(value>=0),state text not null check(state in ('open','resolved')),
 version bigint not null default 1 check(version>0),source_revision text not null,
 first_seen_at timestamptz not null default clock_timestamp(),last_changed_at timestamptz not null default clock_timestamp(),
 observed_at timestamptz not null default clock_timestamp(),acknowledged_at timestamptz,acknowledged_by uuid,
 primary key(scope,code),check((state='open')=(value>0))
);
create table app_private.office_work_observation_events(
 id bigint generated always as identity primary key,scope text not null,code text not null,
 kind text not null check(kind in ('opened','changed','reopened','resolved','acknowledged')),
 value bigint not null,at timestamptz not null default clock_timestamp(),actor_id uuid not null,
 request_id uuid,expected_version bigint,
 foreign key(scope,code) references app_private.office_work_observations(scope,code),unique(scope,request_id)
);
create index office_work_observation_events_scope on app_private.office_work_observation_events(scope,id desc);
alter table app_private.office_work_observations enable row level security;
alter table app_private.office_work_observation_events enable row level security;
revoke all on app_private.office_work_observations,app_private.office_work_observation_events from public,anon,authenticated;

create function app_private.office_observation_view(p_scope text) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('mode','source_observation_journal','observations',coalesce((select jsonb_agg(jsonb_build_object(
 'code',o.code,'value',o.value,'state',o.state,'version',o.version,'first_seen_at',o.first_seen_at,
 'last_changed_at',o.last_changed_at,'observed_at',o.observed_at,'acknowledged_at',o.acknowledged_at) order by o.code)
 from app_private.office_work_observations o where o.scope=p_scope),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.id desc) from (
 select id,code,kind,value,at from app_private.office_work_observation_events where scope=p_scope order by id desc limit 30)e),'[]'::jsonb));
$$;
revoke all on function app_private.office_observation_view(text) from public,anon,authenticated;

create function app_private.list_office_work_observations() returns jsonb
language sql stable security definer set search_path='' as $$
 select app_private.office_observation_view(app_private.office_observation_scope());
$$;

create function app_private.refresh_office_work_observations() returns jsonb
language plpgsql security definer set search_path='' as $$
declare s text; snapshot jsonb;k text;n bigint;old app_private.office_work_observations;event_kind text;
begin
 s:=app_private.office_observation_scope();
 perform pg_advisory_xact_lock(hashtextextended('office-observations:'||s,0));
 snapshot:=app_private.office_work_health_summary();
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
  if event_kind is not null then insert into app_private.office_work_observation_events(scope,code,kind,value,actor_id)
   values(s,k,event_kind,n,auth.uid());end if;
 end loop;
 return app_private.office_observation_view(s);
end $$;

create function app_private.ack_office_work_observation(p_code text,p_expected_version bigint,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s text; old app_private.office_work_observations;receipt app_private.office_work_observation_events;
begin
 s:=app_private.office_observation_scope();
 if p_code is null or p_expected_version is null or p_request_id is null then raise exception 'Kayıt, sürüm ve istek kimliği gerekli.' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('office-observations:'||s,0));
 select * into receipt from app_private.office_work_observation_events where scope=s and request_id=p_request_id;
 if found then
  if receipt.code is distinct from p_code or receipt.expected_version is distinct from p_expected_version or receipt.actor_id is distinct from auth.uid() then
   raise exception 'İstek kimliği farklı içerikle kullanıldı.' using errcode='22023';end if;
  perform app_private.refresh_office_work_observations();
  return app_private.office_observation_view(s);
 end if;
 -- Re-read the source before accepting a receipt; stale page state cannot hide a change.
 perform app_private.refresh_office_work_observations();
 select * into old from app_private.office_work_observations where scope=s and code=p_code for update;
 if not found or old.state<>'open' then raise exception 'Açık kontrol kaydı bulunamadı.' using errcode='22023';end if;
 if old.version<>p_expected_version then raise exception 'Kaynak değişti; özeti yenileyin.' using errcode='40001';end if;
 if old.acknowledged_at is not null then return app_private.office_observation_view(s);end if;
  update app_private.office_work_observations set acknowledged_at=clock_timestamp(),acknowledged_by=auth.uid() where scope=s and code=p_code;
 insert into app_private.office_work_observation_events(scope,code,kind,value,actor_id,request_id,expected_version)
 values(s,p_code,'acknowledged',old.value,auth.uid(),p_request_id,p_expected_version);
 return app_private.office_observation_view(s);
end $$;

create function public.list_office_work_observations() returns jsonb language sql stable security invoker set search_path='' as $$ select app_private.list_office_work_observations(); $$;
create function public.refresh_office_work_observations() returns jsonb language sql security invoker set search_path='' as $$ select app_private.refresh_office_work_observations(); $$;
create function public.ack_office_work_observation(p_code text,p_expected_version bigint,p_request_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select app_private.ack_office_work_observation(p_code,p_expected_version,p_request_id); $$;
revoke all on function app_private.list_office_work_observations(),app_private.refresh_office_work_observations(),app_private.ack_office_work_observation(text,bigint,uuid),public.list_office_work_observations(),public.refresh_office_work_observations(),public.ack_office_work_observation(text,bigint,uuid) from public,anon,authenticated;
grant execute on function app_private.list_office_work_observations(),app_private.refresh_office_work_observations(),app_private.ack_office_work_observation(text,bigint,uuid),public.list_office_work_observations(),public.refresh_office_work_observations(),public.ack_office_work_observation(text,bigint,uuid) to authenticated;
