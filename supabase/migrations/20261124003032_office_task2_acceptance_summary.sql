-- Read-only TASK2 aggregate. No fallback to legacy v24, no task or identity payload.
create or replace function app_private.office_task2_health_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor public.app_users; scope_name text; result jsonb; workspace jsonb;
begin
 if auth.uid() is null or app_private.franchise_office_manager() is not true then
  raise exception 'Yetkili merkez oturumu gerekli.' using errcode='42501';
 end if;
 select * into strict actor from public.app_users where auth_user_id=auth.uid() and is_active;
 scope_name:=coalesce(actor.branch_id::text,'hq');
 select data into workspace from app_private.task2_workspace where scope=scope_name and version>0;
 if not found or jsonb_typeof(workspace->'tasks') is distinct from 'array' then raise exception 'TASK2 çalışma alanı doğrulanamadı.' using errcode='22023';end if;
 with records as (
  select t.value->>'status' as state,
   exists(select 1 from app_private.task2_assignment_receipts r where r.scope=scope_name and r.task_id=t.value->>'id' and r.source_revision=md5(t.value::text) and r.actor_id::text=t.value->>'assignee') as accepted,
   nullif(btrim(t.value->>'assignee'),'') as owner,
   nullif(t.value->>'due','') as due_text,
   app_private.office_health_date(t.value->>'due') as due,
   exists(select 1 from public.app_users u where u.is_active
    and coalesce(u.branch_id::text,'hq')=scope_name and u.id::text=t.value->>'assignee') as owner_resolved
  from jsonb_array_elements(workspace->'tasks') t where t.value->'archived' is distinct from 'true'::jsonb
 ) select jsonb_build_object(
  'total',count(*),
  'accepted_open',count(*) filter(where state in ('backlog','todo','progress','review') and owner_resolved and accepted),
  'acceptance_pending',count(*) filter(where state in ('backlog','todo','progress','review') and owner_resolved and not accepted),
  'acceptance_unavailable',count(*) filter(where state in ('backlog','todo','progress','review') and not owner_resolved),
  'review_pending',count(*) filter(where state='review'),
  'archived',(select count(*) from jsonb_array_elements(workspace->'tasks') a where a.value->'archived'='true'::jsonb),
  'open',count(*) filter(where state in ('backlog','todo','progress','review')),
  'in_progress',count(*) filter(where state='progress'),
  'reported_done',count(*) filter(where state='done'),
  'owner_missing',count(*) filter(where state in ('backlog','todo','progress','review') and owner is null),
  'owner_unresolved',count(*) filter(where state in ('backlog','todo','progress','review') and owner is not null and not owner_resolved),
  'past_due',count(*) filter(where state in ('backlog','todo','progress','review') and due < (current_timestamp at time zone 'Europe/Istanbul')::date),
  'due_missing',count(*) filter(where state in ('backlog','todo','progress','review') and due_text is null),
  'due_invalid',count(*) filter(where state in ('backlog','todo','progress','review') and due_text is not null and due is null),
  'unknown_status',count(*) filter(where state is null or state not in ('backlog','todo','progress','review','done')),
  'acceptance_supported',true,'evidence_supported',false,
  'scope','current_user_scope','source','task2','observed_at',current_timestamp
 ) into result from records;
 return result;
exception when no_data_found or too_many_rows then
 raise exception 'Tekil ve aktif ERP hesabı doğrulanamadı.' using errcode='42501';
end $$;
