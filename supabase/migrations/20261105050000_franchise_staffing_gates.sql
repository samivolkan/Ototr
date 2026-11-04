begin;

alter table public.franchise_staff add column if not exists position_no smallint not null default 1 check (position_no > 0);
alter table public.franchise_staff drop constraint if exists franchise_staff_franchise_case_id_role_key_key;
alter table public.franchise_staff add constraint franchise_staff_case_role_position_key unique(franchise_case_id,role_key,position_no);

create table if not exists public.franchise_staffing_rules (
  branch_type text not null,
  role_key text not null,
  role_name text not null,
  minimum_count smallint not null default 1 check (minimum_count > 0),
  certification_required boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(branch_type,role_key)
);

insert into public.franchise_staffing_rules(branch_type,role_key,role_name,minimum_count,certification_required) values
('standard','owner','Franchise sahibi',1,true),
('standard','manager','Şube müdürü',1,true),
('standard','reception','Müşteri kabul',1,true),
('standard','body_paint','Kaporta / boya teknisyeni',1,true),
('standard','mechanical','Motor / mekanik teknisyeni',1,true),
('standard','diagnostic','Elektronik / diagnostik',1,true),
('standard','technical_lead','Teknik sorumlu',1,true),
('standard','report_approver','Rapor onay sorumlusu',1,true),
('standard','cashier','Kasa / muhasebe',1,true),
('standard','support','Destek / temizlik',1,false)
on conflict(branch_type,role_key) do nothing;

alter table public.franchise_staffing_rules enable row level security;
revoke all on public.franchise_staffing_rules from anon, authenticated;
grant select on public.franchise_staffing_rules to authenticated;
grant all on public.franchise_staffing_rules to service_role;

create policy franchise_staffing_rule_select on public.franchise_staffing_rules for select to authenticated using (is_active=true);

create or replace function public.franchise_staffing_is_ready(p_case_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select not exists (
    select 1
    from public.franchise_cases c
    join public.franchise_staffing_rules r on r.branch_type=c.branch_type and r.is_active=true
    where c.id=p_case_id
      and (
        select count(*) from public.franchise_staff s
        where s.franchise_case_id=c.id
          and s.role_key=r.role_key
          and s.role_name=r.role_name
          and s.certification_required=r.certification_required
          and s.recruitment_status='hired'
          and s.employment_documents_complete
          and s.contract_signed
          and (
            not r.certification_required
            or (s.academy_completed and s.certificate_valid_until >= current_date)
          )
          and s.access_status in ('ready','provisioning','active')
      ) < r.minimum_count
  ) and exists (
    select 1 from public.franchise_cases c
    join public.franchise_staffing_rules r on r.branch_type=c.branch_type and r.is_active=true
    where c.id=p_case_id
  )
$$;

create or replace function public.franchise_branch_staffing_gate()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if not public.franchise_staffing_is_ready(new.franchise_case_id) then
    raise exception 'Şube tipi zorunlu kadro, özlük, sözleşme, sertifika veya yetki hazırlık kapısı eksik';
  end if;
  return new;
end;
$$;

drop trigger if exists franchise_branch_staffing_gate_trigger on public.franchise_branches;
create trigger franchise_branch_staffing_gate_trigger
before insert on public.franchise_branches
for each row execute function public.franchise_branch_staffing_gate();

create or replace function public.franchise_staff_field_scope()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_role text := public.franchise_claim_role();
begin
  if new.franchise_case_id<>old.franchise_case_id or new.role_key<>old.role_key or new.role_name<>old.role_name
     or new.certification_required<>old.certification_required or new.position_no<>old.position_no then
    raise exception 'Personel dosyası, rolü, sertifika şartı ve pozisyon sırası değiştirilemez';
  end if;

  if v_role in ('gm','franchise_director') then return new; end if;
  if v_role='hr' then
    if new.auth_user_id is distinct from old.auth_user_id or new.academy_completed is distinct from old.academy_completed
       or new.certificate_valid_until is distinct from old.certificate_valid_until or new.access_status is distinct from old.access_status then
      raise exception 'İK yalnız işe alım, iletişim, özlük ve sözleşme alanlarını değiştirebilir';
    end if;
    return new;
  end if;
  if v_role='academy' then
    if new.person_name is distinct from old.person_name or new.contact_email is distinct from old.contact_email
       or new.auth_user_id is distinct from old.auth_user_id or new.recruitment_status is distinct from old.recruitment_status
       or new.employment_documents_complete is distinct from old.employment_documents_complete
       or new.contract_signed is distinct from old.contract_signed or new.access_status is distinct from old.access_status then
      raise exception 'Academy yalnız eğitim ve sertifika alanlarını değiştirebilir';
    end if;
    return new;
  end if;
  if v_role='it' then
    if new.person_name is distinct from old.person_name or new.contact_email is distinct from old.contact_email
       or new.recruitment_status is distinct from old.recruitment_status
       or new.employment_documents_complete is distinct from old.employment_documents_complete
       or new.contract_signed is distinct from old.contract_signed or new.academy_completed is distinct from old.academy_completed
       or new.certificate_valid_until is distinct from old.certificate_valid_until then
      raise exception 'BT yalnız kimlik bağlantısı ve erişim durumunu değiştirebilir';
    end if;
    return new;
  end if;
  raise exception 'Personel alanlarını değiştirme yetkisi yok';
end;
$$;

drop trigger if exists franchise_staff_field_scope_trigger on public.franchise_staff;
create trigger franchise_staff_field_scope_trigger
before update on public.franchise_staff
for each row execute function public.franchise_staff_field_scope();

revoke all on function public.franchise_staffing_is_ready(uuid) from public, anon;
grant execute on function public.franchise_staffing_is_ready(uuid) to authenticated, service_role;
revoke all on function public.franchise_branch_staffing_gate() from public, anon;
revoke all on function public.franchise_staff_field_scope() from public, anon;

commit;
