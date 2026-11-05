begin;
insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('16161616-1616-4161-8161-161616161601','quality-maker@example.invalid','{}',now(),now()),
('16161616-1616-4161-8161-161616161602','gm-checker@example.invalid','{}',now(),now()),
('16161616-1616-4161-8161-161616161603','operations-wrong@example.invalid','{}',now(),now()) on conflict do nothing;
insert into public.franchise_user_scopes(auth_user_id,franchise_role,branch_ids,updated_by) values
('16161616-1616-4161-8161-161616161601','quality','{}','16161616-1616-4161-8161-161616161602'),
('16161616-1616-4161-8161-161616161602','gm','{}','16161616-1616-4161-8161-161616161602'),
('16161616-1616-4161-8161-161616161603','operations','{}','16161616-1616-4161-8161-161616161602');
insert into public.franchise_cases(id,application_no,candidate_name,city,district,status,created_by) values('16161616-1616-4161-8161-161616161610','APP-OPENING-UAT','Sentetik Açılış Adayı','Bursa','Nilüfer','approved','16161616-1616-4161-8161-161616161602');
insert into public.franchise_opening_deliverables(franchise_case_id,deliverable_code,payload,evidence_sha256,status,maker_id,checker_id,reviewed_at) values
('16161616-1616-4161-8161-161616161610','architecture_project','{"project_id":"P1","plan_version":"V1"}',repeat('1',64),'approved','16161616-1616-4161-8161-161616161601','16161616-1616-4161-8161-161616161602',now()),
('16161616-1616-4161-8161-161616161610','construction_handover','{"project_id":"P1","handover_id":"H1"}',repeat('2',64),'approved','16161616-1616-4161-8161-161616161601','16161616-1616-4161-8161-161616161602',now()),
('16161616-1616-4161-8161-161616161610','equipment_delivery','{"order_id":"O1","delivery_id":"D1","inventory_count":12}',repeat('3',64),'approved','16161616-1616-4161-8161-161616161601','16161616-1616-4161-8161-161616161602',now()),
('16161616-1616-4161-8161-161616161610','calibration','{"equipment_count":12,"calibration_batch_id":"C1"}',repeat('4',64),'approved','16161616-1616-4161-8161-161616161601','16161616-1616-4161-8161-161616161602',now()),
('16161616-1616-4161-8161-161616161610','ohs_readiness','{"risk_assessment_id":"R1","emergency_plan_id":"E1"}',repeat('5',64),'approved','16161616-1616-4161-8161-161616161601','16161616-1616-4161-8161-161616161602',now()),
('16161616-1616-4161-8161-161616161610','brand_campaign','{"brand_application_id":"B1","campaign_id":"M1"}',repeat('7',64),'approved','16161616-1616-4161-8161-161616161601','16161616-1616-4161-8161-161616161602',now()),
('16161616-1616-4161-8161-161616161610','it_readiness','{"network_check_id":"N1","erp_tenant_id":"T1","provisioned_account_count":10}',repeat('8',64),'approved','16161616-1616-4161-8161-161616161601','16161616-1616-4161-8161-161616161602',now()),
('16161616-1616-4161-8161-161616161610','trial_operation','{"trial_operation_id":"T1","successful_job_count":5,"critical_error_count":0}',repeat('9',64),'approved','16161616-1616-4161-8161-161616161601','16161616-1616-4161-8161-161616161602',now()),
('16161616-1616-4161-8161-161616161610','opening_board','{"board_decision_id":"OB1","decision":"approved"}',repeat('a',64),'approved','16161616-1616-4161-8161-161616161601','16161616-1616-4161-8161-161616161602',now());
set local role authenticated; set local request.jwt.claims='{"sub":"16161616-1616-4161-8161-161616161603","app_metadata":{"franchise_role":"operations"}}';
do $$ begin begin perform public.submit_franchise_opening_deliverable('16161616-1616-4161-8161-161616161610','quality_audit','{"audit_id":"A1","score":90,"open_finding_count":0}',repeat('6',64)); raise exception 'Yanlış departman kalite teslimatı oluşturdu'; exception when others then if sqlerrm not like 'Teslimat departman%' then raise; end if; end; end $$; reset role;
set local role authenticated; set local request.jwt.claims='{"sub":"16161616-1616-4161-8161-161616161601","app_metadata":{"franchise_role":"quality"}}';
do $$ begin begin perform public.submit_franchise_opening_deliverable('16161616-1616-4161-8161-161616161610','quality_audit','{"audit_id":"A1","score":79,"open_finding_count":0}',repeat('6',64)); raise exception 'Eşik altı kalite denetimi kabul edildi'; exception when others then if sqlerrm not like 'Teslimat alanları%' then raise; end if; end; end $$;
select public.submit_franchise_opening_deliverable('16161616-1616-4161-8161-161616161610','quality_audit','{"audit_id":"A1","score":90,"open_finding_count":0}',repeat('6',64)) as quality_id \gset
do $$ begin begin update public.franchise_opening_deliverables set status='approved',checker_id=auth.uid(),reviewed_at=now() where franchise_case_id='16161616-1616-4161-8161-161616161610' and deliverable_code='quality_audit'; raise exception 'Doğrudan self approval kabul edildi'; exception when others then if sqlerrm not like 'Bağımsız açılış%' then raise; end if; end; end $$; reset role;
set local role authenticated; set local request.jwt.claims='{"sub":"16161616-1616-4161-8161-161616161602","app_metadata":{"franchise_role":"gm"}}';
select public.review_franchise_opening_deliverable(:'quality_id',true,'Kalite eşiği ve bulgular doğrulandı');
do $$ begin if not public.franchise_opening_execution_ready('16161616-1616-4161-8161-161616161610') then raise exception 'On açılış teslimatı kapıyı açmadı'; end if; end $$; reset role;
select 'PASS' as franchise_opening_execution_acceptance; rollback;
