-- Local/staging acceptance test. Runs in one transaction and rolls back all fixture data.
begin;

insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at)
values('11111111-1111-4111-8111-111111111111','franchise-gm-test@example.invalid','{"role":"gm"}'::jsonb,now(),now())
on conflict (id) do nothing;
insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at)
values('11111111-1111-4111-8111-111111111112','franchise-evidence-test@example.invalid','{}'::jsonb,now(),now())
on conflict (id) do nothing;
insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at)
values('11111111-1111-4111-8111-111111111113','franchise-operations-test@example.invalid','{}'::jsonb,now(),now())
on conflict (id) do nothing;

insert into public.franchise_user_scopes(auth_user_id,franchise_role,branch_ids,updated_by)
values('11111111-1111-4111-8111-111111111111','gm','{}','11111111-1111-4111-8111-111111111111');

set local role supabase_auth_admin;
do $$
declare hook_result jsonb;
begin
  hook_result:=public.franchise_custom_access_token_hook('{"user_id":"11111111-1111-4111-8111-111111111111","claims":{"app_metadata":{"existing_erp_claim":"preserved"}}}'::jsonb);
  if hook_result->'claims'->'app_metadata'->>'franchise_role'<>'gm' then raise exception 'Franchise rol claim üretilemedi'; end if;
  if hook_result->'claims'->'app_metadata'->>'existing_erp_claim'<>'preserved' then raise exception 'Mevcut ERP claim kayboldu'; end if;
end $$;
reset role;

insert into public.franchise_cases(id,application_no,candidate_name,city,district,stage,score,consent_count,document_count,document_total,paid_percent,status,created_by)
values('22222222-2222-4222-8222-222222222222','APP-STAGING-ACCEPTANCE','Sentetik Kabul Adayı','Bursa','Nilüfer',12,84,3,17,17,100,'approved','11111111-1111-4111-8111-111111111111');

insert into public.franchise_consent_receipts(franchise_case_id,subject_id,purpose,status,notice_version,source,evidence_sha256) values
('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111112','privacy_notice','granted','2026.11','web',repeat('1',64)),
('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111112','data_processing','granted','2026.11','web',repeat('2',64)),
('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111112','commercial_communication','granted','2026.11','web',repeat('3',64));
insert into public.franchise_documents(franchise_case_id,storage_path,category,uploaded_by,mime_type,size_bytes,document_code,evidence_sha256,status,approved_by,approved_at)
select '22222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222/'||document_code||'.pdf',category,'11111111-1111-4111-8111-111111111111','application/pdf',1024,document_code,repeat('a',64),'approved','11111111-1111-4111-8111-111111111112',now()
from public.franchise_document_requirements where branch_type='standard' and is_active;

set local role authenticated;
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","app_metadata":{"franchise_role":"gm","franchise_branch_ids":[]}}';
do $$
begin
  perform public.activate_franchise_case('22222222-2222-4222-8222-222222222222');
  raise exception 'Eksik görev/kadro aktivasyonu yanlışlıkla geçti';
exception when others then
  if sqlerrm not like 'Departman görev seti eksik%' then raise; end if;
end $$;
reset role;

insert into public.franchise_department_tasks(franchise_case_id,department,task_code,title,status,completed_by,completed_at)
select '22222222-2222-4222-8222-222222222222',
       (array['Franchise','Finans','Muhasebe','Hukuk','İnsan Kaynakları','Academy','Operasyon','Tedarik','Bilgi Teknolojileri','Pazarlama','Kalite','İSG','Mimari / Proje'])[((n-1)/3+1)],
       'TASK-'||lpad(n::text,2,'0'), 'Sentetik görev '||n, 'completed', '11111111-1111-4111-8111-111111111111', now()
from generate_series(1,39) n;

insert into public.franchise_staff(franchise_case_id,role_key,role_name,person_name,recruitment_status,employment_documents_complete,contract_signed,certification_required,academy_completed,certificate_valid_until,access_status)
select '22222222-2222-4222-8222-222222222222', role_key, role_name, 'Sentetik '||role_name, 'hired', true, true,
       certification_required, certification_required, case when certification_required then current_date+365 else null end, 'ready'
from public.franchise_staffing_rules where branch_type='standard' and is_active;
update public.franchise_staff set auth_user_id='11111111-1111-4111-8111-111111111113' where franchise_case_id='22222222-2222-4222-8222-222222222222' and role_key='owner';

