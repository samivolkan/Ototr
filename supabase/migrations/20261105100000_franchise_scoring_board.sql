begin;

create table if not exists public.franchise_score_dimensions (
  code text primary key,
  label text not null,
  weight numeric(5,2) not null check (weight>0 and weight<=100),
  owner_roles text[] not null,
  display_order smallint not null unique,
  is_active boolean not null default true
);
insert into public.franchise_score_dimensions(code,label,weight,owner_roles,display_order) values
('financial_capacity','Finansal yeterlilik',25,array['finance','accounting'],1),
('management_experience','Yönetim deneyimi',15,array['franchise_specialist','franchise_director','hr'],2),
('brand_ethics_fit','Marka ve etik uyumu',15,array['franchise_specialist','franchise_director','legal'],3),
('location_potential','Lokasyon potansiyeli',15,array['operations','architecture'],4),
('operational_capability','Operasyonel yeterlilik',10,array['operations','quality'],5),
('background_references','Referans ve geçmiş kontrolü',10,array['legal','hr'],6),
('growth_potential','Büyüme potansiyeli',10,array['franchise_specialist','franchise_director'],7)
on conflict(code) do nothing;

create table if not exists public.franchise_candidate_score_entries (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete cascade,
  dimension_code text not null references public.franchise_score_dimensions(code),
  revision smallint not null check (revision>0),
  score numeric(5,2) not null check (score between 0 and 100),
  assessor_id uuid not null references auth.users(id) on delete restrict,
  assessor_role text not null,
  evidence_sha256 text not null check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  rationale text not null check (length(trim(rationale)) between 5 and 2000),
  created_at timestamptz not null default now(),
  unique(franchise_case_id,dimension_code,revision)
);

create table if not exists public.franchise_board_decisions (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete cascade,
  score_value numeric(5,2) not null,
  score_recommendation text not null check (score_recommendation in ('strong','conditional','manager_review','not_suitable')),
  final_decision text not null check (final_decision in ('approved','conditionally_approved','rejected')),
  conditions text,
  deviation_rationale text,
  status text not null default 'pending_second_approval' check (status in ('pending_second_approval','approved','rejected')),
  maker_id uuid not null references auth.users(id) on delete restrict,
  checker_id uuid references auth.users(id) on delete restrict,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (checker_id is null or checker_id<>maker_id),
  check ((final_decision='conditionally_approved')=(conditions is not null and length(trim(conditions))>=5)),
  check ((status='pending_second_approval' and checker_id is null and reviewed_at is null) or (status in ('approved','rejected') and checker_id is not null and reviewed_at is not null))
);
create unique index if not exists franchise_board_one_pending_idx on public.franchise_board_decisions(franchise_case_id) where status='pending_second_approval';

alter table public.franchise_score_dimensions enable row level security;
alter table public.franchise_candidate_score_entries enable row level security;
alter table public.franchise_board_decisions enable row level security;
revoke all on public.franchise_score_dimensions,public.franchise_candidate_score_entries,public.franchise_board_decisions from anon,authenticated;
grant select on public.franchise_score_dimensions to authenticated;
grant select,insert on public.franchise_candidate_score_entries to authenticated;
grant select,insert,update on public.franchise_board_decisions to authenticated;
grant all on public.franchise_score_dimensions,public.franchise_candidate_score_entries,public.franchise_board_decisions to service_role;

create policy franchise_score_dimension_select on public.franchise_score_dimensions for select to authenticated using (is_active=true);
create policy franchise_score_entry_select on public.franchise_candidate_score_entries for select to authenticated
using (public.franchise_claim_role() in ('gm','franchise_director','franchise_specialist','finance','accounting','legal','hr','operations','architecture','quality'));
create policy franchise_score_entry_insert on public.franchise_candidate_score_entries for insert to authenticated
with check (
  assessor_id=(select auth.uid()) and assessor_role=public.franchise_claim_role()
  and exists(select 1 from public.franchise_score_dimensions d where d.code=dimension_code and d.is_active and public.franchise_claim_role()=any(d.owner_roles))
);
create policy franchise_board_select on public.franchise_board_decisions for select to authenticated
using (public.franchise_claim_role() in ('gm','franchise_director','franchise_specialist'));
create policy franchise_board_insert on public.franchise_board_decisions for insert to authenticated
with check (maker_id=(select auth.uid()) and public.franchise_claim_role()='franchise_director' and status='pending_second_approval');
create policy franchise_board_review on public.franchise_board_decisions for update to authenticated
using (status='pending_second_approval' and maker_id<>(select auth.uid()) and public.franchise_claim_role()='gm')
with check (checker_id=(select auth.uid()) and maker_id<>(select auth.uid()) and public.franchise_claim_role()='gm' and status in ('approved','rejected'));

create or replace function public.franchise_score_value(p_case_id uuid)
returns numeric
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with latest as (
    select distinct on (dimension_code) dimension_code,score
    from public.franchise_candidate_score_entries where franchise_case_id=p_case_id
    order by dimension_code,revision desc,created_at desc
  )
  select case when count(*)=7 then round(sum(l.score*d.weight)/sum(d.weight),2) else null end
  from public.franchise_score_dimensions d join latest l on l.dimension_code=d.code where d.is_active
