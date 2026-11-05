begin;

create table public.franchise_uat_scenarios (
  scenario_code text primary key check (scenario_code ~ '^UAT-[0-9]{2}$'),
  title text not null,
  owner_roles text[] not null check (cardinality(owner_roles)>0),
  reviewer_roles text[] not null check (cardinality(reviewer_roles)>0),
  expected_result text not null,
  is_active boolean not null default true
);

create table public.franchise_uat_results (
  id uuid primary key default gen_random_uuid(),
  release_candidate text not null check (release_candidate ~ '^[a-zA-Z0-9._-]{3,100}$'),
  scenario_code text not null references public.franchise_uat_scenarios(scenario_code),
  revision smallint not null default 1 check (revision>0),
  status text not null default 'submitted' check (status in ('submitted','approved','rejected','superseded')),
  executor_id uuid not null references auth.users(id),
  executor_role text not null,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  result_summary text not null check (length(trim(result_summary)) between 20 and 2000),
  checker_id uuid references auth.users(id),
  checker_role text,
  checker_note text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(release_candidate,scenario_code,revision),
  check (checker_id is null or checker_id<>executor_id),
  check ((status='submitted' and checker_id is null and reviewed_at is null)
      or (status in ('approved','rejected') and checker_id is not null and reviewed_at is not null)
      or status='superseded')
);

create unique index franchise_uat_one_current_result
  on public.franchise_uat_results(release_candidate,scenario_code)
  where status in ('submitted','approved');
create index franchise_uat_results_executor_idx on public.franchise_uat_results(executor_id);
create index franchise_uat_results_checker_idx on public.franchise_uat_results(checker_id);

create table public.franchise_uat_signoff_catalog (
  signoff_role text primary key,
  authorized_roles text[] not null check (cardinality(authorized_roles)>0),
  required_scenarios text[] not null check (cardinality(required_scenarios)>0),
  sequence_no smallint not null unique check (sequence_no between 1 and 9)
);

create table public.franchise_uat_signoffs (
  id uuid primary key default gen_random_uuid(),
  release_candidate text not null check (release_candidate ~ '^[a-zA-Z0-9._-]{3,100}$'),
  signoff_role text not null references public.franchise_uat_signoff_catalog(signoff_role),
  signer_id uuid not null references auth.users(id),
  signer_role text not null,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  decision text not null check (decision in ('approved','rejected')),
  note text not null check (length(trim(note)) between 10 and 2000),
  signed_at timestamptz not null default now(),
  unique(release_candidate,signoff_role),
  unique(release_candidate,signer_id)
);

create index franchise_uat_signoffs_signer_idx on public.franchise_uat_signoffs(signer_id);

insert into public.franchise_uat_scenarios(scenario_code,title,owner_roles,reviewer_roles,expected_result) values
('UAT-01','Altı kanaldan sentetik başvuru',array['franchise_director','franchise_specialist'],array['legal','gm'],'Tekil dosya ve üç ayrı izin makbuzu'),
('UAT-02','Skorlama ve kurul kararı',array['franchise_director'],array['gm'],'Öneri ve bağımsız kurul kararı'),
('UAT-03','Eksik kritik kapıyla ilerleme',array['franchise_director','franchise_specialist'],array['gm'],'Kritik kapı reddi ve kontrollü istisna'),
('UAT-04','Hukuk ve e-imza hazırlığı',array['legal'],array['franchise_director','gm'],'Şablon sürüm ve izin kapısı'),
('UAT-05','Yüzde yüz tahsilat kapısı',array['finance'],array['accounting','gm'],'Yüzde 99 ret ve yüzde 100 geçiş'),
('UAT-06','Lokasyon ve mimari',array['operations'],array['architecture','gm'],'Saha ve teslim kanıtı'),
('UAT-07','On zorunlu kadro',array['hr'],array['franchise_director','gm'],'Eksik kadro aktivasyonu engeller'),
('UAT-08','Academy ve kullanıcı yetkisi',array['academy'],array['it','gm'],'Geçerli sertifika olmadan yetki açılmaz'),
('UAT-09','Atomik aktif şube',array['it'],array['operations','gm'],'Tek şube hesap görev ve takip seti'),
('UAT-10','Tekrar aktivasyon ve outbox',array['it'],array['gm'],'İdempotent aktivasyon ve kuyruk kurtarma'),
('UAT-11','Şube izolasyonu',array['it'],array['legal','gm'],'Yetkisiz çapraz şube erişimi reddi'),
('UAT-12','Otuz altmış doksan takip',array['operations'],array['quality','gm'],'Sahip SLA ve kanıt şartı'),
('UAT-13','Finansal koşul ve royalty',array['finance'],array['accounting','gm'],'Taksit matrah ve muafiyet doğrulaması'),
('UAT-14','Hukuk bölge ve saha',array['legal'],array['architecture','operations','gm'],'Due diligence imza bölge ve saha kanıtı'),
('UAT-15','Açılış uygulama teslimatları',array['franchise_director'],array['gm'],'On açılış teslimatı ve kurul'),
('UAT-16','Dış portallar ve bayi kapsamı',array['it'],array['legal','gm'],'Atama izolasyonu ve JWT kapsam iptali');

