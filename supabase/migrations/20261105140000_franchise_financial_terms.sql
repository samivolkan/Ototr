begin;

drop policy if exists franchise_case_select on public.franchise_cases;
create policy franchise_case_select on public.franchise_cases for select to authenticated
using (
  applicant_user_id=auth.uid()
  or public.franchise_claim_role() in ('gm','franchise_director','franchise_specialist','finance','accounting','legal','hr','academy','operations','procurement','it','marketing','quality','ohs','architecture')
);

create or replace function public.franchise_can_access_case(p_case_id uuid)
returns boolean language sql stable security invoker set search_path=public,pg_temp as $$
  select exists(select 1 from public.franchise_cases c where c.id=p_case_id and (
    c.applicant_user_id=auth.uid()
    or public.franchise_claim_role() in ('gm','franchise_director','franchise_specialist','finance','accounting','legal','hr','academy','operations','procurement','it','marketing','quality','ohs','architecture')
  ))
$$;

create table public.franchise_financial_terms (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete restrict,
  contract_version text not null,
  currency text not null default 'TRY' check (currency ~ '^[A-Z]{3}$'),
  entry_fee_amount numeric(14,2) not null check (entry_fee_amount > 0),
  entry_fee_vat_rate numeric(5,2) not null default 20 check (entry_fee_vat_rate between 0 and 100),
  opening_collection_threshold numeric(5,2) not null default 100 check (opening_collection_threshold between 0 and 100),
  royalty_basis text not null default 'vat_inclusive_customer_collection' check (royalty_basis='vat_inclusive_customer_collection'),
  royalty_rate numeric(5,2) not null default 10 check (royalty_rate between 0 and 100),
  advertising_fund_rate numeric(5,2) not null default 0 check (advertising_fund_rate between 0 and 100),
  royalty_exemption_months smallint not null default 0 check (royalty_exemption_months in (0,6,12)),
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','rejected','superseded')),
  maker_id uuid not null references auth.users(id) on delete restrict,
  checker_id uuid references auth.users(id) on delete restrict,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (checker_id is null or checker_id <> maker_id)
);
create unique index franchise_financial_terms_one_live
  on public.franchise_financial_terms(franchise_case_id)
  where status in ('draft','pending_approval','approved');

create table public.franchise_entry_fee_installments (
  id uuid primary key default gen_random_uuid(),
  financial_term_id uuid not null references public.franchise_financial_terms(id) on delete restrict,
  installment_no smallint not null check (installment_no > 0),
  due_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique(financial_term_id,installment_no)
);

create table public.franchise_entry_fee_receipts (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete restrict,
  financial_term_id uuid not null references public.franchise_financial_terms(id) on delete restrict,
  receipt_reference text not null,
  amount numeric(14,2) not null check (amount > 0),
  received_at timestamptz not null,
  status text not null default 'pending_approval' check (status in ('pending_approval','approved','rejected','reversed')),
  maker_id uuid not null references auth.users(id) on delete restrict,
  checker_id uuid references auth.users(id) on delete restrict,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  check (checker_id is null or checker_id <> maker_id),
  unique(financial_term_id,receipt_reference)
);

alter table public.franchise_financial_terms enable row level security;
alter table public.franchise_entry_fee_installments enable row level security;
alter table public.franchise_entry_fee_receipts enable row level security;

create policy franchise_financial_terms_select on public.franchise_financial_terms for select to authenticated
using (public.franchise_can_access_case(franchise_case_id) and public.franchise_claim_role() in ('gm','franchise_director','finance','accounting'));
create policy franchise_financial_terms_insert on public.franchise_financial_terms for insert to authenticated
with check (public.franchise_claim_role()='finance' and maker_id=auth.uid() and public.franchise_can_access_case(franchise_case_id));
create policy franchise_financial_terms_update on public.franchise_financial_terms for update to authenticated
using (public.franchise_claim_role() in ('accounting','gm') and public.franchise_can_access_case(franchise_case_id))
with check (public.franchise_claim_role() in ('accounting','gm') and public.franchise_can_access_case(franchise_case_id));
create policy franchise_installments_select on public.franchise_entry_fee_installments for select to authenticated
using (exists(select 1 from public.franchise_financial_terms t where t.id=financial_term_id and public.franchise_can_access_case(t.franchise_case_id)) and public.franchise_claim_role() in ('gm','franchise_director','finance','accounting'));
create policy franchise_installments_insert on public.franchise_entry_fee_installments for insert to authenticated
with check (public.franchise_claim_role()='finance' and exists(select 1 from public.franchise_financial_terms t where t.id=financial_term_id and t.maker_id=auth.uid() and t.status='pending_approval'));
create policy franchise_receipts_select on public.franchise_entry_fee_receipts for select to authenticated
using (public.franchise_can_access_case(franchise_case_id) and public.franchise_claim_role() in ('gm','franchise_director','finance','accounting'));
create policy franchise_receipts_insert on public.franchise_entry_fee_receipts for insert to authenticated
with check (public.franchise_claim_role()='finance' and maker_id=auth.uid() and public.franchise_can_access_case(franchise_case_id));
create policy franchise_receipts_update on public.franchise_entry_fee_receipts for update to authenticated
using (public.franchise_claim_role() in ('accounting','gm') and public.franchise_can_access_case(franchise_case_id))
with check (public.franchise_claim_role() in ('accounting','gm') and public.franchise_can_access_case(franchise_case_id));

