create function app_private.office_task2_handoff_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor public.app_users;scope_name text;workspace jsonb;result jsonb;
begin
 if auth.uid() is null or app_private.franchise_office_manager() is not true then raise exception 'Yetkili merkez oturumu gerekli' using errcode='42501';end if;
 select * into strict actor from public.app_users where auth_user_id=auth.uid() and is_active;
 scope_name:=coalesce(actor.branch_id::text,'hq');
 select data into workspace from app_private.task2_workspace where scope=scope_name and version>0;
 if not found or jsonb_typeof(workspace->'tasks') is distinct from 'array' then raise exception 'Görev kaynağı doğrulanamadı' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(workspace->'tasks') t where jsonb_typeof(t->'id') is distinct from 'string' or length(t->>'id') not between 1 and 100)
 or (select count(*)<>count(distinct t->>'id') from jsonb_array_elements(workspace->'tasks') t) then raise exception 'Tekil görev kimlikleri doğrulanamadı' using errcode='22023';end if;
 with records as (
 select d.state,
 coalesce(app_private.task2_assignment_revision(t)=case when d.state='accepted' then d.result_revision else d.source_revision end
 and (d.state<>'pending' or t->>'status' in ('backlog','todo','progress')),false) is_current
 from jsonb_array_elements(workspace->'tasks') t
 left join app_private.task2_handoffs d on d.scope=scope_name and d.task_id=t->>'id'
 where t->'archived' is distinct from 'true'::jsonb
 ) select jsonb_build_object('source','task2_handoff','scope','current_user_scope','observed_at',current_timestamp,
 'total',count(*),'none',count(*) filter(where state is null),
 'pending',count(*) filter(where is_current and state='pending'),
 'accepted',count(*) filter(where is_current and state='accepted'),
 'declined',count(*) filter(where is_current and state='declined'),
 'cancelled',count(*) filter(where is_current and state='cancelled'),
 'stale',count(*) filter(where state is not null and not is_current)) into result from records;
 return result;
exception when no_data_found or too_many_rows then raise exception 'Tekil aktif ERP hesabı doğrulanamadı' using errcode='42501';
end $$;
revoke all on function app_private.office_task2_handoff_summary() from public,anon,authenticated;
create function public.office_task2_handoff_summary() returns jsonb language sql stable security invoker set search_path='' as $$select app_private.office_task2_handoff_summary();$$;
revoke all on function public.office_task2_handoff_summary() from public,anon,authenticated;
grant execute on function app_private.office_task2_handoff_summary(),public.office_task2_handoff_summary() to authenticated;
