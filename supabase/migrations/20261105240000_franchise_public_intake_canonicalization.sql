begin;

alter table public.franchise_public_intake_bridge
  add column if not exists canonicalized_by uuid references auth.users(id) on delete restrict,
  add column if not exists canonicalized_at timestamptz,
  add constraint franchise_public_intake_canonical_audit_check check (
    (status='canonicalized')=(canonicalized_by is not null and canonicalized_at is not null)
  );

drop policy if exists franchise_public_intake_bridge_update on public.franchise_public_intake_bridge;
revoke update on public.franchise_public_intake_bridge from authenticated;

create or replace function public.canonicalize_public_franchise_application(
  p_source_application_id uuid,
  p_applicant_user_id uuid,
  p_candidate_name text,
  p_contact_reference text,
  p_budget_band text,
  p_equity_band text,
  p_management_experience_years smallint,
  p_sector_experience text,
  p_company_status text,
  p_location_status text,
  p_partnership_structure text,
  p_identity_verification_ref text,
  p_financial_document_ref text
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := public.franchise_claim_role();
  v_bridge public.franchise_public_intake_bridge%rowtype;
  v_source public.public_franchise_applications%rowtype;
  v_case_id uuid;
begin
  if v_actor is null then raise exception 'Kimliği doğrulanmış Franchise kullanıcısı zorunludur'; end if;
  if v_role not in ('gm','franchise_director','franchise_specialist') then raise exception 'Web başvurusu kanonikleştirme rolü yetkili değil'; end if;

  select * into v_bridge
  from public.franchise_public_intake_bridge
  where source_application_id=p_source_application_id
  for update;
  if not found then raise exception 'Web başvurusu bridge kaydı bulunamadı'; end if;
  if v_bridge.status='canonicalized' then return v_bridge.canonical_case_id; end if;
  if v_bridge.status<>'ready_for_canonicalization' then raise exception 'Web başvurusu kanonikleştirmeye hazır değil: %',v_bridge.status; end if;

  select * into strict v_source
  from public.public_franchise_applications
  where id=p_source_application_id;
  if not v_source.kvkk_consent or v_source.processing_consent is not true then raise exception 'Zorunlu izinler doğrulanamadı'; end if;
  if nullif(trim(v_source.consent_version),'') is null
     or v_source.privacy_evidence_sha256 !~ '^[0-9a-f]{64}$'
     or v_source.processing_evidence_sha256 !~ '^[0-9a-f]{64}$'
     or v_source.commercial_evidence_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'Sunucuya bağlı üç izin kanıtı doğrulanamadı';
  end if;
  if not exists(select 1 from auth.users where id=p_applicant_user_id) then raise exception 'Aday portal kullanıcısı bulunamadı'; end if;
  if length(trim(coalesce(p_candidate_name,'')))<3 then raise exception 'Normalize aday/şirket adı zorunludur'; end if;

  v_case_id:=public.submit_franchise_application(
    'web',
    'PUBLIC-WEB-'||p_source_application_id::text,
    'PUBLIC-WEB-'||p_source_application_id::text,
    p_applicant_user_id,
    trim(p_candidate_name),
    trim(v_source.province),
    trim(v_source.district),
    p_contact_reference,
    p_budget_band,
    p_equity_band,
    p_management_experience_years,
    p_sector_experience,
    p_company_status,
    p_location_status,
    p_partnership_structure,
    p_identity_verification_ref,
    p_financial_document_ref,
    v_source.consent_version,
    v_source.privacy_evidence_sha256,
    v_source.processing_evidence_sha256,
    v_source.commercial_evidence_sha256,
    v_source.contact_consent
  );

  update public.franchise_public_intake_bridge
  set status='canonicalized',reason_code='CANONICALIZED_BY_OPERATOR',canonical_case_id=v_case_id,
      canonicalized_by=v_actor,canonicalized_at=statement_timestamp(),updated_at=statement_timestamp()
  where source_application_id=p_source_application_id;
  return v_case_id;
end;
$$;

revoke execute on function public.canonicalize_public_franchise_application(uuid,uuid,text,text,text,text,smallint,text,text,text,text,text,text) from public,anon;
grant execute on function public.canonicalize_public_franchise_application(uuid,uuid,text,text,text,text,smallint,text,text,text,text,text,text) to authenticated;

comment on function public.canonicalize_public_franchise_application(uuid,uuid,text,text,text,text,smallint,text,text,text,text,text,text) is
'Üç ayrı sunucu bağlı izin kanıtı hazır olan public web başvurusunu yetkili maker ile idempotent kanonik Franchise dosyasına dönüştürür; ham payload kopyalamaz.';

commit;
