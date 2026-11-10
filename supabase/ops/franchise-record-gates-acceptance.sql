-- STAGING/LOCAL ONLY. Synthetic consent and required-document gate acceptance.
begin;

insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('c1000000-0000-4000-8000-000000000001','records-gm@example.invalid','{}',now(),now()),
('c1000000-0000-4000-8000-000000000002','records-maker@example.invalid','{}',now(),now());
insert into public.franchise_cases(id,application_no,candidate_name,city,district,branch_type,consent_count,document_count,document_total,paid_percent)
values('c2000000-0000-4000-8000-000000000001','APP-RECORD-UAT','Sentetik Kayıt Adayı','Bursa','Nilüfer','standard',3,17,17,100);

insert into public.franchise_staff(franchise_case_id,role_key,role_name,person_name,recruitment_status,employment_documents_complete,contract_signed,certification_required,academy_completed,certificate_valid_until,access_status)
select 'c2000000-0000-4000-8000-000000000001',role_key,role_name,'Sentetik '||role_name,'hired',true,true,certification_required,certification_required,case when certification_required then current_date+365 else null end,'ready'
from public.franchise_staffing_rules where branch_type='standard' and is_active;

insert into public.franchise_opening_evidence(franchise_case_id,gate_code,status,evidence_sha256,source_reference,details,maker_id,checker_id,reviewed_at) values
('c2000000-0000-4000-8000-000000000001','entry_fee_payment','approved',repeat('a',64),'PAY-UAT','{"paid_percent":"100","payment_reference":"PAY-UAT"}','c1000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001',now()),
('c2000000-0000-4000-8000-000000000001','franchise_contract','approved',repeat('b',64),'CON-UAT','{"signed":true,"contract_no":"CON-UAT","signature_method":"esign"}','c1000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001',now()),
('c2000000-0000-4000-8000-000000000001','site_visit','approved',repeat('c',64),'SITE-UAT','{"inspector_approved":true,"measurements_complete":true,"photo_count":4,"latitude":"40.1","longitude":"29.1"}','c1000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001',now()),
('c2000000-0000-4000-8000-000000000001','operating_license','approved',repeat('d',64),'LIC-UAT','{"valid":true,"license_no":"LIC-UAT"}','c1000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001',now());

do $$ begin
  begin insert into public.franchise_branches(franchise_case_id,branch_code,name,city,district,activated_by) values('c2000000-0000-4000-8000-000000000001','BR-REC-UAT','Kayıt Şubesi','Bursa','Nilüfer','c1000000-0000-4000-8000-000000000001'); raise exception 'counter-only records bypassed gate';
  exception when others then if sqlerrm not like 'Güncel KVKK izin%' then raise; end if; end;
end $$;

insert into public.franchise_consent_receipts(franchise_case_id,subject_id,purpose,status,notice_version,source,captured_at,withdrawn_at,evidence_sha256) values
('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002','privacy_notice','granted','2026.11','web',now()-interval '3 minutes',null,repeat('1',64)),
('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002','data_processing','granted','2026.11','web',now()-interval '3 minutes',null,repeat('2',64)),
('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002','commercial_communication','granted','2026.11','web',now()-interval '3 minutes',null,repeat('3',64)),
('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002','commercial_communication','withdrawn','2026.11','portal',now()-interval '2 minutes',now()-interval '2 minutes',repeat('4',64));
select public.franchise_consents_ready('c2000000-0000-4000-8000-000000000001') as optional_commercial_withdrawal_keeps_required_consent_gate;

insert into public.franchise_consent_receipts(franchise_case_id,subject_id,purpose,status,notice_version,source,captured_at,evidence_sha256)
values('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000002','commercial_communication','granted','2026.11','portal',now()-interval '1 minute',repeat('5',64));
select public.franchise_consents_ready('c2000000-0000-4000-8000-000000000001') as latest_grants_open_consent_gate;

insert into public.franchise_documents(franchise_case_id,storage_path,category,classification,uploaded_by,mime_type,size_bytes,document_code,evidence_sha256,status,approved_by,approved_at)
select 'c2000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001/'||document_code||'.pdf',category,'confidential','c1000000-0000-4000-8000-000000000001','application/pdf',1024,document_code,repeat(substr(md5(document_code),1,1),64),'approved','c1000000-0000-4000-8000-000000000002',now()
from public.franchise_document_requirements where branch_type='standard' order by document_code limit 16;
select public.franchise_documents_ready('c2000000-0000-4000-8000-000000000001')=false as sixteen_documents_do_not_open_gate;

insert into public.franchise_documents(franchise_case_id,storage_path,category,classification,uploaded_by,mime_type,size_bytes,document_code,evidence_sha256,status,approved_by,approved_at)
select 'c2000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001/'||r.document_code||'.pdf',r.category,'confidential','c1000000-0000-4000-8000-000000000001','application/pdf',1024,r.document_code,repeat('f',64),'approved','c1000000-0000-4000-8000-000000000002',now()
from public.franchise_document_requirements r where r.branch_type='standard' and not exists(select 1 from public.franchise_documents d where d.franchise_case_id='c2000000-0000-4000-8000-000000000001' and d.document_code=r.document_code);
select public.franchise_documents_ready('c2000000-0000-4000-8000-000000000001') as seventeen_approved_documents_open_gate;

insert into public.franchise_branches(franchise_case_id,branch_code,name,city,district,activated_by)
values('c2000000-0000-4000-8000-000000000001','BR-REC-UAT','Kayıt Şubesi','Bursa','Nilüfer','c1000000-0000-4000-8000-000000000001');
select count(*)=1 as real_records_open_branch from public.franchise_branches where branch_code='BR-REC-UAT';

rollback;
