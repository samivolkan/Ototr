-- Narrow office bridge: existing active ERP GENERAL_MANAGER only.
-- Does not grant case/outbox writes or modify existing Franchise authorization.
create function app_private.franchise_office_manager() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.app_users where auth_user_id=auth.uid() and is_active and role='GENERAL_MANAGER');
$$;
revoke all on function app_private.franchise_office_manager() from public,anon,authenticated;
create function app_private.franchise_office_summary() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not app_private.franchise_office_manager() then raise exception 'Franchise yönetici yetkisi gerekli' using errcode='42501'; end if;
 return jsonb_build_object(
 'checked_at',now(),
 'case_count',(select count(*) from public.franchise_cases),
 'approvals',(select count(*) from public.franchise_board_decisions where status='pending_second_approval' and superseded_at is null),
 'finance_pending',(select count(*) from public.franchise_integration_outbox where source='finance' and status in ('pending','processing')),
 'finance_processed',(select count(*) from public.franchise_integration_outbox where source='finance' and status='processed'),
 'finance_failed',(select count(*) from public.franchise_integration_outbox where source='finance' and status in ('failed','dead_letter')),
 'cases',coalesce((select jsonb_agg(row_to_json(t)) from(select status,count(*) as count from public.franchise_cases group by status)t),'[]'::jsonb),
 'approval_items',coalesce((select jsonb_agg(row_to_json(t)) from(select id,franchise_case_id,created_at,status from public.franchise_board_decisions where status='pending_second_approval' and superseded_at is null order by created_at limit 10)t),'[]'::jsonb),
 'finance_items',coalesce((select jsonb_agg(row_to_json(t)) from(select id,franchise_case_id,status,created_at,processed_at from public.franchise_integration_outbox where source='finance' order by created_at desc limit 20)t),'[]'::jsonb),
 'profile',(select to_jsonb(p) from public.franchise_agent_profile p where id='FRA-01'),
 'can_edit_profile',app_private.franchise_office_manager()
 );
end $$;
create function app_private.save_franchise_agent_profile(p_profile jsonb,p_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_row public.franchise_agent_profile; k text;
begin
 if auth.uid() is null or not app_private.franchise_office_manager() then raise exception 'Yalnız genel müdür kaydedebilir' using errcode='42501'; end if;
 if jsonb_typeof(p_profile)<>'object' or (select count(*) from jsonb_object_keys(p_profile))<>5 then raise exception 'Geçersiz görev kartı'; end if;
 foreach k in array array['mission','scope','handoff','escalation','acceptance'] loop
 if jsonb_typeof(p_profile->k) is distinct from 'string' or length(trim(p_profile->>k)) not between 5 and 2000 then raise exception 'Eksik veya geçersiz görev alanı'; end if;
 end loop;
 update public.franchise_agent_profile set profile=p_profile,version=version+1,updated_at=now(),updated_by=auth.uid() where id='FRA-01' and version=p_version returning * into v_row;
 if not found then raise exception 'Kart başka bir oturumda güncellendi. Yenileyip tekrar deneyin.' using errcode='40001'; end if;
 return to_jsonb(v_row);
end $$;

revoke all on function app_private.franchise_office_summary() from public,anon;
revoke all on function app_private.save_franchise_agent_profile(jsonb,integer) from public,anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.franchise_office_summary() to authenticated;
grant execute on function app_private.save_franchise_agent_profile(jsonb,integer) to authenticated;
create or replace function public.franchise_office_summary() returns jsonb language sql stable security invoker set search_path='' as $$ select app_private.franchise_office_summary(); $$;
create or replace function public.save_franchise_agent_profile(p_profile jsonb,p_version integer) returns jsonb language sql security invoker set search_path='' as $$ select app_private.save_franchise_agent_profile(p_profile,p_version); $$;
revoke all on function public.franchise_office_summary() from public,anon;
revoke all on function public.save_franchise_agent_profile(jsonb,integer) from public,anon;
grant execute on function public.franchise_office_summary() to authenticated;
grant execute on function public.save_franchise_agent_profile(jsonb,integer) to authenticated;