insert into public.franchise_opening_evidence(franchise_case_id,gate_code,status,evidence_sha256,source_reference,details,maker_id,checker_id,reviewed_at) values
('22222222-2222-4222-8222-222222222222','entry_fee_payment','approved',repeat('a',64),'PAY-UAT','{"paid_percent":"100","payment_reference":"PAY-UAT"}','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now()),
('22222222-2222-4222-8222-222222222222','franchise_contract','approved',repeat('b',64),'CON-UAT','{"signed":true,"contract_no":"CON-UAT","signature_method":"esign"}','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now()),
('22222222-2222-4222-8222-222222222222','site_visit','approved',repeat('c',64),'SITE-UAT','{"inspector_approved":true,"measurements_complete":true,"photo_count":4,"latitude":"40.1","longitude":"29.1"}','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now()),
('22222222-2222-4222-8222-222222222222','operating_license','approved',repeat('d',64),'LIC-UAT','{"valid":true,"license_no":"LIC-UAT"}','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now());

insert into public.franchise_financial_terms(id,franchise_case_id,contract_version,entry_fee_amount,status,maker_id,checker_id,submitted_at,reviewed_at)
values('77777777-7777-4777-8777-777777777777','22222222-2222-4222-8222-222222222222','UAT-1',100000,'approved','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now(),now());
insert into public.franchise_entry_fee_installments(financial_term_id,installment_no,due_date,amount)
values('77777777-7777-4777-8777-777777777777',1,current_date,100000);
insert into public.franchise_entry_fee_receipts(franchise_case_id,financial_term_id,receipt_reference,amount,received_at,status,maker_id,checker_id,reviewed_at)
values('22222222-2222-4222-8222-222222222222','77777777-7777-4777-8777-777777777777','PAY-UAT-LEDGER',100000,now(),'approved','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now());
insert into public.franchise_due_diligence_reviews(franchise_case_id,checklist_version,risk_level,status,evidence_sha256,maker_id,checker_id,reviewed_at)
values('22222222-2222-4222-8222-222222222222','UAT-1','low','approved',repeat('e',64),'11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now());
insert into public.franchise_territory_protections(franchise_case_id,protection_type,city,district,status,maker_id,checker_id,reviewed_at)
values('22222222-2222-4222-8222-222222222222','district','Bursa','Nilüfer','approved','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now());
insert into public.franchise_contracts(franchise_case_id,contract_no,template_version,signature_method,provider_status,signed_at,evidence_sha256,status,maker_id,checker_id,reviewed_at)
values('22222222-2222-4222-8222-222222222222','CON-UAT-STRUCTURED','UAT-1','wet','not_requested',now(),repeat('f',64),'approved','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now());
insert into public.franchise_site_visits(franchise_case_id,visited_at,latitude,longitude,photo_count,measurements,evidence_sha256,status,inspector_id,checker_id,reviewed_at)
values('22222222-2222-4222-8222-222222222222',now(),40.2,29.1,4,'{"gross_area_m2":900,"work_bay_count":6,"ceiling_height_m":4.5}',repeat('9',64),'approved','11111111-1111-4111-8111-111111111113','11111111-1111-4111-8111-111111111111',now());
insert into public.franchise_opening_deliverables(franchise_case_id,deliverable_code,payload,evidence_sha256,status,maker_id,checker_id,reviewed_at) values
('22222222-2222-4222-8222-222222222222','architecture_project','{"project_id":"P1","plan_version":"V1"}',repeat('1',64),'approved','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now()),
('22222222-2222-4222-8222-222222222222','construction_handover','{"project_id":"P1","handover_id":"H1"}',repeat('2',64),'approved','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now()),
('22222222-2222-4222-8222-222222222222','equipment_delivery','{"order_id":"O1","delivery_id":"D1","inventory_count":12}',repeat('3',64),'approved','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now()),
('22222222-2222-4222-8222-222222222222','calibration','{"equipment_count":12,"calibration_batch_id":"C1"}',repeat('4',64),'approved','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now()),
('22222222-2222-4222-8222-222222222222','ohs_readiness','{"risk_assessment_id":"R1","emergency_plan_id":"E1"}',repeat('5',64),'approved','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now()),
('22222222-2222-4222-8222-222222222222','quality_audit','{"audit_id":"A1","score":90,"open_finding_count":0}',repeat('6',64),'approved','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now()),
('22222222-2222-4222-8222-222222222222','brand_campaign','{"brand_application_id":"B1","campaign_id":"M1"}',repeat('7',64),'approved','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now()),
('22222222-2222-4222-8222-222222222222','it_readiness','{"network_check_id":"N1","erp_tenant_id":"T1","provisioned_account_count":10}',repeat('8',64),'approved','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now()),
('22222222-2222-4222-8222-222222222222','trial_operation','{"trial_operation_id":"T1","successful_job_count":5,"critical_error_count":0}',repeat('a',64),'approved','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now()),
('22222222-2222-4222-8222-222222222222','opening_board','{"board_decision_id":"OB1","decision":"approved"}',repeat('b',64),'approved','11111111-1111-4111-8111-111111111112','11111111-1111-4111-8111-111111111111',now());

set local role authenticated;
do $$
declare first_result jsonb; repeated_result jsonb;
begin
  first_result:=public.activate_franchise_case('22222222-2222-4222-8222-222222222222');
  if not (first_result->>'ok')::boolean then raise exception 'İlk aktivasyon başarısız'; end if;
  if (select count(*) from public.franchise_branches where franchise_case_id='22222222-2222-4222-8222-222222222222')<>1 then raise exception 'Şube sayısı yanlış'; end if;
  if (select count(*) from public.franchise_access_accounts where franchise_case_id='22222222-2222-4222-8222-222222222222')<>10 then raise exception 'Hesap sayısı yanlış'; end if;
  if not exists(select 1 from public.franchise_user_scopes s join public.franchise_branches b on b.id=any(s.branch_ids) where s.auth_user_id='11111111-1111-4111-8111-111111111113' and s.franchise_role='dealer' and s.is_active and b.franchise_case_id='22222222-2222-4222-8222-222222222222') then raise exception 'Bayi JWT şube kapsamı oluşmadı'; end if;
  if (select count(*) from public.franchise_followup_tasks where franchise_case_id='22222222-2222-4222-8222-222222222222')<>3 then raise exception '30/60/90 görev sayısı yanlış'; end if;
  if (select count(*) from public.franchise_integration_outbox where franchise_case_id='22222222-2222-4222-8222-222222222222')<>5 then raise exception 'Outbox olay sayısı yanlış'; end if;
  if not exists(select 1 from public.franchise_integration_outbox where franchise_case_id='22222222-2222-4222-8222-222222222222' and source='accounting' and event_type='chart_of_accounts.created') then raise exception 'Muhasebe açılış olayı oluşmadı'; end if;
  repeated_result:=public.activate_franchise_case('22222222-2222-4222-8222-222222222222');
  if coalesce((repeated_result->>'already_active')::boolean,false) is not true then raise exception 'Tekrarlı aktivasyon idempotent değil'; end if;
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111113","app_metadata":{"franchise_role":"operations"}}';
select public.complete_franchise_followup((select id from public.franchise_followup_tasks where franchise_case_id='22222222-2222-4222-8222-222222222222' and day_no=30),repeat('e',64),'Sentetik 30. gün operasyon kanıtı');
select status='completed' and completed_by='11111111-1111-4111-8111-111111111113' and evidence_sha256=repeat('e',64) as followup_owner_completed_with_evidence
from public.franchise_followup_tasks where franchise_case_id='22222222-2222-4222-8222-222222222222' and day_no=30;
select public.request_franchise_followup_reopen((select id from public.franchise_followup_tasks where franchise_case_id='22222222-2222-4222-8222-222222222222' and day_no=30),'Kanıt dosyası yenilenecek');
do $$ declare v_request uuid; begin
  select id into v_request from public.franchise_followup_reopen_requests where requester_id='11111111-1111-4111-8111-111111111113' and status='pending';
  begin perform public.review_franchise_followup_reopen(v_request,true,'Kendi onayı'); raise exception 'self reopen approval accepted';
  exception when others then if sqlerrm not like 'Talep eden kendi%' then raise; end if; end;
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","app_metadata":{"franchise_role":"gm","franchise_branch_ids":[]}}';
select public.review_franchise_followup_reopen((select id from public.franchise_followup_reopen_requests where requester_id='11111111-1111-4111-8111-111111111113' and status='pending'),true,'Bağımsız yeniden açma onayı');
select status='open' and completed_by is null and evidence_sha256 is null as approved_reopen_clears_completion
from public.franchise_followup_tasks where franchise_case_id='22222222-2222-4222-8222-222222222222' and day_no=30;
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"11111111-1111-4111-8111-111111111111","app_metadata":{"franchise_role":"gm","franchise_branch_ids":[]}}';
update public.franchise_access_accounts set status='revoked' where franchise_case_id='22222222-2222-4222-8222-222222222222' and auth_user_id='11111111-1111-4111-8111-111111111113';
do $$ begin if exists(select 1 from public.franchise_user_scopes where auth_user_id='11111111-1111-4111-8111-111111111113' and is_active) then raise exception 'İptal edilen hesabın şube kapsamı kaldırılmadı'; end if; end $$;
reset role;

set local role service_role;
do $$
declare claimed public.franchise_integration_outbox%rowtype;
begin
  select * into claimed from public.claim_franchise_outbox(1) limit 1;
  if claimed.id is null or claimed.status<>'processing' or claimed.attempts<>1 then raise exception 'Outbox claim başarısız'; end if;
  perform public.finish_franchise_outbox(claimed.id,claimed.lease_token,true,null);
  if not exists(select 1 from public.franchise_integration_outbox where id=claimed.id and status='processed' and processed_at is not null) then raise exception 'Outbox finish başarısız'; end if;
end $$;
reset role;

select 'PASS' as franchise_activation_acceptance;
rollback;
