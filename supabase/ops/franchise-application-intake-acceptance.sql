-- STAGING/LOCAL ONLY. Six-channel idempotent application intake and separate consent receipts.
begin;
insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('fa000000-0000-4000-8000-000000000001','intake-gm@example.invalid','{}',now(),now()),
('fa000000-0000-4000-8000-000000000011','intake-web@example.invalid','{}',now(),now()),
('fa000000-0000-4000-8000-000000000012','intake-gm-manual@example.invalid','{}',now(),now()),
('fa000000-0000-4000-8000-000000000013','intake-crm@example.invalid','{}',now(),now()),
('fa000000-0000-4000-8000-000000000014','intake-reference@example.invalid','{}',now(),now()),
('fa000000-0000-4000-8000-000000000015','intake-social@example.invalid','{}',now(),now()),
('fa000000-0000-4000-8000-000000000016','intake-call-center@example.invalid','{}',now(),now());

set local role authenticated;
set local request.jwt.claims='{"sub":"fa000000-0000-4000-8000-000000000001","app_metadata":{"franchise_role":"gm"}}';
do $$ declare v_channel text; v_index int:=0; v_user uuid; v_case uuid; begin
  foreach v_channel in array array['web','gm','crm','reference','social','call_center'] loop
    v_index:=v_index+1;
    v_user:=('fa000000-0000-4000-8000-'||lpad((10+v_index)::text,12,'0'))::uuid;
    v_case:=public.submit_franchise_application(
      v_channel,'LEAD-'||upper(v_channel),'IDEMPOTENCY-'||upper(v_channel),v_user,'Sentetik Aday '||v_index,'Bursa','Nilüfer',
      'CONTACT-REF-'||v_index,'5m_10m','3m_7m',5::smallint,'automotive','limited','candidate_found','single',
      'IDENTITY-VERIFY-'||v_index,'FIN-DOC-'||v_index,'2026.11',
      md5(v_channel||'-privacy')||md5(v_channel||'-privacy'),md5(v_channel||'-processing')||md5(v_channel||'-processing'),md5(v_channel||'-commercial')||md5(v_channel||'-commercial'),v_channel<>'social');
    if v_case is null then raise exception 'case not created'; end if;
  end loop;
end $$;

select count(*)=6 as six_channels_created from public.franchise_application_intakes;
select count(distinct franchise_case_id)=6 as six_canonical_cases_created from public.franchise_application_intakes;
select count(*)=6 as six_profiles_created from public.franchise_application_profiles;
select count(*)=18 as three_separate_receipts_per_application from public.franchise_consent_receipts;
select count(*)=1 as declined_commercial_consent_is_separate from public.franchise_consent_receipts where purpose='commercial_communication' and status='withdrawn';
select bool_and(raw_payload_retained=false) as raw_lead_payload_not_retained from public.franchise_application_intakes;

select public.submit_franchise_application(
  'web','LEAD-WEB','IDEMPOTENCY-WEB','fa000000-0000-4000-8000-000000000011','Tekrar Sentetik Aday','Bursa','Nilüfer','CONTACT-REF-1',
  '5m_10m','3m_7m',5::smallint,'automotive','limited','candidate_found','single','IDENTITY-VERIFY-1','FIN-DOC-1','2026.11',repeat('a',64),repeat('b',64),repeat('c',64),true)
  =(select franchise_case_id from public.franchise_application_intakes where channel='web') as retry_returns_same_case;
select count(*)=6 as retry_does_not_duplicate_case from public.franchise_cases where application_no like 'APP-%';

do $$ begin
  begin perform public.submit_franchise_application('gm','LEAD-TCKN','IDEMPOTENCY-TCKN','fa000000-0000-4000-8000-000000000011','Sentetik TCKN Denemesi','Bursa','Nilüfer','CONTACT-REF-X','5m_10m','3m_7m',5::smallint,'automotive','limited','candidate_found','single','12345678901','FIN-DOC-X','2026.11',repeat('a',64),repeat('b',64),repeat('c',64),true); raise exception 'raw tckn accepted';
  exception when others then if sqlerrm not like 'T.C. kimlik numarası doğrudan saklanamaz%' then raise; end if; end;
end $$;

set local request.jwt.claims='{"sub":"fa000000-0000-4000-8000-000000000011","app_metadata":{"franchise_role":"applicant"}}';
select count(*)=1 as applicant_sees_only_own_intake from public.franchise_application_intakes;
select count(*)=1 as applicant_sees_only_own_profile from public.franchise_application_profiles;
select count(*)=3 as applicant_sees_only_own_consent_receipts from public.franchise_consent_receipts;
do $$ begin
  begin perform public.submit_franchise_application('crm','LEAD-UNAUTHORIZED','IDEMPOTENCY-UNAUTHORIZED','fa000000-0000-4000-8000-000000000011','Yetkisiz Kanal','Bursa','Nilüfer','CONTACT-REF-X','5m_10m','3m_7m',5::smallint,'automotive','limited','candidate_found','single','IDENTITY-VERIFY-X','FIN-DOC-X','2026.11',repeat('a',64),repeat('b',64),repeat('c',64),true); raise exception 'applicant created crm lead';
  exception when others then if sqlerrm not like 'Aday yalnız kendi web başvurusunu%' then raise; end if; end;
end $$;
reset role;
rollback;
