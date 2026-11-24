create function app_private.office_inspection_health_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare actor public.app_users; result jsonb;
begin
 if auth.uid() is null or app_private.franchise_office_manager() is not true then raise exception 'Yetkili merkez oturumu gerekli' using errcode='42501';end if;
 select * into strict actor from public.app_users where auth_user_id=auth.uid() and is_active;
 if actor.branch_id is null then
  return jsonb_build_object('source','inspection_health','scope','current_user_branch','observed_at',current_timestamp,'status','branch_required','counts',null,'delivery_verified',false);
 end if;
 if public.current_user_can_access_branch(actor.branch_id) is not true then raise exception 'Şube erişimi doğrulanamadı' using errcode='42501';end if;
 with cases as (
  select id,revision_no,status,secretary_gate_ready,payment_gate_ready,kvkk_gate_ready
  from public.expertise_cases where branch_id=actor.branch_id and status::text is distinct from 'CANCELLED'
 ), reports as (
  select c.id,count(r.id) filter(where r.revision_no=c.revision_no and r.status::text='LOCKED' and r.locked_at is not null and r.locked_by is not null) locked_current
  from cases c left join public.final_reports r on r.expertise_case_id=c.id group by c.id
 ), tasks as (
  select t.owner_user_id,t.status from public.inspection_tasks t join cases c on c.id=t.expertise_case_id
  where t.status::text is distinct from 'CANCELLED'
 ) select jsonb_build_object('source','inspection_health','scope','current_user_branch','observed_at',current_timestamp,'status','ok','delivery_verified',false,
 'counts',jsonb_build_object(
 'cases',(select count(*) from cases),
 'intake_gates_unconfirmed',(select count(*) from cases where secretary_gate_ready is not true or payment_gate_ready is not true or kvkk_gate_ready is not true),
 'tasks',(select count(*) from tasks),
 'tasks_not_completed',(select count(*) from tasks where status::text is distinct from 'COMPLETED'),
 'tasks_without_owner',(select count(*) from tasks where owner_user_id is null and status::text is distinct from 'COMPLETED'),
 'current_locked_report',(select count(*) from reports where locked_current=1),
 'report_version_unconfirmed',(select count(*) from reports where locked_current<>1),
 'delivery_status_unverified',(select count(*) from cases where status::text in ('DELIVERED','CLOSED')))) into result;
 return result;
exception when no_data_found or too_many_rows then raise exception 'Tekil aktif ERP hesabı doğrulanamadı' using errcode='42501';
end $$;
revoke all on function app_private.office_inspection_health_summary() from public,anon,authenticated;
create function public.office_inspection_health_summary() returns jsonb language sql stable security invoker set search_path='' as $$select app_private.office_inspection_health_summary()$$;
revoke all on function public.office_inspection_health_summary() from public,anon,authenticated;
grant execute on function app_private.office_inspection_health_summary(),public.office_inspection_health_summary() to authenticated;