create or replace function public.franchise_entry_fee_collection_percent(p_case_id uuid)
returns numeric language sql stable security invoker set search_path=public,pg_temp as $$
  select least(100,round(100*coalesce((select sum(r.amount) from public.franchise_entry_fee_receipts r where r.financial_term_id=t.id and r.status='approved'),0)/t.entry_fee_amount,2))
  from public.franchise_financial_terms t where t.franchise_case_id=p_case_id and t.status='approved'
$$;

create or replace function public.franchise_financial_readiness(p_case_id uuid)
returns boolean language sql stable security invoker set search_path=public,pg_temp as $$
  select coalesce((select public.franchise_entry_fee_collection_percent(p_case_id)>=t.opening_collection_threshold
    from public.franchise_financial_terms t where t.franchise_case_id=p_case_id and t.status='approved'),false)
$$;

create or replace function public.submit_franchise_financial_terms(
  p_case_id uuid,p_contract_version text,p_entry_fee_amount numeric,p_vat_rate numeric default 20,
  p_royalty_rate numeric default 10,p_advertising_rate numeric default 0,p_exemption_months smallint default 0,
  p_opening_threshold numeric default 100
) returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if public.franchise_claim_role()<>'finance' then raise exception 'Finans koşullarını yalnızca Finans hazırlayabilir'; end if;
  if not public.franchise_can_access_case(p_case_id) then raise exception 'Dosya erişimi yok'; end if;
  insert into public.franchise_financial_terms(franchise_case_id,contract_version,entry_fee_amount,entry_fee_vat_rate,royalty_rate,advertising_fund_rate,royalty_exemption_months,opening_collection_threshold,status,maker_id,submitted_at)
  values(p_case_id,trim(p_contract_version),p_entry_fee_amount,p_vat_rate,p_royalty_rate,p_advertising_rate,p_exemption_months,p_opening_threshold,'pending_approval',auth.uid(),now()) returning id into v_id;
  return v_id;
end $$;

