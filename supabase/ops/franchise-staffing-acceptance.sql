-- STAGING/LOCAL ONLY. Synthetic staffing gate and field-ownership acceptance.
begin;

insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('a1000000-0000-4000-8000-000000000001','staffing-gm@example.invalid','{}',now(),now()),
('a1000000-0000-4000-8000-000000000002','staffing-hr@example.invalid','{}',now(),now()),
('a1000000-0000-4000-8000-000000000003','staffing-academy@example.invalid','{}',now(),now()),
('a1000000-0000-4000-8000-000000000004','staffing-it@example.invalid','{}',now(),now());

insert into public.franchise_cases(id,application_no,candidate_name,city,district,branch_type)
values('a2000000-0000-4000-8000-000000000001','APP-STAFF-UAT','Sentetik Kadro Adayı','Bursa','Nilüfer','standard');

insert into public.franchise_consent_receipts(franchise_case_id,subject_id,purpose,status,notice_version,source,evidence_sha256) values
('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','privacy_notice','granted','2026.11','web',repeat('1',64)),
('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','data_processing','granted','2026.11','web',repeat('2',64)),
('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','commercial_communication','granted','2026.11','web',repeat('3',64));
insert into public.franchise_documents(franchise_case_id,storage_path,category,uploaded_by,mime_type,size_bytes,document_code,evidence_sha256,status,approved_by,approved_at)
select 'a2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001/'||document_code||'.pdf',category,'a1000000-0000-4000-8000-000000000001','application/pdf',1024,document_code,repeat('a',64),'approved','a1000000-0000-4000-8000-000000000002',now()
from public.franchise_document_requirements where branch_type='standard' and is_active;
insert into public.franchise_opening_evidence(franchise_case_id,gate_code,status,evidence_sha256,source_reference,details,maker_id,checker_id,reviewed_at) values
('a2000000-0000-4000-8000-000000000001','entry_fee_payment','approved',repeat('a',64),'PAY-UAT','{"paid_percent":"100","payment_reference":"PAY-UAT"}','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001',now()),
('a2000000-0000-4000-8000-000000000001','franchise_contract','approved',repeat('b',64),'CON-UAT','{"signed":true,"contract_no":"CON-UAT","signature_method":"esign"}','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001',now()),
('a2000000-0000-4000-8000-000000000001','site_visit','approved',repeat('c',64),'SITE-UAT','{"inspector_approved":true,"measurements_complete":true,"photo_count":4,"latitude":"40.1","longitude":"29.1"}','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001',now()),
('a2000000-0000-4000-8000-000000000001','operating_license','approved',repeat('d',64),'LIC-UAT','{"valid":true,"license_no":"LIC-UAT"}','a1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001',now());

do $$
begin
  begin
    insert into public.franchise_branches(franchise_case_id,branch_code,name,city,district,activated_by)
    values('a2000000-0000-4000-8000-000000000001','BR-STAFF-FAIL','Eksik Kadro Şubesi','Bursa','Nilüfer','a1000000-0000-4000-8000-000000000001');
    raise exception 'missing staffing gate was bypassed';
  exception when others then
    if sqlerrm not like 'Şube tipi zorunlu kadro%' then raise; end if;
  end;
end $$;

insert into public.franchise_staff(franchise_case_id,role_key,role_name,person_name,recruitment_status,employment_documents_complete,contract_signed,certification_required,academy_completed,certificate_valid_until,access_status)
select 'a2000000-0000-4000-8000-000000000001',role_key,role_name,'Sentetik '||role_name,'hired',true,true,certification_required,certification_required,case when certification_required then current_date+365 else null end,'ready'
from public.franchise_staffing_rules where branch_type='standard' and is_active;

insert into public.franchise_branches(franchise_case_id,branch_code,name,city,district,activated_by)
values('a2000000-0000-4000-8000-000000000001','BR-STAFF-PASS','Tam Kadro Şubesi','Bursa','Nilüfer','a1000000-0000-4000-8000-000000000001');
select count(*)=1 as exact_staffing_set_opens_branch from public.franchise_branches where branch_code='BR-STAFF-PASS';

set local role authenticated;
set local request.jwt.claims='{"sub":"a1000000-0000-4000-8000-000000000002","app_metadata":{"franchise_role":"hr"}}';
update public.franchise_staff set contact_email='synthetic@example.invalid' where franchise_case_id='a2000000-0000-4000-8000-000000000001' and role_key='owner';
do $$ begin
  begin update public.franchise_staff set academy_completed=false where franchise_case_id='a2000000-0000-4000-8000-000000000001' and role_key='owner'; raise exception 'HR changed Academy field';
  exception when others then if sqlerrm not like 'İK yalnız işe alım%' then raise; end if; end;
end $$;

set local request.jwt.claims='{"sub":"a1000000-0000-4000-8000-000000000003","app_metadata":{"franchise_role":"academy"}}';
update public.franchise_staff set certificate_valid_until=current_date+366 where franchise_case_id='a2000000-0000-4000-8000-000000000001' and role_key='owner';
do $$ begin
  begin update public.franchise_staff set employment_documents_complete=false where franchise_case_id='a2000000-0000-4000-8000-000000000001' and role_key='owner'; raise exception 'Academy changed HR field';
  exception when others then if sqlerrm not like 'Academy yalnız eğitim%' then raise; end if; end;
end $$;

set local request.jwt.claims='{"sub":"a1000000-0000-4000-8000-000000000004","app_metadata":{"franchise_role":"it"}}';
update public.franchise_staff set auth_user_id='a1000000-0000-4000-8000-000000000001',access_status='active' where franchise_case_id='a2000000-0000-4000-8000-000000000001' and role_key='owner';
do $$ begin
  begin update public.franchise_staff set certificate_valid_until=current_date+400 where franchise_case_id='a2000000-0000-4000-8000-000000000001' and role_key='owner'; raise exception 'IT changed Academy field';
  exception when others then if sqlerrm not like 'BT yalnız kimlik%' then raise; end if; end;
end $$;
reset role;

select contact_email='synthetic@example.invalid' and auth_user_id='a1000000-0000-4000-8000-000000000001' and access_status='active' as owned_fields_updated
from public.franchise_staff where franchise_case_id='a2000000-0000-4000-8000-000000000001' and role_key='owner';

rollback;
