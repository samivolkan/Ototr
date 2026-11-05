begin;

create table if not exists public.franchise_case_stage_history (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete cascade,
  from_stage smallint not null check (from_stage between 0 and 13),
  to_stage smallint not null check (to_stage between 0 and 13),
  from_status text not null,
  to_status text not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  actor_role text not null,
  reason text not null check (length(trim(reason)) between 3 and 2000),
  occurred_at timestamptz not null default now(),
  check (from_stage<>to_stage or from_status<>to_status)
);

create index if not exists franchise_stage_history_case_time_idx on public.franchise_case_stage_history(franchise_case_id,occurred_at desc);
alter table public.franchise_case_stage_history enable row level security;
revoke all on public.franchise_case_stage_history from anon,authenticated;
grant select,insert on public.franchise_case_stage_history to authenticated;
grant all on public.franchise_case_stage_history to service_role;

create policy franchise_stage_history_select on public.franchise_case_stage_history for select to authenticated
using (public.franchise_can_access_case(franchise_case_id));
create policy franchise_stage_history_trigger_insert on public.franchise_case_stage_history for insert to authenticated
with check (actor_id=(select auth.uid()) and actor_role=public.franchise_claim_role());

create or replace function public.franchise_stage_owner_allowed(p_stage smallint,p_role text)
returns boolean
language sql
immutable
security invoker
set search_path = public, pg_temp
as $$
  select p_role='gm' or case p_stage
    when 0 then p_role in ('franchise_specialist','franchise_director')
    when 1 then p_role in ('franchise_specialist','franchise_director')
    when 2 then p_role in ('franchise_specialist','franchise_director')
    when 3 then p_role='franchise_director'
    when 4 then p_role in ('finance','accounting')
    when 5 then p_role in ('operations','architecture')
    when 6 then p_role='legal'
    when 7 then p_role='franchise_director'
    when 8 then p_role='legal'
    when 9 then p_role='architecture'
    when 10 then p_role='academy'
    when 11 then p_role in ('quality','operations')
    when 12 then p_role in ('gm','franchise_director')
    else false
  end
$$;

create or replace function public.franchise_stage_history_append_only()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op='INSERT' and pg_trigger_depth()<2 then raise exception 'Aşama geçmişi yalnız sistem geçiş tetikleyicisi tarafından yazılabilir'; end if;
  if tg_op in ('UPDATE','DELETE') then raise exception 'Aşama geçmişi değiştirilemez ve silinemez'; end if;
  return new;
end;
$$;

create trigger franchise_stage_history_append_only_trigger
before insert or update or delete on public.franchise_case_stage_history
for each row execute function public.franchise_stage_history_append_only();

create or replace function public.franchise_case_lifecycle_guard()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_role text:=public.franchise_claim_role(); v_reason text:=nullif(current_setting('ototr.franchise_transition_reason',true),'');
begin
  if new.stage=old.stage and new.status=old.status then return new; end if;
  if auth.uid() is null or not public.franchise_stage_owner_allowed(old.stage,v_role) then raise exception 'Bu aşama geçişi için rol yetkili değil'; end if;
  if v_reason is null and new.stage=13 and old.stage=12 then v_reason:='Atomik şube aktivasyonu'; end if;
  if v_reason is null or length(trim(v_reason))<3 then raise exception 'Aşama geçiş gerekçesi zorunludur'; end if;

  if new.status='rejected' then
    if v_role not in ('gm','franchise_director','franchise_specialist') or new.stage<>old.stage then raise exception 'Ret kararı aşamayı değiştiremez ve Franchise yetkisi gerektirir'; end if;
  elsif new.stage=13 then
    if old.stage<>12 or new.status<>'active' or not exists(select 1 from public.franchise_branches b where b.franchise_case_id=old.id and b.status='active') then
      raise exception 'Aktif aşama yalnız atomik şube aktivasyonu sonrasında işaretlenebilir';
    end if;
  elsif new.stage<>old.stage+1 then
    raise exception 'Aşamalar yalnız sırayla ilerletilebilir';
  elsif new.status not in ('in_review','conditionally_approved','approved','opening') then
    raise exception 'Aşama için geçersiz dosya durumu';
  end if;

  if old.stage=0 and new.stage=1 and not public.franchise_consents_ready(old.id) then raise exception 'Başvuru izin makbuzları tamamlanmadan ilk temasa geçilemez'; end if;
  if old.stage=5 and new.stage=6 and not exists(select 1 from public.franchise_opening_evidence e where e.franchise_case_id=old.id and e.gate_code='site_visit' and e.status='approved') then raise exception 'Onaylı saha ziyareti olmadan due diligence aşamasına geçilemez'; end if;
  if old.stage=8 and new.stage=9 and not exists(select 1 from public.franchise_opening_evidence e where e.franchise_case_id=old.id and e.gate_code='franchise_contract' and e.status='approved') then raise exception 'İmzalı sözleşme kanıtı olmadan kuruluma geçilemez'; end if;

  insert into public.franchise_case_stage_history(franchise_case_id,from_stage,to_stage,from_status,to_status,actor_id,actor_role,reason)
  values(old.id,old.stage,new.stage,old.status,new.status,auth.uid(),v_role,trim(v_reason));
  new.updated_at:=now();
  return new;
end;
$$;

create trigger franchise_case_lifecycle_guard_trigger
before update of stage,status on public.franchise_cases
for each row execute function public.franchise_case_lifecycle_guard();

create or replace function public.transition_franchise_case(p_case_id uuid,p_expected_stage smallint,p_reason text)
returns public.franchise_cases
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_case public.franchise_cases%rowtype;
begin
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Aşama geçiş gerekçesi zorunludur'; end if;
  if not public.franchise_stage_owner_allowed(p_expected_stage,public.franchise_claim_role()) then raise exception 'Bu aşama geçişi için rol yetkili değil'; end if;
  perform set_config('ototr.franchise_transition_reason',trim(p_reason),true);
  update public.franchise_cases
  set stage=stage+1,
      status=case when stage+1>=9 then 'opening' when stage+1>=7 then 'approved' else status end
  where id=p_case_id and stage=p_expected_stage and stage<12
  returning * into v_case;
  if not found then raise exception 'Franchise dosyası bulunamadı, aşama değişti veya geçiş RPC kapsamı dışında'; end if;
  return v_case;
end;
$$;

revoke all on function public.franchise_stage_owner_allowed(smallint,text) from public,anon;
revoke all on function public.franchise_stage_history_append_only() from public,anon;
revoke all on function public.franchise_case_lifecycle_guard() from public,anon;
revoke all on function public.transition_franchise_case(uuid,smallint,text) from public,anon;
grant execute on function public.franchise_stage_owner_allowed(smallint,text) to authenticated,service_role;
grant execute on function public.transition_franchise_case(uuid,smallint,text) to authenticated;

commit;
