-- STAGING/LOCAL ONLY. Runs inside a rollback-only transaction with synthetic identities.
begin;

insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('fb000000-0000-4000-8000-000000000001','public-canonical-maker@example.invalid','{}',now(),now()),
('fb000000-0000-4000-8000-000000000002','public-canonical-applicant@example.invalid','{}',now(),now());

insert into public.public_franchise_applications(
  id,full_name,phone,province,district,kvkk_consent,processing_consent,contact_consent,consent_version,payload,request_meta
) values (
  'fb000000-0000-4000-8000-000000000010','SENTETIK HAM AD','00000000000','Bursa','Nilüfer',true,true,false,'FR-KVKK-2026-11','{}','{}'
);

set local role authenticated;
set local request.jwt.claims='{"sub":"fb000000-0000-4000-8000-000000000001","app_metadata":{"franchise_role":"franchise_specialist"}}';

select public.canonicalize_public_franchise_application(
  'fb000000-0000-4000-8000-000000000010','fb000000-0000-4000-8000-000000000002','Sentetik Aday Şirketi','CONTACT-REF-PUBLIC',
  '5m_10m','3m_7m',5::smallint,'automotive','limited','candidate_found','single','IDENTITY-VERIFY-PUBLIC','FIN-DOC-PUBLIC'
) is not null as ready_application_canonicalized;

select status='canonicalized' and canonical_case_id is not null and canonicalized_by='fb000000-0000-4000-8000-000000000001'
  and canonicalized_at is not null as bridge_has_maker_audit
from public.franchise_public_intake_bridge where source_application_id='fb000000-0000-4000-8000-000000000010';

select count(*)=1 as one_canonical_case
from public.franchise_application_intakes where source_reference='PUBLIC-WEB-fb000000-0000-4000-8000-000000000010';
select count(*)=3 as three_consent_receipts
from public.franchise_consent_receipts where franchise_case_id=(select canonical_case_id from public.franchise_public_intake_bridge where source_application_id='fb000000-0000-4000-8000-000000000010');
select count(*)=0 as raw_public_payload_not_copied
from public.franchise_application_profiles where contact_reference='SENTETIK HAM AD';

select public.canonicalize_public_franchise_application(
  'fb000000-0000-4000-8000-000000000010','fb000000-0000-4000-8000-000000000002','Sentetik Aday Şirketi','CONTACT-REF-PUBLIC',
  '5m_10m','3m_7m',5::smallint,'automotive','limited','candidate_found','single','IDENTITY-VERIFY-PUBLIC','FIN-DOC-PUBLIC'
)=(select canonical_case_id from public.franchise_public_intake_bridge where source_application_id='fb000000-0000-4000-8000-000000000010') as retry_is_idempotent;

reset role;
rollback;
