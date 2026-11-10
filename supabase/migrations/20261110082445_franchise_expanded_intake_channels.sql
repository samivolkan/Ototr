begin;

-- Version matches the hosted ototr-staging migration history entry.

create table if not exists public.franchise_intake_channel_catalog (
  channel_code text primary key check (channel_code ~ '^[a-z][a-z0-9_]{1,39}$'),
  label text not null check (length(trim(label)) between 2 and 80),
  capture_mode text not null check (capture_mode in ('public_form','manual_entry','external_reference','campaign_reference','batch_reference')),
  phase3_automation_target boolean not null default false,
  active boolean not null default true,
  display_order smallint not null unique check (display_order between 1 and 100)
);

insert into public.franchise_intake_channel_catalog(channel_code,label,capture_mode,phase3_automation_target,display_order) values
('web','Web','public_form',true,1),
('gm','GM Manuel','manual_entry',false,2),
('crm','CRM','external_reference',true,3),
('reference','Referans','manual_entry',false,4),
('social','Sosyal Medya','external_reference',true,5),
('call_center','Çağrı Merkezi','external_reference',true,6),
('event_qr','Fuar / QR','campaign_reference',true,7),
('field_team','Saha Ekibi','manual_entry',true,8),
('corporate_partner','Kurumsal İş Ortağı','external_reference',true,9),
('bulk_import','Toplu Aktarım','batch_reference',true,10)
on conflict(channel_code) do update set
  label=excluded.label,
  capture_mode=excluded.capture_mode,
  phase3_automation_target=excluded.phase3_automation_target,
  active=true,
  display_order=excluded.display_order;

alter table public.franchise_intake_channel_catalog enable row level security;
revoke all on public.franchise_intake_channel_catalog from anon,authenticated;
grant select on public.franchise_intake_channel_catalog to authenticated;
grant all on public.franchise_intake_channel_catalog to service_role;
drop policy if exists franchise_intake_channel_catalog_select on public.franchise_intake_channel_catalog;
create policy franchise_intake_channel_catalog_select on public.franchise_intake_channel_catalog
for select to authenticated using (active=true);

alter table public.franchise_application_intakes
  drop constraint if exists franchise_application_intakes_channel_check;
alter table public.franchise_application_intakes
  add constraint franchise_application_intakes_channel_check
  check (channel in ('web','gm','crm','reference','social','call_center','event_qr','field_team','corporate_partner','bulk_import'));

alter table public.franchise_consent_receipts
  drop constraint if exists franchise_consent_receipts_source_check;
alter table public.franchise_consent_receipts
  add constraint franchise_consent_receipts_source_check
  check (source in ('web','gm','crm','reference','social','call_center','event_qr','field_team','corporate_partner','bulk_import','portal'));

create or replace function public.franchise_consents_ready(p_case_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with latest as (
    select distinct on (purpose) purpose,status
    from public.franchise_consent_receipts
    where franchise_case_id=p_case_id and captured_at<=now()
    order by purpose,captured_at desc,created_at desc
  )
  select count(*)=3 and bool_and(
    case when purpose in ('privacy_notice','data_processing') then status='granted'
         else status in ('granted','withdrawn') end
  ) from latest
$$;

create or replace function public.submit_franchise_application(
  p_channel text,p_source_reference text,p_idempotency_key text,p_applicant_user_id uuid,p_candidate_name text,p_city text,p_district text,
  p_contact_reference text,p_budget_band text,p_equity_band text,p_management_experience_years smallint,p_sector_experience text,
  p_company_status text,p_location_status text,p_partnership_structure text,p_identity_verification_ref text,p_financial_document_ref text,
  p_notice_version text,p_privacy_evidence_sha256 text,p_processing_evidence_sha256 text,p_commercial_evidence_sha256 text,p_commercial_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_case_id uuid; v_role text:=public.franchise_claim_role(); v_actor uuid:=auth.uid(); v_consent_count smallint:=3;
begin
  if v_actor is null then raise exception 'Kimliği doğrulanmış başvuru oturumu zorunludur'; end if;
  if not exists(select 1 from public.franchise_intake_channel_catalog where channel_code=p_channel and active=true) then raise exception 'Geçersiz başvuru kanalı'; end if;
  if p_channel='bulk_import' and p_source_reference !~ '^BATCH-[A-Za-z0-9._:-]{3,113}$' then raise exception 'Toplu aktarım için BATCH- kaynak referansı zorunludur'; end if;
  if v_role='applicant' and (p_channel<>'web' or p_applicant_user_id<>v_actor) then raise exception 'Aday yalnız kendi web başvurusunu oluşturabilir'; end if;
  if v_role not in ('applicant','gm','franchise_director','franchise_specialist') then raise exception 'Başvuru oluşturma rolü yetkili değil'; end if;
  if p_privacy_evidence_sha256 !~ '^[a-f0-9]{64}$' or p_processing_evidence_sha256 !~ '^[a-f0-9]{64}$' or p_commercial_evidence_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Her izin için ayrı SHA-256 kanıtı zorunludur'; end if;
  if p_identity_verification_ref ~ '^[0-9]{11}$' then raise exception 'T.C. kimlik numarası doğrudan saklanamaz; doğrulama referansı kullanılmalıdır'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key,0));
  select franchise_case_id into v_case_id from public.franchise_application_intakes where idempotency_key=p_idempotency_key;
  if found then return v_case_id; end if;
  insert into public.franchise_cases(application_no,applicant_user_id,candidate_name,city,district,consent_count,created_by)
  values('APP-'||upper(substr(md5(p_idempotency_key),1,12)),p_applicant_user_id,trim(p_candidate_name),trim(p_city),trim(p_district),v_consent_count,v_actor) returning id into v_case_id;
  insert into public.franchise_application_intakes(franchise_case_id,channel,source_reference,idempotency_key,applicant_user_id,submitted_by)
  values(v_case_id,p_channel,trim(p_source_reference),trim(p_idempotency_key),p_applicant_user_id,v_actor);
  insert into public.franchise_application_profiles(franchise_case_id,contact_reference,budget_band,equity_band,management_experience_years,sector_experience,company_status,location_status,partnership_structure,identity_verification_ref,financial_document_ref)
  values(v_case_id,trim(p_contact_reference),p_budget_band,p_equity_band,p_management_experience_years,p_sector_experience,p_company_status,p_location_status,p_partnership_structure,trim(p_identity_verification_ref),trim(p_financial_document_ref));
  insert into public.franchise_consent_receipts(franchise_case_id,subject_id,purpose,status,notice_version,source,evidence_sha256,withdrawn_at) values
  (v_case_id,p_applicant_user_id,'privacy_notice','granted',p_notice_version,p_channel,p_privacy_evidence_sha256,null),
  (v_case_id,p_applicant_user_id,'data_processing','granted',p_notice_version,p_channel,p_processing_evidence_sha256,null),
  (v_case_id,p_applicant_user_id,'commercial_communication',case when p_commercial_consent then 'granted' else 'withdrawn' end,p_notice_version,p_channel,p_commercial_evidence_sha256,case when p_commercial_consent then null else now() end);
  return v_case_id;
end;
$$;

update public.franchise_uat_scenarios
set title='On kanaldan sentetik başvuru', expected_result='Tekil dosya, güvenli kaynak referansı ve üç ayrı izin makbuzu'
where scenario_code='UAT-01';

commit;
