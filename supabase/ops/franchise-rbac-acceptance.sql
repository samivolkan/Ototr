-- STAGING/LOCAL ONLY. Synthetic cross-department RLS acceptance.
begin;

insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('91000000-0000-4000-8000-000000000001','finance-rbac@example.invalid','{}',now(),now()),
('91000000-0000-4000-8000-000000000002','legal-rbac@example.invalid','{}',now(),now());

insert into public.franchise_cases(id,application_no,candidate_name,city,district)
values('92000000-0000-4000-8000-000000000001','APP-RBAC-UAT','Sentetik RBAC Adayı','Bursa','Nilüfer');

insert into public.franchise_department_tasks(id,franchise_case_id,department,task_code,title) values
('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','Finans / Muhasebe','FIN-UAT','Tahsilat doğrula'),
('93000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','Hukuk','LEG-UAT','Sözleşme doğrula');

set local role authenticated;
set local request.jwt.claims='{"sub":"91000000-0000-4000-8000-000000000001","app_metadata":{"franchise_role":"finance"}}';

select count(*)=1 as finance_sees_only_finance_task from public.franchise_department_tasks where franchise_case_id='92000000-0000-4000-8000-000000000001';

update public.franchise_department_tasks
set status='completed',completed_by='91000000-0000-4000-8000-000000000001',completed_at=now()
where id='93000000-0000-4000-8000-000000000001';
select status='completed' as finance_can_complete_own_task from public.franchise_department_tasks where id='93000000-0000-4000-8000-000000000001';

update public.franchise_department_tasks
set status='completed',completed_by='91000000-0000-4000-8000-000000000001',completed_at=now()
where id='93000000-0000-4000-8000-000000000002';

reset role;
select status='open' as finance_cannot_update_legal_task from public.franchise_department_tasks where id='93000000-0000-4000-8000-000000000002';

set local role authenticated;
set local request.jwt.claims='{"sub":"91000000-0000-4000-8000-000000000002","app_metadata":{"franchise_role":"legal"}}';
do $$
begin
  begin
    update public.franchise_department_tasks set department='Finans / Muhasebe' where id='93000000-0000-4000-8000-000000000002';
    raise exception 'immutable task scope was changed';
  exception when others then
    if sqlerrm not like 'Görev dosyası, departmanı ve kodu değiştirilemez%' then raise; end if;
  end;
end $$;
reset role;

select department='Hukuk' as task_department_is_immutable from public.franchise_department_tasks where id='93000000-0000-4000-8000-000000000002';
rollback;