$$;

create or replace function public.franchise_score_recommendation(p_score numeric)
returns text
language sql
immutable
security invoker
set search_path = public, pg_temp
as $$ select case when p_score>=80 then 'strong' when p_score>=65 then 'conditional' when p_score>=50 then 'manager_review' else 'not_suitable' end $$;

create or replace function public.submit_franchise_score(p_case_id uuid,p_dimension_code text,p_score numeric,p_evidence_sha256 text,p_rationale text)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_revision smallint; v_id uuid;
begin
  if not exists(select 1 from public.franchise_score_dimensions d where d.code=p_dimension_code and d.is_active and public.franchise_claim_role()=any(d.owner_roles)) then raise exception 'Bu skor başlığı için rol yetkili değil'; end if;
  select coalesce(max(revision),0)+1 into v_revision from public.franchise_candidate_score_entries where franchise_case_id=p_case_id and dimension_code=p_dimension_code;
  insert into public.franchise_candidate_score_entries(franchise_case_id,dimension_code,revision,score,assessor_id,assessor_role,evidence_sha256,rationale)
  values(p_case_id,p_dimension_code,v_revision,p_score,auth.uid(),public.franchise_claim_role(),lower(p_evidence_sha256),trim(p_rationale)) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.submit_franchise_board_decision(p_case_id uuid,p_final_decision text,p_conditions text,p_deviation_rationale text)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_score numeric; v_recommendation text; v_id uuid;
begin
  if public.franchise_claim_role()<>'franchise_director' then raise exception 'Kurul kararını Franchise Direktörü hazırlamalıdır'; end if;
  v_score:=public.franchise_score_value(p_case_id);
  if v_score is null then raise exception 'Yedi başlıklı aday skoru tamamlanmadı'; end if;
  v_recommendation:=public.franchise_score_recommendation(v_score);
  if (p_final_decision='approved' and v_recommendation<>'strong') or (p_final_decision='rejected' and v_recommendation<>'not_suitable') then
    if length(trim(coalesce(p_deviation_rationale,'')))<5 then raise exception 'Skor önerisinden sapma gerekçesi zorunludur'; end if;
  end if;
  insert into public.franchise_board_decisions(franchise_case_id,score_value,score_recommendation,final_decision,conditions,deviation_rationale,maker_id)
  values(p_case_id,v_score,v_recommendation,p_final_decision,nullif(trim(coalesce(p_conditions,'')),''),nullif(trim(coalesce(p_deviation_rationale,'')),''),auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.review_franchise_board_decision(p_decision_id uuid,p_approve boolean,p_note text)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_decision public.franchise_board_decisions%rowtype;
begin
  select * into v_decision from public.franchise_board_decisions where id=p_decision_id;
  if not found then raise exception 'Kurul kararı bulunamadı veya erişim yok'; end if;
  if v_decision.maker_id=auth.uid() then raise exception 'Kararı hazırlayan kendi kurul kararını onaylayamaz'; end if;
  if public.franchise_claim_role()<>'gm' then raise exception 'Kurul ikinci onayı Genel Müdür tarafından verilmelidir'; end if;
  update public.franchise_board_decisions set status=case when p_approve then 'approved' else 'rejected' end,checker_id=auth.uid(),reviewed_at=now(),review_note=left(trim(coalesce(p_note,'')),2000) where id=p_decision_id and status='pending_second_approval';
  if not found then raise exception 'Kurul kararı daha önce sonuçlandı'; end if;
end;
$$;

create or replace function public.franchise_scoring_stage_gate()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if old.stage=2 and new.stage=3 and public.franchise_score_value(old.id) is null then raise exception 'Yedi başlıklı kanıtlı aday skoru tamamlanmadan sunuma geçilemez'; end if;
  if old.stage=7 and new.stage=8 and not exists(select 1 from public.franchise_board_decisions b where b.franchise_case_id=old.id and b.status='approved' and b.final_decision in ('approved','conditionally_approved')) then raise exception 'Bağımsız onaylı olumlu kurul kararı olmadan sözleşme aşamasına geçilemez'; end if;
  return new;
end;
$$;
create trigger franchise_scoring_stage_gate_trigger before update of stage on public.franchise_cases for each row execute function public.franchise_scoring_stage_gate();

revoke all on function public.franchise_score_value(uuid) from public,anon;
revoke all on function public.franchise_score_recommendation(numeric) from public,anon;
revoke all on function public.submit_franchise_score(uuid,text,numeric,text,text) from public,anon;
revoke all on function public.submit_franchise_board_decision(uuid,text,text,text) from public,anon;
revoke all on function public.review_franchise_board_decision(uuid,boolean,text) from public,anon;
revoke all on function public.franchise_scoring_stage_gate() from public,anon;
grant execute on function public.franchise_score_value(uuid) to authenticated,service_role;
grant execute on function public.franchise_score_recommendation(numeric) to authenticated,service_role;
grant execute on function public.submit_franchise_score(uuid,text,numeric,text,text) to authenticated;
grant execute on function public.submit_franchise_board_decision(uuid,text,text,text) to authenticated;
grant execute on function public.review_franchise_board_decision(uuid,boolean,text) to authenticated;

commit;
