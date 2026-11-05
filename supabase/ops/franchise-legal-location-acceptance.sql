begin;
insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('15151515-1515-4151-8151-151515151501','legal-maker@example.invalid','{}',now(),now()),
('15151515-1515-4151-8151-151515151502','legal-checker@example.invalid','{}',now(),now()),
('15151515-1515-4151-8151-151515151503','inspector@example.invalid','{}',now(),now()),
('15151515-1515-4151-8151-151515151504','architect@example.invalid','{}',now(),now()) on conflict do nothing;
insert into public.franchise_user_scopes(auth_user_id,franchise_role,branch_ids,updated_by) values
('15151515-1515-4151-8151-151515151501','legal','{}','15151515-1515-4151-8151-151515151502'),
('15151515-1515-4151-8151-151515151502','gm','{}','15151515-1515-4151-8151-151515151502'),
('15151515-1515-4151-8151-151515151503','inspector','{}','15151515-1515-4151-8151-151515151502'),
('15151515-1515-4151-8151-151515151504','architecture','{}','15151515-1515-4151-8151-151515151502');
insert into public.franchise_cases(id,application_no,candidate_name,city,district,stage,status,created_by)
values('15151515-1515-4151-8151-151515151510','APP-LEGAL-UAT','Sentetik Hukuk Adayı','Bursa','Nilüfer',7,'approved','15151515-1515-4151-8151-151515151502');
insert into public.franchise_due_diligence_reviews(id,franchise_case_id,checklist_version,risk_level,status,evidence_sha256,maker_id)
values('15151515-1515-4151-8151-151515151511','15151515-1515-4151-8151-151515151510','DD-2026.1','low','submitted',repeat('a',64),'15151515-1515-4151-8151-151515151501');
insert into public.franchise_territory_protections(id,franchise_case_id,protection_type,city,district,status,maker_id)
values('15151515-1515-4151-8151-151515151512','15151515-1515-4151-8151-151515151510','district','Bursa','Nilüfer','submitted','15151515-1515-4151-8151-151515151501');
insert into public.franchise_contracts(id,franchise_case_id,contract_no,template_version,signature_method,signature_provider,provider_request_reference,provider_status,signed_at,evidence_sha256,status,maker_id)
values('15151515-1515-4151-8151-151515151513','15151515-1515-4151-8151-151515151510','CON-LEGAL-UAT','2026.1','esign','provider-pending-selection','ESIGN-UAT','completed',now(),repeat('b',64),'submitted','15151515-1515-4151-8151-151515151501');
insert into public.franchise_site_visits(id,franchise_case_id,visited_at,latitude,longitude,photo_count,measurements,evidence_sha256,status,inspector_id)
values('15151515-1515-4151-8151-151515151514','15151515-1515-4151-8151-151515151510',now(),40.213,28.984,4,'{"gross_area_m2":850,"work_bay_count":6,"ceiling_height_m":4.5}',repeat('c',64),'submitted','15151515-1515-4151-8151-151515151503');

set local role authenticated; set local request.jwt.claims='{"sub":"15151515-1515-4151-8151-151515151501","app_metadata":{"franchise_role":"legal"}}';
do $$ begin begin perform public.review_franchise_legal_record('contract','15151515-1515-4151-8151-151515151513',true,'self'); raise exception 'Kendi hukuk kaydını onayladı'; exception when others then if sqlerrm not like 'Kaydı oluşturan%' then raise; end if; end; end $$;
do $$ begin begin update public.franchise_contracts set status='approved',checker_id=auth.uid(),reviewed_at=now() where id='15151515-1515-4151-8151-151515151513'; raise exception 'Doğrudan tablo güncellemesi maker-checker kontrolünü aştı'; exception when others then if sqlerrm not like 'Bağımsız kontrolör%' then raise; end if; end; end $$;
reset role;
set local role authenticated; set local request.jwt.claims='{"sub":"15151515-1515-4151-8151-151515151502","app_metadata":{"franchise_role":"gm"}}';
select public.review_franchise_legal_record('due_diligence','15151515-1515-4151-8151-151515151511',true,'Risk kabul');
select public.review_franchise_legal_record('territory','15151515-1515-4151-8151-151515151512',true,'Bölge uygun');
select public.review_franchise_legal_record('contract','15151515-1515-4151-8151-151515151513',true,'İmza doğrulandı');
reset role;
set local role authenticated; set local request.jwt.claims='{"sub":"15151515-1515-4151-8151-151515151504","app_metadata":{"franchise_role":"architecture"}}';
select public.review_franchise_legal_record('site_visit','15151515-1515-4151-8151-151515151514',true,'Ölçüm ve fotoğraflar uygun');
reset role;
set local role authenticated; set local request.jwt.claims='{"sub":"15151515-1515-4151-8151-151515151502","app_metadata":{"franchise_role":"gm"}}';
do $$ begin if not public.franchise_legal_location_ready('15151515-1515-4151-8151-151515151510') then raise exception 'Hukuk/lokasyon kapısı açılmadı'; end if; end $$;
reset role;
select 'PASS' as franchise_legal_location_acceptance;
rollback;
