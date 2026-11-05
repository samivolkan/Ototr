begin;
insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('17171717-1717-4171-8171-171717171701','operations-requester@example.invalid','{}',now(),now()),
('17171717-1717-4171-8171-171717171702','gm-reviewer@example.invalid','{}',now(),now()) on conflict do nothing;
insert into public.franchise_user_scopes(auth_user_id,franchise_role,branch_ids,updated_by) values
('17171717-1717-4171-8171-171717171701','operations','{}','17171717-1717-4171-8171-171717171702'),
('17171717-1717-4171-8171-171717171702','gm','{}','17171717-1717-4171-8171-171717171702');
insert into public.franchise_cases(id,application_no,candidate_name,city,district,status,created_by) values('17171717-1717-4171-8171-171717171710','APP-EXCEPTION-UAT','Sentetik İstisna Adayı','Bursa','Nilüfer','approved','17171717-1717-4171-8171-171717171702');
set local role authenticated; set local request.jwt.claims='{"sub":"17171717-1717-4171-8171-171717171701","app_metadata":{"franchise_role":"operations"}}';
do $$ begin begin perform public.request_franchise_exception('17171717-1717-4171-8171-171717171710','opening:calibration','Kalibrasyon istisnası',now()+interval '7 days'); raise exception 'Kalibrasyon istisnası kabul edildi'; exception when check_violation then null; end; end $$;
select public.request_franchise_exception('17171717-1717-4171-8171-171717171710','opening:brand_campaign','Kampanya materyali bir hafta gecikecek',now()+interval '7 days') as exception_id \gset
do $$ declare v_rows integer; begin update public.franchise_exceptions set status='approved',reviewer_id=auth.uid(),reviewer_role='operations',reviewed_at=now() where franchise_case_id='17171717-1717-4171-8171-171717171710'; get diagnostics v_rows=row_count; if v_rows<>0 then raise exception 'Doğrudan istisna self approval kabul edildi'; end if; end $$; reset role;
set local role authenticated; set local request.jwt.claims='{"sub":"17171717-1717-4171-8171-171717171702","app_metadata":{"franchise_role":"gm"}}';
select public.review_franchise_exception(:'exception_id',true,'Süreli ve operasyonu durdurmayan onay');
do $$ begin if not exists(select 1 from public.franchise_exceptions where franchise_case_id='17171717-1717-4171-8171-171717171710' and exception_type='opening:brand_campaign' and status='approved' and reviewer_id<>requester_id and expires_at>now()) then raise exception 'Bağımsız süreli istisna oluşmadı'; end if; end $$;
reset role; select 'PASS' as franchise_exception_acceptance; rollback;
