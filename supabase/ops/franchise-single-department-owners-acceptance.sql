-- STAGING/LOCAL ONLY. Synthetic single-responsible organization acceptance.
begin;
insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('a1000000-0000-4000-8000-000000000001','owners-gm@example.invalid','{}',now(),now()),
('a1000000-0000-4000-8000-000000000002','owners-franchise@example.invalid','{}',now(),now()),
('a1000000-0000-4000-8000-000000000003','owners-finance@example.invalid','{}',now(),now()),
('a1000000-0000-4000-8000-000000000004','owners-hr@example.invalid','{}',now(),now()),
('a1000000-0000-4000-8000-000000000005','owners-subordinate@example.invalid','{}',now(),now());

set local role authenticated;
set local request.jwt.claims='{"sub":"a1000000-0000-4000-8000-000000000001","app_metadata":{"franchise_role":"gm"}}';
insert into public.franchise_department_responsibilities(id,department_code,user_id,role_code,assigned_by,assignment_note) values
('a2000000-0000-4000-8000-000000000001','franchise','a1000000-0000-4000-8000-000000000002','franchise_director','a1000000-0000-4000-8000-000000000001','Sentetik franchise sorumlusu'),
('a2000000-0000-4000-8000-000000000002','finance','a1000000-0000-4000-8000-000000000003','finance','a1000000-0000-4000-8000-000000000001','Sentetik finans sorumlusu'),
('a2000000-0000-4000-8000-000000000003','hr','a1000000-0000-4000-8000-000000000004','hr','a1000000-0000-4000-8000-000000000001','Sentetik insan kaynakları sorumlusu');
do $$begin
  begin
    insert into public.franchise_department_responsibilities(department_code,user_id,role_code,assigned_by,assignment_note) values('finance','a1000000-0000-4000-8000-000000000005','finance','a1000000-0000-4000-8000-000000000001','İkinci aktif finans sorumlusu');
    raise exception 'duplicate primary accepted';
  exception when unique_violation then null; end;
end$$;

set local request.jwt.claims='{"sub":"a1000000-0000-4000-8000-000000000003","app_metadata":{"franchise_role":"finance"}}';
insert into public.franchise_department_responsibilities(department_code,user_id,role_code,assignment_level,reports_to_id,assigned_by,assignment_note)
values('finance','a1000000-0000-4000-8000-000000000005','finance','subordinate','a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000003','Gelecekte kullanılacak sentetik alt personel');
do $$begin
  begin
    insert into public.franchise_department_responsibilities(department_code,user_id,role_code,assignment_level,reports_to_id,assigned_by,assignment_note)
    values('hr','a1000000-0000-4000-8000-000000000005','hr','subordinate','a2000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000003','Yanlış departman alt personeli');
    raise exception 'cross department subordinate accepted';
  exception when others then if sqlerrm='cross department subordinate accepted' then raise; end if; end;
end$$;
select count(*)=3 as exactly_three_primary_responsibles from public.franchise_department_responsibilities where assignment_level='primary_responsible' and is_active;
select count(*)=1 as subordinate_is_attached_to_finance_owner from public.franchise_department_responsibilities where assignment_level='subordinate' and reports_to_id='a2000000-0000-4000-8000-000000000002';
rollback;
