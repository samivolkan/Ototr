-- Synthetic orchestration only. Existing intake/consent/canonical tables are never updated.
alter table app_private.franchise_web_demo_tasks
 add column workflow_step integer not null default 0 check(workflow_step between 0 and 4),
 add column workflow_events jsonb not null default '[]'::jsonb;

create function app_private.advance_franchise_office_demo(p_task_id uuid,p_expected_step integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d app_private.franchise_web_demo_tasks; label text;
begin
 if auth.uid() is null or not app_private.franchise_office_manager() then
  raise exception 'ERP merkez yönetici yetkisi gerekli' using errcode='42501';
 end if;
 select * into d from app_private.franchise_web_demo_tasks where task_id=p_task_id and created_by=auth.uid() for update;
 if not found then raise exception 'Demo görev bulunamadı' using errcode='42501'; end if;
 if p_expected_step is null or p_expected_step not between 0 and 3 then
  raise exception 'Demo karar kapısında durur; karar veya mali işlem yapamaz' using errcode='22023';
 end if;
 -- An exact retry cannot advance twice. Old/future requests cannot skip gates.
 if d.workflow_step=p_expected_step+1 then return jsonb_build_object('step',d.workflow_step,'replayed',true); end if;
 if d.workflow_step<>p_expected_step then raise exception 'Aşama değişti; ekranı yenileyin' using errcode='40001'; end if;
 label:=case p_expected_step
  when 0 then 'MGR-FRA demo incelemesi: dört hazırlık paketi yöneticiler üzerinden atandı'
  when 1 then 'Demo alındı kayıtları: FRA-02, FRA-03, FIN-04, FIN-02'
  when 2 then 'Kurallı demo hazırlıkları oluştu; eksik kanıtlar açık, BEK-01 gerçek denetimi bekliyor'
  when 3 then 'COO-01 demo özeti: Sami için iki karar başlığı; otomatik onay yok' end;
 update app_private.franchise_web_demo_tasks set workflow_step=workflow_step+1,
 workflow_events=workflow_events||jsonb_build_array(jsonb_build_object('step',p_expected_step+1,'at',clock_timestamp(),'label',label,'actor','authorized_demo_operator','simulated',true))
 where task_id=p_task_id;
 return jsonb_build_object('step',p_expected_step+1,'replayed',false);
end $$;
create function public.advance_franchise_office_demo(p_task_id uuid,p_expected_step integer)
returns jsonb language sql security invoker set search_path='' as $$ select app_private.advance_franchise_office_demo(p_task_id,p_expected_step); $$;
revoke all on function app_private.advance_franchise_office_demo(uuid,integer),public.advance_franchise_office_demo(uuid,integer) from public,anon,authenticated;
grant execute on function app_private.advance_franchise_office_demo(uuid,integer),public.advance_franchise_office_demo(uuid,integer) to authenticated;

create or replace function app_private.list_franchise_office_demo_tasks() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not app_private.franchise_office_manager() then raise exception 'ERP merkez yönetici yetkisi gerekli' using errcode='42501'; end if;
 return jsonb_build_object('checked_at',now(),'mode','server_backed_demo','tasks',coalesce((select jsonb_agg(to_jsonb(t)) from (
 select d.task_id,d.application_id,d.agent_id,d.status,d.prepared_output,d.created_at,d.workflow_step,d.workflow_events,a.full_name,a.province,a.district,b.status as intake_status
 from app_private.franchise_web_demo_tasks d join public.public_franchise_applications a on a.id=d.application_id
 left join public.franchise_public_intake_bridge b on b.source_application_id=d.application_id
 where d.created_by=auth.uid() order by d.created_at desc limit 20)t),'[]'::jsonb));
end $$;
