-- Office-only read model; does not advance cases or approve finance decisions.
create table public.franchise_agent_profile (
 id text primary key check(id='FRA-01'),
 profile jsonb not null,
 version integer not null default 1,
 updated_at timestamptz not null default now(),
 updated_by uuid
);
alter table public.franchise_agent_profile enable row level security;
revoke all on public.franchise_agent_profile from anon,authenticated;
grant select,update on public.franchise_agent_profile to authenticated;
create policy franchise_agent_profile_read on public.franchise_agent_profile for select to authenticated using(public.franchise_claim_role() in ('gm','franchise_director'));
create policy franchise_agent_profile_edit on public.franchise_agent_profile for update to authenticated using(public.franchise_claim_role()='gm') with check(public.franchise_claim_role()='gm');
insert into public.franchise_agent_profile(id,profile) values('FRA-01','{"mission":"Franchise dosyalarını kaynak kanıtlarıyla izlemek ve eksikleri yöneticisine raporlamak.","scope":"Başvuru, değerlendirme, kurul onayı, sözleşme, açılış ve Finans devirlerini salt okunur takip etmek.","handoff":"Finans devrinde kaynak kaydı, durum ve işlem zamanını kontrol etmek. İşlendi kaydını tahsilat veya Finans kabulü saymamak.","escalation":"Para, yetki, veri ve şema risklerini bağımsız bekçiye; kararları yönetici ve koordinatör üzerinden Sami’ye iletmek.","acceptance":"Her bulguda dosya ve satır kanıtı, öneri, risk, efor ve varsa karar talebi sunmak. Kanıt yoksa soru listesinde beklemek."}'::jsonb);
create function public.franchise_office_summary() returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or coalesce(public.franchise_claim_role(),'') not in ('gm','franchise_director') then raise exception 'Franchise yönetici yetkisi gerekli' using errcode='42501'; end if;
 return jsonb_build_object(
 'checked_at',now(),
 'case_count',(select count(*) from public.franchise_cases),
 'approvals',(select count(*) from public.franchise_board_decisions where status='pending_second_approval' and superseded_at is null),
 'finance_pending',(select count(*) from public.franchise_integration_outbox where source='finance' and status in ('pending','processing')),
 'finance_processed',(select count(*) from public.franchise_integration_outbox where source='finance' and status='processed'),
 'finance_failed',(select count(*) from public.franchise_integration_outbox where source='finance' and status in ('failed','dead_letter')),
 'cases',coalesce((select jsonb_agg(row_to_json(t)) from(select status,count(*) as count from public.franchise_cases group by status)t),'[]'::jsonb),
 'approval_items',coalesce((select jsonb_agg(row_to_json(t)) from(select id,franchise_case_id,created_at,status from public.franchise_board_decisions where status='pending_second_approval' and superseded_at is null order by created_at limit 10)t),'[]'::jsonb),
 'finance_items',coalesce((select jsonb_agg(row_to_json(t)) from(select id,franchise_case_id,status,created_at,processed_at from public.franchise_integration_outbox where source='finance' order by created_at desc limit 20)t),'[]'::jsonb),
 'profile',(select to_jsonb(p) from public.franchise_agent_profile p where id='FRA-01'),
 'can_edit_profile',public.franchise_claim_role()='gm'
 );
end $$;
revoke all on function public.franchise_office_summary() from public,anon;
grant execute on function public.franchise_office_summary() to authenticated;
create function public.save_franchise_agent_profile(p_profile jsonb,p_version integer) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_row public.franchise_agent_profile; k text;
begin
 if auth.uid() is null or coalesce(public.franchise_claim_role(),'')<>'gm' then raise exception 'Yalnız genel müdür kaydedebilir' using errcode='42501'; end if;
 if jsonb_typeof(p_profile)<>'object' or (select count(*) from jsonb_object_keys(p_profile))<>5 then raise exception 'Geçersiz görev kartı'; end if;
 foreach k in array array['mission','scope','handoff','escalation','acceptance'] loop
 if jsonb_typeof(p_profile->k) is distinct from 'string' or length(trim(p_profile->>k)) not between 5 and 2000 then raise exception 'Eksik veya geçersiz görev alanı'; end if;
 end loop;
 update public.franchise_agent_profile set profile=p_profile,version=version+1,updated_at=now(),updated_by=auth.uid() where id='FRA-01' and version=p_version returning * into v_row;
 if not found then raise exception 'Kart başka bir oturumda güncellendi. Yenileyip tekrar deneyin.' using errcode='40001'; end if;
 return to_jsonb(v_row);
end $$;
revoke all on function public.save_franchise_agent_profile(jsonb,integer) from public,anon;
grant execute on function public.save_franchise_agent_profile(jsonb,integer) to authenticated;
