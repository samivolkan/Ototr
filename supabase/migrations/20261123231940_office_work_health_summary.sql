-- Read-only aggregate, same scope as the authenticated user's existing Isler v24.
-- No task text, person identity, customer data, writes or scheduled execution.
create function app_private.office_health_date(value text) returns date
language plpgsql immutable set search_path='' as $$
begin
 if value is null or value !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
 return value::date;
exception when invalid_datetime_format or datetime_field_overflow then return null;
end $$;
revoke all on function app_private.office_health_date(text) from public,anon,authenticated;

create function app_private.office_work_health_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor public.app_users; scope_name text; result jsonb;
begin
 if auth.uid() is null or app_private.franchise_office_manager() is not true then
  raise exception 'Yetkili merkez oturumu gerekli.' using errcode='42501';
 end if;
 select * into strict actor from public.app_users where auth_user_id=auth.uid() and is_active;
 scope_name:=coalesce(actor.branch_id::text,'hq');
 with records as (
  select t.data->>'status' as state,
   nullif(btrim(t.data->>'who'),'') as owner,
   nullif(t.data->>'due','') as due_text,
   app_private.office_health_date(t.data->>'due') as due,
   exists(select 1 from public.app_users u where u.is_active
    and coalesce(u.branch_id::text,'hq')=scope_name and u.id::text=t.data->>'who') as owner_resolved
  from app_private.isler24_tasks t where t.scope=scope_name and t.deleted_at is null
 ) select jsonb_build_object(
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
revoke all on function app_private.office_work_health_summary() from public,anon,authenticated;
grant execute on function app_private.office_work_health_summary() to authenticated;

create function public.office_work_health_summary() returns jsonb
language sql stable security invoker set search_path='' as $$
 select app_private.office_work_health_summary();
$$;
revoke all on function public.office_work_health_summary() from public,anon,authenticated;
grant execute on function public.office_work_health_summary() to authenticated;
