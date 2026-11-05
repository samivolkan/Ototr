begin;

create table if not exists public.franchise_document_requirements (
  branch_type text not null,
  document_code text not null,
  label text not null,
  category text not null check (category in ('identity','financial','legal','location','employment','certificate','other')),
  minimum_count smallint not null default 1 check (minimum_count > 0),
  is_active boolean not null default true,
  primary key(branch_type,document_code)
);

insert into public.franchise_document_requirements(branch_type,document_code,label,category) values
('standard','identity_copy','Kimlik belgesi','identity'),
('standard','tax_certificate','Vergi levhası','legal'),
('standard','signature_circular','İmza sirküleri','legal'),
('standard','trade_registry','Ticaret sicil gazetesi','legal'),
('standard','articles_of_association','Şirket ana sözleşmesi','legal'),
('standard','activity_certificate','Faaliyet belgesi','legal'),
('standard','partnership_structure','Ortaklık yapısı','legal'),
('standard','financial_statement','Finansal tablo','financial'),
('standard','source_of_funds','Öz kaynak kanıtı','financial'),
('standard','bank_reference','Banka referansı','financial'),
('standard','location_title_or_lease','Tapu veya kira sözleşmesi','location'),
('standard','site_photos','Lokasyon fotoğrafları','location'),
('standard','measurement_plan','Ölçüm ve yerleşim planı','location'),
('standard','zoning_status','İmar ve kullanım uygunluğu','location'),
('standard','insurance_plan','Sigorta planı','legal'),
('standard','reference_check','Referans ve geçmiş kontrolü','other'),
('standard','board_resolution','Şirket yetkili kurul kararı','legal')
on conflict(branch_type,document_code) do nothing;

alter table public.franchise_document_requirements enable row level security;
revoke all on public.franchise_document_requirements from anon,authenticated;
grant select on public.franchise_document_requirements to authenticated;
grant all on public.franchise_document_requirements to service_role;
create policy franchise_document_requirement_select on public.franchise_document_requirements for select to authenticated using (is_active=true);

alter table public.franchise_documents
  add column if not exists document_code text,
  add column if not exists evidence_sha256 text,
  add column if not exists status text not null default 'uploaded',
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.franchise_documents
  add constraint franchise_document_sha256_check check (evidence_sha256 is null or evidence_sha256 ~ '^[a-f0-9]{64}$'),
  add constraint franchise_document_status_check check (status in ('uploaded','approved','rejected')),
  add constraint franchise_document_approval_check check ((status='uploaded' and approved_by is null and approved_at is null) or (status in ('approved','rejected') and approved_by is not null and approved_at is not null));

create index if not exists franchise_documents_required_idx on public.franchise_documents(franchise_case_id,document_code,status);

create or replace function public.franchise_document_scope_guard()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_branch_type text;
begin
  if tg_op='INSERT' then
    select branch_type into v_branch_type from public.franchise_cases where id=new.franchise_case_id;
    if new.document_code is null or not exists(select 1 from public.franchise_document_requirements r where r.branch_type=v_branch_type and r.document_code=new.document_code and r.is_active) then
      raise exception 'Belge kodu şube tipi zorunlu belge kataloğunda bulunamadı';
    end if;
    if new.evidence_sha256 is null then raise exception 'Belge SHA-256 özeti zorunludur'; end if;
    return new;
  end if;
  if new.franchise_case_id<>old.franchise_case_id or new.storage_path<>old.storage_path or new.category<>old.category
     or new.classification<>old.classification or new.uploaded_by<>old.uploaded_by or new.mime_type<>old.mime_type
     or new.size_bytes<>old.size_bytes or new.expires_at is distinct from old.expires_at
     or new.created_at<>old.created_at or new.document_code is distinct from old.document_code
     or new.evidence_sha256 is distinct from old.evidence_sha256 then
    raise exception 'Belge kapsamı, dosyası ve SHA-256 özeti onay sırasında değiştirilemez';
  end if;
  return new;
end;
$$;

create trigger franchise_document_scope_guard_trigger
before insert or update on public.franchise_documents
for each row execute function public.franchise_document_scope_guard();

drop policy if exists franchise_document_update on public.franchise_documents;
create policy franchise_document_update on public.franchise_documents for update to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','legal'))
with check (
  (select auth.jwt() -> 'app_metadata' ->> 'franchise_role') in ('gm','franchise_director','legal')
  and status in ('approved','rejected') and approved_by=(select auth.uid()) and approved_at is not null
);

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
  select count(*)=3 and bool_and(status='granted') from latest
$$;

create or replace function public.franchise_documents_ready(p_case_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select count(*)>0 and bool_and((
    select count(*) from public.franchise_documents d
    where d.franchise_case_id=c.id and d.document_code=r.document_code and d.category=r.category
      and d.status='approved' and d.evidence_sha256 is not null and (d.expires_at is null or d.expires_at>now())
  )>=r.minimum_count)
  from public.franchise_cases c
  join public.franchise_document_requirements r on r.branch_type=c.branch_type and r.is_active
  where c.id=p_case_id
$$;

create or replace function public.franchise_branch_record_gate()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not public.franchise_consents_ready(new.franchise_case_id) then raise exception 'Güncel KVKK izin makbuzları eksik veya geri çekilmiş'; end if;
  if not public.franchise_documents_ready(new.franchise_case_id) then raise exception 'Şube tipi zorunlu belge kataloğu eksik, onaysız veya süresi geçmiş'; end if;
  return new;
end;
$$;

create trigger franchise_branch_record_gate_trigger
before insert on public.franchise_branches
for each row execute function public.franchise_branch_record_gate();

revoke all on function public.franchise_document_scope_guard() from public,anon;
revoke all on function public.franchise_consents_ready(uuid) from public,anon;
revoke all on function public.franchise_documents_ready(uuid) from public,anon;
revoke all on function public.franchise_branch_record_gate() from public,anon;
grant execute on function public.franchise_consents_ready(uuid) to authenticated,service_role;
grant execute on function public.franchise_documents_ready(uuid) to authenticated,service_role;

commit;
