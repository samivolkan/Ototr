-- Align UAT governance with the single-responsible organization model.
-- Existing signatures are retained under their canonical responsible titles.

alter table public.franchise_uat_signoff_catalog
  drop constraint franchise_uat_signoff_catalog_sequence_no_key;

insert into public.franchise_uat_signoff_catalog(signoff_role,authorized_roles,required_scenarios,sequence_no)
select mapped.new_role,c.authorized_roles,c.required_scenarios,c.sequence_no
from public.franchise_uat_signoff_catalog c
join (values
  ('Franchise Yönetimi','Franchise Sorumlusu'),
  ('Finans Direktörü','Finans Sorumlusu'),
  ('İK Yöneticisi','İK Sorumlusu'),
  ('Academy Yöneticisi','Academy Sorumlusu'),
  ('CEO/Yönetim','Genel Müdür')
) as mapped(old_role,new_role) on mapped.old_role=c.signoff_role
on conflict (signoff_role) do update set
  authorized_roles=excluded.authorized_roles,
  required_scenarios=excluded.required_scenarios,
  sequence_no=excluded.sequence_no;

update public.franchise_uat_signoffs s
set signoff_role=mapped.new_role
from (values
  ('Franchise Yönetimi','Franchise Sorumlusu'),
  ('Finans Direktörü','Finans Sorumlusu'),
  ('İK Yöneticisi','İK Sorumlusu'),
  ('Academy Yöneticisi','Academy Sorumlusu'),
  ('CEO/Yönetim','Genel Müdür')
) as mapped(old_role,new_role)
where s.signoff_role=mapped.old_role;

delete from public.franchise_uat_signoff_catalog
where signoff_role in ('Franchise Yönetimi','Finans Direktörü','İK Yöneticisi','Academy Yöneticisi','CEO/Yönetim');

alter table public.franchise_uat_signoff_catalog
  add constraint franchise_uat_signoff_catalog_sequence_no_key unique(sequence_no);

drop policy if exists franchise_uat_signoff_insert on public.franchise_uat_signoffs;
create policy franchise_uat_signoff_insert on public.franchise_uat_signoffs for insert to authenticated
with check (
  signer_id=(select auth.uid()) and signer_role=public.franchise_claim_role()
  and exists(select 1 from public.franchise_uat_signoff_catalog c where c.signoff_role=franchise_uat_signoffs.signoff_role and public.franchise_claim_role()=any(c.authorized_roles))
  and not exists(
    select 1 from public.franchise_uat_signoff_catalog c
    cross join unnest(c.required_scenarios) required_code
    where c.signoff_role=franchise_uat_signoffs.signoff_role
      and not exists(
        select 1 from public.franchise_uat_results r
        where r.release_candidate=franchise_uat_signoffs.release_candidate
          and r.scenario_code=required_code and r.status='approved'
          and r.executor_id<>franchise_uat_signoffs.signer_id
      )
  )
  and (
    franchise_uat_signoffs.signoff_role<>'Genel Müdür'
    or (select count(*) from public.franchise_uat_signoffs x where x.release_candidate=franchise_uat_signoffs.release_candidate and x.decision='approved')=8
  )
);

create or replace function app_private.sign_franchise_uat_release(
  p_release_candidate text,p_signoff_role text,p_evidence_sha256 text,p_decision text,p_note text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_id uuid; v_role text; v_catalog public.franchise_uat_signoff_catalog%rowtype;
begin
  v_role:=public.franchise_claim_role();
  if auth.uid() is null then raise exception 'UAT imzası için ERP oturumu zorunludur'; end if;
  if p_release_candidate !~ '^[a-zA-Z0-9._-]{3,100}$' then raise exception 'Release adayı geçersiz'; end if;
  if p_evidence_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'SHA-256 kanıtı zorunludur'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'İmza kararı geçersiz'; end if;
  if length(trim(coalesce(p_note,''))) not between 10 and 2000 then raise exception 'İmza notu 10-2000 karakter olmalıdır'; end if;
  select * into v_catalog from public.franchise_uat_signoff_catalog where signoff_role=p_signoff_role;
  if not found or not v_role=any(v_catalog.authorized_roles) then raise exception 'Rol bu departman imzasını veremez'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_release_candidate||':signoff',0));
  if exists(select 1 from public.franchise_uat_signoffs where release_candidate=p_release_candidate and (signoff_role=p_signoff_role or signer_id=auth.uid())) then
    raise exception 'Departman veya imzalayan kişi için mükerrer imza';
  end if;
  if exists(
    select 1 from unnest(v_catalog.required_scenarios) required_code
    where not exists(select 1 from public.franchise_uat_results r where r.release_candidate=p_release_candidate and r.scenario_code=required_code and r.status='approved' and r.executor_id<>auth.uid())
  ) then raise exception 'İmza için gereken bağımsız UAT senaryoları tamamlanmadı'; end if;
  if p_signoff_role='Genel Müdür' and (select count(*) from public.franchise_uat_signoffs where release_candidate=p_release_candidate and decision='approved')<>8 then
    raise exception 'Genel Müdür imzası diğer sekiz onaydan sonra verilebilir';
  end if;
  insert into public.franchise_uat_signoffs(release_candidate,signoff_role,signer_id,signer_role,evidence_sha256,decision,note)
  values(p_release_candidate,p_signoff_role,auth.uid(),v_role,p_evidence_sha256,p_decision,trim(p_note)) returning id into v_id;
  return v_id;
end $$;

revoke all on function app_private.sign_franchise_uat_release(text,text,text,text,text) from public,anon;
grant execute on function app_private.sign_franchise_uat_release(text,text,text,text,text) to authenticated;