insert into public.franchise_uat_signoff_catalog(signoff_role,authorized_roles,required_scenarios,sequence_no) values
('Franchise Yönetimi',array['franchise_director'],array['UAT-01','UAT-02','UAT-03','UAT-15'],1),
('Finans Direktörü',array['finance'],array['UAT-05','UAT-13'],2),
('Hukuk/KVKK',array['legal'],array['UAT-01','UAT-04','UAT-11','UAT-14'],3),
('İK Yöneticisi',array['hr'],array['UAT-07'],4),
('Academy Yöneticisi',array['academy'],array['UAT-08'],5),
('Operasyon/Kalite/İSG',array['operations','quality','ohs'],array['UAT-06','UAT-12','UAT-14','UAT-15'],6),
('Tedarik/Mimari/Pazarlama',array['procurement','architecture','marketing'],array['UAT-06','UAT-15'],7),
('ERP/Bilgi Güvenliği',array['it'],array['UAT-09','UAT-10','UAT-11','UAT-16'],8),
('CEO/Yönetim',array['gm'],array['UAT-01','UAT-02','UAT-03','UAT-04','UAT-05','UAT-06','UAT-07','UAT-08','UAT-09','UAT-10','UAT-11','UAT-12','UAT-13','UAT-14','UAT-15','UAT-16'],9);

alter table public.franchise_uat_scenarios enable row level security;
alter table public.franchise_uat_results enable row level security;
alter table public.franchise_uat_signoff_catalog enable row level security;
alter table public.franchise_uat_signoffs enable row level security;

create policy franchise_uat_scenario_select on public.franchise_uat_scenarios for select to authenticated using (is_active);
create policy franchise_uat_signoff_catalog_select on public.franchise_uat_signoff_catalog for select to authenticated using (true);
create policy franchise_uat_result_select on public.franchise_uat_results for select to authenticated
using (public.franchise_claim_role()=any(array['gm','franchise_director','it','legal','finance','accounting','hr','academy','operations','quality','ohs','procurement','architecture','marketing']));
create policy franchise_uat_result_insert on public.franchise_uat_results for insert to authenticated
with check (
  executor_id=(select auth.uid())
  and executor_role=public.franchise_claim_role()
  and status='submitted'
  and exists(select 1 from public.franchise_uat_scenarios s where s.scenario_code=franchise_uat_results.scenario_code and public.franchise_claim_role()=any(s.owner_roles))
);
create policy franchise_uat_result_review on public.franchise_uat_results for update to authenticated
using (
  status='submitted' and executor_id<>(select auth.uid())
  and exists(select 1 from public.franchise_uat_scenarios s where s.scenario_code=franchise_uat_results.scenario_code and public.franchise_claim_role()=any(s.reviewer_roles))
)
with check (
  checker_id=(select auth.uid()) and checker_id<>executor_id
  and checker_role=public.franchise_claim_role()
  and status in ('approved','rejected') and reviewed_at is not null
);
create policy franchise_uat_signoff_select on public.franchise_uat_signoffs for select to authenticated
using (public.franchise_claim_role()=any(array['gm','franchise_director','it','legal','finance','accounting','hr','academy','operations','quality','ohs','procurement','architecture','marketing']));
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
    franchise_uat_signoffs.signoff_role<>'CEO/Yönetim'
    or (select count(*) from public.franchise_uat_signoffs x where x.release_candidate=franchise_uat_signoffs.release_candidate and x.decision='approved')=8
  )
);

revoke all on public.franchise_uat_scenarios,public.franchise_uat_results,public.franchise_uat_signoff_catalog,public.franchise_uat_signoffs from anon;
grant select on public.franchise_uat_scenarios,public.franchise_uat_signoff_catalog to authenticated;
grant select,insert,update on public.franchise_uat_results to authenticated;
grant select,insert on public.franchise_uat_signoffs to authenticated;

create view public.franchise_uat_release_status_v
with (security_invoker=true)
as
select
  rc.release_candidate,
  count(distinct r.scenario_code) filter(where r.status='approved') as approved_scenarios,
  count(distinct s.signoff_role) filter(where s.decision='approved') as approved_signoffs,
  count(distinct r.scenario_code) filter(where r.status='approved')=16
    and count(distinct s.signoff_role) filter(where s.decision='approved')=9 as uat_ready
from (
  select release_candidate from public.franchise_uat_results
  union
  select release_candidate from public.franchise_uat_signoffs
) rc
left join public.franchise_uat_results r on r.release_candidate=rc.release_candidate
left join public.franchise_uat_signoffs s on s.release_candidate=rc.release_candidate
group by rc.release_candidate;

revoke all on public.franchise_uat_release_status_v from anon;
grant select on public.franchise_uat_release_status_v to authenticated;

commit;
