-- STAGING/LOCAL ONLY. Rollback-only authorization and fail-closed acceptance.
begin;
insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('fd000000-0000-4000-8000-000000000001','applicant-document@example.invalid','{}',now(),now()),
('fd000000-0000-4000-8000-000000000002','applicant-document-maker@example.invalid','{}',now(),now());
insert into public.franchise_cases(id,application_no,applicant_user_id,candidate_name,city,district,created_by)
values('fd000000-0000-4000-8000-000000000010','APP-DOC-PORTAL','fd000000-0000-4000-8000-000000000001','Sentetik Aday','Bursa','Nilüfer','fd000000-0000-4000-8000-000000000002');

set local role authenticated;
set local request.jwt.claims='{"sub":"fd000000-0000-4000-8000-000000000001","app_metadata":{"franchise_role":"applicant"}}';
do $$ begin
 perform public.register_applicant_franchise_document('fd000000-0000-4000-8000-000000000010','fd000000-0000-4000-8000-000000000010/applicant/fd000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.pdf','identity','application/pdf',100);
 raise exception 'missing storage object unexpectedly registered';
exception when others then if sqlerrm not like '%Özel Storage nesnesi bulunamadı%' then raise; end if; end $$;

set local request.jwt.claims='{"sub":"fd000000-0000-4000-8000-000000000002","app_metadata":{"franchise_role":"legal"}}';
do $$ begin
 perform public.register_applicant_franchise_document('fd000000-0000-4000-8000-000000000010','fd000000-0000-4000-8000-000000000010/applicant/fd000000-0000-4000-8000-000000000001/11111111-1111-4111-8111-111111111111.pdf','identity','application/pdf',100);
 raise exception 'non-applicant role unexpectedly registered document';
exception when others then if sqlerrm not like '%aday rolü zorunludur%' then raise; end if; end $$;
reset role;
rollback;
