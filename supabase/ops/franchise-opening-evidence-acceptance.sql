-- STAGING/LOCAL ONLY. Synthetic finance/legal/site/license maker-checker acceptance.
begin;

insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('b1000000-0000-4000-8000-000000000001','evidence-gm@example.invalid','{}',now(),now()),
('b1000000-0000-4000-8000-000000000002','evidence-finance@example.invalid','{}',now(),now()),
('b1000000-0000-4000-8000-000000000003','evidence-legal@example.invalid','{}',now(),now()),
('b1000000-0000-4000-8000-000000000004','evidence-operations@example.invalid','{}',now(),now());

insert into public.franchise_cases(id,application_no,candidate_name,city,district,branch_type,paid_percent)
values('b2000000-0000-4000-8000-000000000001','APP-EVIDENCE-UAT','Sentetik Kanıt Adayı','Bursa','Nilüfer','standard',100);

insert into public.franchise_staff(franchise_case_id,role_key,role_name,person_name,recruitment_status,employment_documents_complete,contract_signed,certification_required,academy_completed,certificate_valid_until,access_status)
select 'b2000000-0000-4000-8000-000000000001',role_key,role_name,'Sentetik '||role_name,'hired',true,true,certification_required,certification_required,case when certification_required then current_date+365 else null end,'ready'
from public.franchise_staffing_rules where branch_type='standard' and is_active;

do $$ begin
  begin
    insert into public.franchise_branches(franchise_case_id,branch_code,name,city,district,activated_by)
    values('b2000000-0000-4000-8000-000000000001','BR-EVID-FAIL','Kanıtsız Şube','Bursa','Nilüfer','b1000000-0000-4000-8000-000000000001');
    raise exception 'missing evidence gate was bypassed';
  exception when others then if sqlerrm not like 'Tahsilat, sözleşme%' then raise; end if; end;
end $$;

set local role authenticated;
set local request.jwt.claims='{"sub":"b1000000-0000-4000-8000-000000000002","app_metadata":{"franchise_role":"finance"}}';
select public.submit_franchise_opening_evidence('b2000000-0000-4000-8000-000000000001','entry_fee_payment',repeat('a',64),'PAY-UAT','{"paid_percent":"100","payment_reference":"PAY-UAT"}');
do $$ declare v_id uuid; begin
  select id into v_id from public.franchise_opening_evidence where franchise_case_id='b2000000-0000-4000-8000-000000000001' and gate_code='entry_fee_payment';
  begin perform public.review_franchise_opening_evidence(v_id,true,'self approval'); raise exception 'maker approved own evidence';
  exception when others then if sqlerrm not like 'Kanıtı oluşturan kişi%' then raise; end if; end;
end $$;

set local request.jwt.claims='{"sub":"b1000000-0000-4000-8000-000000000003","app_metadata":{"franchise_role":"legal"}}';
select public.submit_franchise_opening_evidence('b2000000-0000-4000-8000-000000000001','franchise_contract',repeat('b',64),'CON-UAT','{"signed":true,"contract_no":"CON-UAT","signature_method":"esign"}');
select public.submit_franchise_opening_evidence('b2000000-0000-4000-8000-000000000001','operating_license',repeat('d',64),'LIC-UAT','{"valid":true,"license_no":"LIC-UAT"}');

set local request.jwt.claims='{"sub":"b1000000-0000-4000-8000-000000000004","app_metadata":{"franchise_role":"operations"}}';
select public.submit_franchise_opening_evidence('b2000000-0000-4000-8000-000000000001','site_visit',repeat('c',64),'SITE-UAT','{"inspector_approved":true,"measurements_complete":true,"photo_count":4,"latitude":"40.1","longitude":"29.1"}');

set local request.jwt.claims='{"sub":"b1000000-0000-4000-8000-000000000001","app_metadata":{"franchise_role":"gm"}}';
do $$ declare r record; begin
  for r in select id from public.franchise_opening_evidence where franchise_case_id='b2000000-0000-4000-8000-000000000001' loop
    perform public.review_franchise_opening_evidence(r.id,true,'Sentetik ikinci onay');
  end loop;
end $$;
select public.franchise_opening_evidence_ready('b2000000-0000-4000-8000-000000000001') as all_four_evidence_gates_ready;

insert into public.franchise_branches(franchise_case_id,branch_code,name,city,district,activated_by)
values('b2000000-0000-4000-8000-000000000001','BR-EVID-PASS','Kanıtlı Şube','Bursa','Nilüfer','b1000000-0000-4000-8000-000000000001');
select count(*)=1 as approved_evidence_opens_branch from public.franchise_branches where branch_code='BR-EVID-PASS';
reset role;

rollback;
