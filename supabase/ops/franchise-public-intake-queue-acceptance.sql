-- STAGING/LOCAL ONLY. Rollback-only, synthetic queue authorization and privacy acceptance.
begin;
insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('fc000000-0000-4000-8000-000000000001','public-queue-maker@example.invalid','{}',now(),now());
insert into public.public_franchise_applications(
 id,full_name,phone,province,district,source,kvkk_consent,processing_consent,contact_consent,consent_version,payload,request_meta
) values
('fc000000-0000-4000-8000-000000000010','SENTETIK GIZLI AD','00000000000','Bursa','Nilüfer','web',true,true,false,'FR-KVKK-2026-11','{}','{}'),
('fc000000-0000-4000-8000-000000000011','SENTETIK ESKI AD','00000000001','Ankara','Çankaya','web',true,null,false,'FR-KVKK-2026-11','{}','{}');

set local role authenticated;
set local request.jwt.claims='{"sub":"fc000000-0000-4000-8000-000000000001","app_metadata":{"franchise_role":"franchise_specialist"}}';
select count(*)=2 as authorized_role_sees_two_open_rows from public.list_public_franchise_intake_queue();
select count(*)=1 as ready_row_visible from public.list_public_franchise_intake_queue() where status='ready_for_canonicalization';
select count(*)=1 as incomplete_processing_consent_stays_locked from public.list_public_franchise_intake_queue() where status='awaiting_processing_consent';

set local request.jwt.claims='{"sub":"fc000000-0000-4000-8000-000000000001","app_metadata":{"franchise_role":"legal"}}';
do $$ begin
 perform * from public.list_public_franchise_intake_queue();
 raise exception 'unauthorized role unexpectedly read queue';
exception when insufficient_privilege then null; when others then
 if sqlerrm not like '%rolü yetkili değil%' then raise; end if;
end $$;
reset role;
rollback;
