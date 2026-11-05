begin;

create table if not exists public.franchise_application_intakes (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null unique references public.franchise_cases(id) on delete cascade,
  channel text not null check (channel in ('web','gm','crm','reference','social','call_center')),
  source_reference text not null check (source_reference ~ '^[A-Za-z0-9._:-]{3,120}$'),
  idempotency_key text not null unique check (idempotency_key ~ '^[A-Za-z0-9._:-]{8,120}$'),
  applicant_user_id uuid not null references auth.users(id) on delete restrict,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  raw_payload_retained boolean not null default false check (raw_payload_retained=false),
  created_at timestamptz not null default now()
);

create table if not exists public.franchise_application_profiles (
  franchise_case_id uuid primary key references public.franchise_cases(id) on delete cascade,
  contact_reference text not null check (contact_reference ~ '^[A-Za-z0-9._:-]{3,120}$'),
  budget_band text not null check (budget_band in ('under_5m','5m_10m','10m_20m','over_20m')),
  equity_band text not null check (equity_band in ('under_3m','3m_7m','7m_15m','over_15m')),
  management_experience_years smallint not null check (management_experience_years between 0 and 60),
  sector_experience text not null check (sector_experience in ('none','automotive','service','retail','multi_sector')),
  company_status text not null check (company_status in ('none','sole_proprietor','limited','joint_stock','other')),
  location_status text not null check (location_status in ('none','searching','candidate_found','owned','leased')),
  partnership_structure text not null check (partnership_structure in ('single','family','corporate','multi_partner')),
  identity_verification_ref text not null check (identity_verification_ref ~ '^[A-Za-z0-9._:-]{3,120}$' and identity_verification_ref !~ '^[0-9]{11}$'),
  financial_document_ref text not null check (financial_document_ref ~ '^[A-Za-z0-9._:-]{3,120}$'),
  created_at timestamptz not null default now()
);

create index if not exists franchise_intake_channel_idx on public.franchise_application_intakes(channel,created_at desc);
alter table public.franchise_application_intakes enable row level security;
alter table public.franchise_application_profiles enable row level security;
revoke all on public.franchise_application_intakes,public.franchise_application_profiles from anon,authenticated;
grant select on public.franchise_application_intakes,public.franchise_application_profiles to authenticated;
grant all on public.franchise_application_intakes,public.franchise_application_profiles to service_role;

create policy franchise_intake_select on public.franchise_application_intakes for select to authenticated using (
  applicant_user_id=(select auth.uid()) or public.franchise_claim_role() in ('gm','franchise_director','franchise_specialist')
);
create policy franchise_application_profile_select on public.franchise_application_profiles for select to authenticated using (
  exists(select 1 from public.franchise_cases c where c.id=franchise_case_id and (c.applicant_user_id=(select auth.uid()) or public.franchise_claim_role() in ('gm','franchise_director','franchise_specialist')))
);

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
declare v_case_id uuid; v_role text:=public.franchise_claim_role(); v_actor uuid:=auth.uid(); v_consent_count smallint:=case when p_commercial_consent then 3 else 2 end;
begin
  if v_actor is null then raise exception 'Kimliği doğrulanmış başvuru oturumu zorunludur'; end if;
  if p_channel not in ('web','gm','crm','reference','social','call_center') then raise exception 'Geçersiz başvuru kanalı'; end if;
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

revoke all on function public.submit_franchise_application(text,text,text,uuid,text,text,text,text,text,text,smallint,text,text,text,text,text,text,text,text,text,text,boolean) from public,anon;
grant execute on function public.submit_franchise_application(text,text,text,uuid,text,text,text,text,text,text,smallint,text,text,text,text,text,text,text,text,text,text,boolean) to authenticated;

commit;
