-- STAGING/LOCAL ONLY. Applicant, dealer, inspector and supplier isolation acceptance.
begin;
insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('f1000000-0000-4000-8000-000000000001','portal-gm@example.invalid','{}',now(),now()),
('f1000000-0000-4000-8000-000000000002','portal-applicant-a@example.invalid','{}',now(),now()),
('f1000000-0000-4000-8000-000000000003','portal-applicant-b@example.invalid','{}',now(),now()),
('f1000000-0000-4000-8000-000000000004','portal-dealer@example.invalid','{}',now(),now()),
('f1000000-0000-4000-8000-000000000005','portal-inspector@example.invalid','{}',now(),now()),
('f1000000-0000-4000-8000-000000000006','portal-supplier@example.invalid','{}',now(),now());

insert into public.franchise_cases(id,application_no,applicant_user_id,candidate_name,city,district,status) values
('f2000000-0000-4000-8000-000000000001','APP-PORTAL-A','f1000000-0000-4000-8000-000000000002','Sentetik Portal Adayı A','Bursa','Nilüfer','active'),
('f2000000-0000-4000-8000-000000000002','APP-PORTAL-B','f1000000-0000-4000-8000-000000000003','Sentetik Portal Adayı B','İstanbul','Kadıköy','in_review');
set local session_replication_role=replica;
insert into public.franchise_branches(id,franchise_case_id,branch_code,name,city,district,activated_by) values
('f3000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','BR-PORTAL-A','Sentetik Portal Şubesi','Bursa','Nilüfer','f1000000-0000-4000-8000-000000000001');
set local session_replication_role=origin;

set local role authenticated;
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000001","app_metadata":{"franchise_role":"gm","franchise_branch_ids":[]}}';
select public.create_franchise_portal_assignment('f2000000-0000-4000-8000-000000000001',null,'f1000000-0000-4000-8000-000000000002','applicant','application','APP-PORTAL-A');
select public.create_franchise_portal_assignment('f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000004','dealer','branch','BR-PORTAL-A');
select public.create_franchise_portal_assignment('f2000000-0000-4000-8000-000000000001',null,'f1000000-0000-4000-8000-000000000005','inspector','site_visit','SITE-PORTAL-A');
select public.create_franchise_portal_assignment('f2000000-0000-4000-8000-000000000001',null,'f1000000-0000-4000-8000-000000000006','supplier','procurement_order','PO-PORTAL-A');

select public.create_franchise_portal_item((select id from public.franchise_portal_assignments where persona='applicant'),'document_request','Sentetik belge talebi','{"category":"legal"}',now()+interval '3 days');
select public.create_franchise_portal_item((select id from public.franchise_portal_assignments where persona='dealer'),'training','Sentetik açılış eğitimi','{"course_id":"COURSE-PORTAL"}',now()+interval '7 days');
select public.create_franchise_portal_item((select id from public.franchise_portal_assignments where persona='inspector'),'inspection','Sentetik saha ziyareti','{"location_id":"LOC-PORTAL"}',now()+interval '2 days');
select public.create_franchise_portal_item((select id from public.franchise_portal_assignments where persona='supplier'),'procurement_order','Sentetik cihaz teslimatı','{"order_id":"PO-PORTAL-A"}',now()+interval '10 days');
do $$ begin
  begin perform public.create_franchise_portal_item((select id from public.franchise_portal_assignments where persona='supplier'),'procurement_order','Hassas veri denemesi','{"order_id":"PO-X","contact":{"email":"sentetik@example.invalid"}}',null); raise exception 'portal pii accepted';
  exception when others then if sqlerrm not like 'Portal güvenli yükünde kişisel%' then raise; end if; end;
end $$;
do $$ begin
  begin perform public.create_franchise_portal_item((select id from public.franchise_portal_assignments where persona='applicant'),'inspection','Uyumsuz iş türü','{}',null); raise exception 'persona item mismatch accepted';
  exception when others then if sqlerrm not like 'Portal işi persona ile uyumsuz%' then raise; end if; end;
end $$;

set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000002","app_metadata":{"franchise_role":"applicant","franchise_branch_ids":[]}}';
select count(*)=1 as applicant_sees_only_own_assignment from public.franchise_portal_assignments;
select count(*)=1 as applicant_sees_only_own_work from public.franchise_portal_work_v;
select count(*)=1 as applicant_sees_only_own_case from public.franchise_cases;
do $$ begin
  begin perform public.complete_franchise_portal_item((select item_id from public.franchise_portal_work_v where item_type='document_request'),'submitted','DOC-PORTAL-A');
  exception when others then raise; end;
end $$;

set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000003","app_metadata":{"franchise_role":"applicant","franchise_branch_ids":[]}}';
select count(*)=0 as other_applicant_cannot_see_assignment from public.franchise_portal_assignments;
select count(*)=1 as other_applicant_sees_only_own_case from public.franchise_cases;

set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000004","app_metadata":{"franchise_role":"dealer","franchise_branch_ids":["f3000000-0000-4000-8000-000000000001"]}}';
select count(*)=1 as dealer_sees_assigned_branch from public.franchise_branches;
select count(*)=1 as dealer_sees_only_dealer_work from public.franchise_portal_work_v;

set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000005","app_metadata":{"franchise_role":"inspector","franchise_branch_ids":[]}}';
select count(*)=1 as inspector_sees_only_inspection_work from public.franchise_portal_work_v;
select count(*)=0 as inspector_cannot_read_internal_case from public.franchise_cases;
select public.complete_franchise_portal_item((select item_id from public.franchise_portal_work_v where item_type='inspection'),'submitted','SITE-EVIDENCE-A');
do $$ begin
  begin perform public.complete_franchise_portal_item((select id from public.franchise_portal_items where item_type='procurement_order'),'delivered','DELIVERY-X'); raise exception 'inspector completed supplier work';
  exception when others then if sqlerrm not like 'Açık portal işi%' and sqlerrm not like 'Portal işi yalnız atanmış kullanıcı%' then raise; end if; end;
end $$;

set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000006","app_metadata":{"franchise_role":"supplier","franchise_branch_ids":[]}}';
select count(*)=1 as supplier_sees_only_order_work from public.franchise_portal_work_v;
select count(*)=0 as supplier_cannot_read_documents from public.franchise_documents;
select public.complete_franchise_portal_item((select item_id from public.franchise_portal_work_v where item_type='procurement_order'),'delivered','DELIVERY-PORTAL-A');
reset role;

select status='submitted' as applicant_action_persisted from public.franchise_portal_items where item_type='document_request';
select status='submitted' as inspector_action_persisted from public.franchise_portal_items where item_type='inspection';
select status='delivered' as supplier_action_persisted from public.franchise_portal_items where item_type='procurement_order';
set local role authenticated;
set local request.jwt.claims='{"sub":"f1000000-0000-4000-8000-000000000001","app_metadata":{"franchise_role":"gm","franchise_branch_ids":[]}}';
select public.close_franchise_portal_assignment((select id from public.franchise_portal_assignments where persona='dealer'),'completed');
reset role;
select status='completed' and completed_at is not null as dealer_assignment_closed from public.franchise_portal_assignments where persona='dealer';
rollback;