create or replace function public.review_franchise_financial_terms(p_term_id uuid,p_approve boolean,p_note text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_term public.franchise_financial_terms%rowtype; v_total numeric;
begin
  if public.franchise_claim_role() not in ('accounting','gm') then raise exception 'Finans koşulu onayı Muhasebe veya GM yetkisindedir'; end if;
  select * into v_term from public.franchise_financial_terms where id=p_term_id for update;
  if not found or v_term.status<>'pending_approval' then raise exception 'Onay bekleyen finans koşulu bulunamadı'; end if;
  if v_term.maker_id=auth.uid() then raise exception 'Hazırlayan kendi finans koşulunu onaylayamaz'; end if;
  select coalesce(sum(amount),0) into v_total from public.franchise_entry_fee_installments where financial_term_id=p_term_id;
  if p_approve and v_total<>v_term.entry_fee_amount then raise exception 'Taksit toplamı giriş bedeline eşit olmalıdır'; end if;
  update public.franchise_financial_terms set status=case when p_approve then 'approved' else 'rejected' end,checker_id=auth.uid(),reviewed_at=now(),review_note=nullif(trim(p_note),''),updated_at=now() where id=p_term_id;
  return p_approve;
end $$;

create or replace function public.submit_franchise_entry_fee_receipt(p_term_id uuid,p_reference text,p_amount numeric,p_received_at timestamptz)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_term public.franchise_financial_terms%rowtype; v_id uuid;
begin
  if public.franchise_claim_role()<>'finance' then raise exception 'Tahsilat kaydını yalnızca Finans hazırlayabilir'; end if;
  select * into v_term from public.franchise_financial_terms where id=p_term_id and status='approved';
  if not found then raise exception 'Onaylı finans koşulu bulunamadı'; end if;
  insert into public.franchise_entry_fee_receipts(franchise_case_id,financial_term_id,receipt_reference,amount,received_at,maker_id)
  values(v_term.franchise_case_id,p_term_id,trim(p_reference),p_amount,p_received_at,auth.uid()) returning id into v_id;
  return v_id;
end $$;

create or replace function public.review_franchise_entry_fee_receipt(p_receipt_id uuid,p_approve boolean,p_note text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_receipt public.franchise_entry_fee_receipts%rowtype;
begin
  if public.franchise_claim_role() not in ('accounting','gm') then raise exception 'Tahsilat onayı Muhasebe veya GM yetkisindedir'; end if;
  select * into v_receipt from public.franchise_entry_fee_receipts where id=p_receipt_id for update;
  if not found or v_receipt.status<>'pending_approval' then raise exception 'Onay bekleyen tahsilat bulunamadı'; end if;
  if v_receipt.maker_id=auth.uid() then raise exception 'Kaydı hazırlayan tahsilatı onaylayamaz'; end if;
  update public.franchise_entry_fee_receipts set status=case when p_approve then 'approved' else 'rejected' end,checker_id=auth.uid(),reviewed_at=now(),review_note=nullif(trim(p_note),'') where id=p_receipt_id;
  return p_approve;
end $$;

create view public.franchise_payment_status_v with (security_invoker=true) as
select t.franchise_case_id,t.id financial_term_id,t.currency,t.entry_fee_amount,
       coalesce(public.franchise_entry_fee_collection_percent(t.franchise_case_id),0) collection_percent,
       t.opening_collection_threshold,t.royalty_basis,t.royalty_rate,t.advertising_fund_rate,t.royalty_exemption_months,
       min(i.due_date) filter(where i.due_date<current_date and coalesce((select sum(r.amount) from public.franchise_entry_fee_receipts r where r.financial_term_id=t.id and r.status='approved'),0)<t.entry_fee_amount) oldest_overdue_date,
       case when coalesce(public.franchise_entry_fee_collection_percent(t.franchise_case_id),0)>=100 then 'current'
            when min(i.due_date)<current_date-30 then 'restriction_review'
            when min(i.due_date)<current_date-7 then 'management_review'
            when min(i.due_date)<current_date then 'warning' else 'scheduled' end collection_action,
       false as automatic_operational_stop
from public.franchise_financial_terms t left join public.franchise_entry_fee_installments i on i.financial_term_id=t.id
where t.status='approved' group by t.id;

create or replace function public.franchise_branch_finance_gate()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if not public.franchise_financial_readiness(new.franchise_case_id) then raise exception 'Muhasebe onaylı giriş bedeli tahsilatı açılış eşiğini karşılamıyor'; end if;
  return new;
end $$;
create trigger franchise_branch_finance_gate_trigger before insert on public.franchise_branches
for each row execute function public.franchise_branch_finance_gate();

revoke all on table public.franchise_financial_terms,public.franchise_entry_fee_installments,public.franchise_entry_fee_receipts from anon;
revoke all on table public.franchise_financial_terms,public.franchise_entry_fee_installments,public.franchise_entry_fee_receipts from authenticated;
grant select,insert,update on public.franchise_financial_terms to authenticated;
grant select,insert on public.franchise_entry_fee_installments to authenticated;
grant select,insert,update on public.franchise_entry_fee_receipts to authenticated;
revoke all on function public.franchise_entry_fee_collection_percent(uuid),public.franchise_financial_readiness(uuid),public.submit_franchise_financial_terms(uuid,text,numeric,numeric,numeric,numeric,smallint,numeric),public.review_franchise_financial_terms(uuid,boolean,text),public.submit_franchise_entry_fee_receipt(uuid,text,numeric,timestamptz),public.review_franchise_entry_fee_receipt(uuid,boolean,text),public.franchise_branch_finance_gate() from public,anon;
grant execute on function public.franchise_entry_fee_collection_percent(uuid),public.franchise_financial_readiness(uuid),public.submit_franchise_financial_terms(uuid,text,numeric,numeric,numeric,numeric,smallint,numeric),public.review_franchise_financial_terms(uuid,boolean,text),public.submit_franchise_entry_fee_receipt(uuid,text,numeric,timestamptz),public.review_franchise_entry_fee_receipt(uuid,boolean,text) to authenticated;
grant select on public.franchise_payment_status_v to authenticated;

commit;
