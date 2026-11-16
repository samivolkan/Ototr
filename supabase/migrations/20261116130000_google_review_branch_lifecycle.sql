-- Branch onboarding is connection-scoped. A newly added branch starts in
-- onboarding/demo mode and cannot publish or send collection messages until
-- its Google location is verified and it is explicitly activated.

alter table public.google_review_branch_registry
  add column if not exists lifecycle text not null default 'onboarding',
  add column if not exists google_verified_at timestamptz,
  add column if not exists last_sync_at timestamptz,
  add column if not exists onboarding jsonb not null default '{}'::jsonb;

alter table public.google_review_branch_registry
  drop constraint if exists google_review_branch_registry_lifecycle_check;
alter table public.google_review_branch_registry
  add constraint google_review_branch_registry_lifecycle_check
  check (lifecycle in ('onboarding','demo','live_candidate','live','paused','archived'));

update public.google_review_branch_registry
set lifecycle = case when mode = 'live_candidate' then 'live_candidate' else 'demo' end
where lifecycle = 'onboarding';

create unique index if not exists google_review_branch_registry_store_code_uq
  on public.google_review_branch_registry(connection_id, store_code)
  where store_code is not null;
create unique index if not exists google_review_branch_registry_location_id_uq
  on public.google_review_branch_registry(connection_id, location_id)
  where location_id is not null;

-- Previous migrations intentionally limited management data to Bursa while the
-- module was in pilot. The registry now owns the scope, so all valid Google or
-- custom branch ids are accepted by the database as well.
do $$
declare
  t text;
begin
  foreach t in array array[
    'google_review_management_resources',
    'google_review_notifications',
    'google_review_ai_generations',
    'google_review_ai_outcomes',
    'google_review_targets'
  ] loop
    execute format('alter table public.%I drop constraint if exists %I', t, t || '_branch_id_check');
    execute format('alter table public.%I add constraint %I check (branch_id ~ ''^branch-(google|custom)-[A-Za-z0-9-]+$'')', t, t || '_branch_id_check');
  end loop;
end $$;

alter table public.google_review_collection_policies
  drop constraint if exists google_review_collection_policies_pkey;
alter table public.google_review_collection_policies
  add constraint google_review_collection_policies_pkey primary key (connection_id, branch_id);
alter table public.google_review_collection_policies
  drop constraint if exists google_review_collection_policies_branch_id_check;
alter table public.google_review_collection_policies
  add constraint google_review_collection_policies_branch_id_check
  check (branch_id ~ '^branch-(google|custom)-[A-Za-z0-9-]+$');

alter table public.google_review_collection_outbox
  drop constraint if exists google_review_collection_outbox_service_uq;
-- PostgreSQL names an inline `unique(connection_id, service_id)` constraint
-- from the collection migration independently of the index name above. Drop
-- both names so this migration is safe on databases created by either form.
alter table public.google_review_collection_outbox
  drop constraint if exists google_review_collection_outbox_connection_id_service_id_key;
alter table public.google_review_collection_outbox
  drop constraint if exists google_review_collection_outbox_service_id_key;
alter table public.google_review_collection_outbox
  drop constraint if exists google_review_collection_outbox_branch_id_check;
alter table public.google_review_collection_outbox
  add constraint google_review_collection_outbox_branch_id_check
  check (branch_id ~ '^branch-(google|custom)-[A-Za-z0-9-]+$');
create unique index if not exists google_review_collection_outbox_service_uq
  on public.google_review_collection_outbox(connection_id, branch_id, service_id);

-- The old RPC rejected every non-Bursa resource even after the table became
-- multi-branch. Keep strict id validation, but let the Edge Function enforce
-- registration, lifecycle and permissions.
create or replace function public.google_review_save_resource(
  p_connection_id text, p_branch_id text, p_kind text, p_id uuid, p_key text,
  p_data jsonb, p_expected_version integer, p_actor_id uuid,
  p_work_id uuid default null, p_expected_work_version integer default null,
  p_work_status text default null
)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare saved public.google_review_management_resources; work public.google_review_work_items; before_resource jsonb;
begin
 if p_branch_id !~ '^branch-(google|custom)-[A-Za-z0-9-]+$' or p_expected_version < 0 then
   raise exception 'Invalid resource scope/version' using errcode='22023';
 end if;
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
 if p_kind='branch_settings' and p_branch_id='branch-google-nilufer' then
  update public.google_review_policies set default_sla_hours=(p_data->>'sla_hours')::integer,updated_by=p_actor_id,updated_at=clock_timestamp() where connection_id=p_connection_id;
 end if;
 insert into public.google_review_audit_log(connection_id,actor_id,actor_role,action,entity_type,entity_id,before_state,after_state,detail)
 values(p_connection_id,p_actor_id,'MANAGEMENT','resource_save',p_kind,saved.id::text,coalesce(before_resource,'{}'::jsonb),jsonb_build_object('version',saved.version,'key',saved.key,'branch_id',p_branch_id), 'Yönetim kaydı kaydedildi.');
 return jsonb_build_object('resource',to_jsonb(saved),'item',case when p_work_id is null then null else to_jsonb(work) end);
end; $$;
revoke all on function public.google_review_save_resource(text,text,text,uuid,text,jsonb,integer,uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.google_review_save_resource(text,text,text,uuid,text,jsonb,integer,uuid,uuid,integer,text) to service_role;
