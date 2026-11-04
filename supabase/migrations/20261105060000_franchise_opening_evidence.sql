begin;

create table if not exists public.franchise_opening_evidence (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete cascade,
  gate_code text not null check (gate_code in ('entry_fee_payment','franchise_contract','site_visit','operating_license')),
  status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
  evidence_sha256 text not null check (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  source_reference text not null check (length(trim(source_reference)) between 3 and 200),
  details jsonb not null default '{}',
  maker_id uuid not null references auth.users(id) on delete restrict,
  checker_id uuid references auth.users(id) on delete restrict,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(franchise_case_id,gate_code),
  check (checker_id is null or checker_id<>maker_id),
  check ((status='submitted' and checker_id is null and reviewed_at is null) or (status in ('approved','rejected') and checker_id is not null and reviewed_at is not null))
);

create index if not exists franchise_opening_evidence_case_status_idx on public.franchise_opening_evidence(franchise_case_id,status);
alter table public.franchise_opening_evidence enable row level security;
revoke all on public.franchise_opening_evidence from anon, authenticated;
grant select,insert,update on public.franchise_opening_evidence to authenticated;
grant all on public.franchise_opening_evidence to service_role;

create or replace function public.franchise_role_can_manage_opening_gate(p_gate_code text)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case
    when public.franchise_claim_role() in ('gm','franchise_director') then true
    when p_gate_code='entry_fee_payment' and public.franchise_claim_role() in ('finance','accounting') then true
    when p_gate_code in ('franchise_contract','operating_license') and public.franchise_claim_role()='legal' then true
    when p_gate_code='site_visit' and public.franchise_claim_role() in ('operations','architecture','inspector') then true
    else false
  end
$$;

create or replace function public.franchise_opening_evidence_payload_valid(p_gate_code text,p_details jsonb)
returns boolean
language sql
immutable
security invoker
set search_path = public, pg_temp
as $$
  select case p_gate_code
    when 'entry_fee_payment' then p_details->>'paid_percent'='100' and length(trim(coalesce(p_details->>'payment_reference','')))>=3
    when 'franchise_contract' then p_details->>'signed'='true' and length(trim(coalesce(p_details->>'contract_no','')))>=3 and p_details->>'signature_method' in ('wet','esign')
    when 'site_visit' then p_details->>'inspector_approved'='true' and p_details->>'measurements_complete'='true'
      and coalesce(p_details->>'photo_count','') ~ '^[1-9][0-9]*$'
      and nullif(trim(coalesce(p_details->>'latitude','')),'') is not null
      and nullif(trim(coalesce(p_details->>'longitude','')),'') is not null
    when 'operating_license' then p_details->>'valid'='true' and length(trim(coalesce(p_details->>'license_no','')))>=3
    else false
  end
$$;

create policy franchise_opening_evidence_select on public.franchise_opening_evidence for select to authenticated
using (
  public.franchise_role_can_manage_opening_gate(gate_code)
  or exists(select 1 from public.franchise_cases c where c.id=franchise_case_id and c.applicant_user_id=(select auth.uid()))
);

create policy franchise_opening_evidence_insert on public.franchise_opening_evidence for insert to authenticated
with check (
  public.franchise_role_can_manage_opening_gate(gate_code)
  and maker_id=(select auth.uid()) and status='submitted' and checker_id is null
  and public.franchise_opening_evidence_payload_valid(gate_code,details)
);

create policy franchise_opening_evidence_review on public.franchise_opening_evidence for update to authenticated
using (status='submitted' and public.franchise_role_can_manage_opening_gate(gate_code) and maker_id<>(select auth.uid()))
with check (
  status in ('approved','rejected') and checker_id=(select auth.uid()) and checker_id<>maker_id and reviewed_at is not null
  and public.franchise_opening_evidence_payload_valid(gate_code,details)
);

create or replace function public.franchise_opening_evidence_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.franchise_case_id<>old.franchise_case_id or new.gate_code<>old.gate_code
     or new.evidence_sha256<>old.evidence_sha256 or new.source_reference<>old.source_reference
     or new.details<>old.details or new.maker_id<>old.maker_id or new.created_at<>old.created_at then
    raise exception 'Açılış kanıtının kapsamı ve kaynağı inceleme sırasında değiştirilemez';
  end if;
  return new;
end;
$$;

create trigger franchise_opening_evidence_immutable_trigger
before update on public.franchise_opening_evidence
for each row execute function public.franchise_opening_evidence_immutable();

create or replace function public.submit_franchise_opening_evidence(
  p_case_id uuid,p_gate_code text,p_evidence_sha256 text,p_source_reference text,p_details jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.franchise_role_can_manage_opening_gate(p_gate_code) then raise exception 'Açılış kanıtı gönderme yetkisi yok'; end if;
  if not public.franchise_opening_evidence_payload_valid(p_gate_code,p_details) then raise exception 'Açılış kanıtı alanları eksik veya geçersiz'; end if;
  insert into public.franchise_opening_evidence(franchise_case_id,gate_code,evidence_sha256,source_reference,details,maker_id)
  values(p_case_id,p_gate_code,lower(p_evidence_sha256),trim(p_source_reference),p_details,auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.review_franchise_opening_evidence(p_evidence_id uuid,p_approve boolean,p_review_note text)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_record public.franchise_opening_evidence%rowtype;
begin
  select * into v_record from public.franchise_opening_evidence where id=p_evidence_id;
  if not found then raise exception 'Açılış kanıtı bulunamadı veya erişim yok'; end if;
  if v_record.maker_id=auth.uid() then raise exception 'Kanıtı oluşturan kişi kendi kaydını onaylayamaz'; end if;
  if not public.franchise_role_can_manage_opening_gate(v_record.gate_code) then raise exception 'Açılış kanıtı inceleme yetkisi yok'; end if;
  if v_record.status<>'submitted' then raise exception 'Yalnız gönderilmiş açılış kanıtı incelenebilir'; end if;
  update public.franchise_opening_evidence
  set status=case when p_approve then 'approved' else 'rejected' end,checker_id=auth.uid(),reviewed_at=now(),review_note=left(trim(coalesce(p_review_note,'')),2000)
  where id=p_evidence_id;
end;
$$;

create or replace function public.franchise_opening_evidence_ready(p_case_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select count(*)=4 and bool_and(public.franchise_opening_evidence_payload_valid(gate_code,details))
  from public.franchise_opening_evidence where franchise_case_id=p_case_id and status='approved'
$$;

create or replace function public.franchise_branch_evidence_gate()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not public.franchise_opening_evidence_ready(new.franchise_case_id) then
    raise exception 'Tahsilat, sözleşme, saha ziyareti ve ruhsat kanıtları bağımsız onaylı olmalıdır';
  end if;
  return new;
end;
$$;

create trigger franchise_branch_evidence_gate_trigger
before insert on public.franchise_branches
for each row execute function public.franchise_branch_evidence_gate();

revoke all on function public.franchise_role_can_manage_opening_gate(text) from public,anon;
revoke all on function public.franchise_opening_evidence_payload_valid(text,jsonb) from public,anon;
revoke all on function public.franchise_opening_evidence_immutable() from public,anon;
revoke all on function public.submit_franchise_opening_evidence(uuid,text,text,text,jsonb) from public,anon;
revoke all on function public.review_franchise_opening_evidence(uuid,boolean,text) from public,anon;
revoke all on function public.franchise_opening_evidence_ready(uuid) from public,anon;
revoke all on function public.franchise_branch_evidence_gate() from public,anon;
grant execute on function public.franchise_role_can_manage_opening_gate(text) to authenticated,service_role;
grant execute on function public.franchise_opening_evidence_payload_valid(text,jsonb) to authenticated,service_role;
grant execute on function public.submit_franchise_opening_evidence(uuid,text,text,text,jsonb) to authenticated;
grant execute on function public.review_franchise_opening_evidence(uuid,boolean,text) to authenticated;
grant execute on function public.franchise_opening_evidence_ready(uuid) to authenticated,service_role;

commit;
