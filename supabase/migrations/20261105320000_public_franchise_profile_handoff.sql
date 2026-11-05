alter table public.public_franchise_applications
  add column equity_band text,
  add column management_experience_years smallint,
  add column sector_experience text,
  add column company_status text,
  add column partnership_structure text,
  add constraint public_franchise_management_experience_check
    check (management_experience_years is null or management_experience_years between 0 and 80),
  add constraint public_franchise_equity_band_check
    check (equity_band is null or equity_band in ('under_3m','3m_7m','7m_15m','over_15m')),
  add constraint public_franchise_sector_experience_check
    check (sector_experience is null or sector_experience in ('none','automotive','service','retail','multi_sector')),
  add constraint public_franchise_company_status_check
    check (company_status is null or company_status in ('none','sole_proprietor','limited','joint_stock','other')),
  add constraint public_franchise_partnership_structure_check
    check (partnership_structure is null or partnership_structure in ('single','family','corporate','multi_partner'));

drop function if exists public.list_public_franchise_intake_queue();
drop function if exists app_private.list_public_franchise_intake_queue();

create function app_private.list_public_franchise_intake_queue()
returns table(
  source_application_id uuid,status text,reason_code text,consent_version text,
  commercial_consent_declared boolean,captured_at timestamptz,province text,district text,source text,submitted_at timestamptz,
  application_type text,budget_band text,equity_band text,management_experience_years smallint,
  sector_experience text,company_status text,location_status text,partnership_structure text,region text
)
language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid(); v_role text:=public.franchise_claim_role();
begin
  if v_actor is null then raise exception 'Kimliği doğrulanmış Franchise kullanıcısı zorunludur'; end if;
  if v_role not in ('gm','franchise_director','franchise_specialist') then raise exception 'Web başvuru kuyruğu rolü yetkili değil'; end if;
  return query
  select b.source_application_id,b.status,b.reason_code,b.consent_version,b.commercial_consent_declared,b.captured_at,
         a.province,a.district,a.source,a.created_at,a.application_type,a.budget,a.equity_band,a.management_experience_years,
         a.sector_experience,a.company_status,a.has_location,a.partnership_structure,a.region
  from public.franchise_public_intake_bridge b
  join public.public_franchise_applications a on a.id=b.source_application_id
  where b.status in ('awaiting_processing_consent','ready_for_canonicalization','rejected_missing_privacy')
  order by b.captured_at asc,b.source_application_id;
end;
$$;

revoke execute on function app_private.list_public_franchise_intake_queue() from public,anon;
grant execute on function app_private.list_public_franchise_intake_queue() to authenticated;

create function public.list_public_franchise_intake_queue()
returns table(
  source_application_id uuid,status text,reason_code text,consent_version text,
  commercial_consent_declared boolean,captured_at timestamptz,province text,district text,source text,submitted_at timestamptz,
  application_type text,budget_band text,equity_band text,management_experience_years smallint,
  sector_experience text,company_status text,location_status text,partnership_structure text,region text
)
language sql security invoker set search_path=''
as $$ select * from app_private.list_public_franchise_intake_queue(); $$;

revoke execute on function public.list_public_franchise_intake_queue() from public,anon;
grant execute on function public.list_public_franchise_intake_queue() to authenticated;
