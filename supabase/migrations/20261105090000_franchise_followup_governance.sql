begin;

alter table public.franchise_followup_tasks
  add column if not exists completed_by uuid references auth.users(id) on delete set null,
  add column if not exists evidence_sha256 text,
  add column if not exists completion_note text;
alter table public.franchise_followup_tasks
  add constraint franchise_followup_evidence_sha_check check (evidence_sha256 is null or evidence_sha256 ~ '^[a-f0-9]{64}$'),
  add constraint franchise_followup_completion_check check (
    (status='completed' and completed_by is not null and completed_at is not null and evidence_sha256 is not null and length(trim(completion_note))>=3)
    or (status<>'completed' and completed_by is null and completed_at is null and evidence_sha256 is null and completion_note is null)
  );

create table if not exists public.franchise_followup_reopen_requests (
  id uuid primary key default gen_random_uuid(),
  followup_task_id uuid not null references public.franchise_followup_tasks(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check (length(trim(reason)) between 5 and 2000),
  status text not null default 'pending' check (status in ('pending','approved','rejected','applied')),
  reviewer_id uuid references auth.users(id) on delete restrict,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (reviewer_id is null or reviewer_id<>requester_id),
  check ((status='pending' and reviewer_id is null and reviewed_at is null) or (status<>'pending' and reviewer_id is not null and reviewed_at is not null))
);

create unique index if not exists franchise_followup_one_pending_reopen_idx on public.franchise_followup_reopen_requests(followup_task_id) where status='pending';
alter table public.franchise_followup_reopen_requests enable row level security;
revoke all on public.franchise_followup_reopen_requests from anon,authenticated;
grant select,insert,update on public.franchise_followup_reopen_requests to authenticated;
grant all on public.franchise_followup_reopen_requests to service_role;

create or replace function public.franchise_role_can_manage_followup(p_owner_department text)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case
    when public.franchise_claim_role()='gm' then true
    when p_owner_department='operations' then public.franchise_claim_role()='operations'
    when p_owner_department='finance_hr' then public.franchise_claim_role() in ('finance','accounting','hr')
    when p_owner_department='franchise' then public.franchise_claim_role() in ('franchise_director','franchise_specialist')
    else false
  end
$$;

drop policy if exists franchise_followup_manage on public.franchise_followup_tasks;
create policy franchise_followup_insert on public.franchise_followup_tasks for insert to authenticated
with check (public.franchise_claim_role() in ('gm','franchise_director'));
create policy franchise_followup_update on public.franchise_followup_tasks for update to authenticated
using (public.franchise_role_can_manage_followup(owner_department))
with check (public.franchise_role_can_manage_followup(owner_department));

create policy franchise_followup_reopen_select on public.franchise_followup_reopen_requests for select to authenticated
using (requester_id=(select auth.uid()) or public.franchise_claim_role() in ('gm','franchise_director'));
create policy franchise_followup_reopen_insert on public.franchise_followup_reopen_requests for insert to authenticated
with check (requester_id=(select auth.uid()) and status='pending');
create policy franchise_followup_reopen_review on public.franchise_followup_reopen_requests for update to authenticated
using (public.franchise_claim_role() in ('gm','franchise_director') and requester_id<>(select auth.uid()))
with check (public.franchise_claim_role() in ('gm','franchise_director') and reviewer_id=(select auth.uid()) and requester_id<>(select auth.uid()));

create or replace function public.franchise_followup_scope_guard()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.franchise_case_id<>old.franchise_case_id or new.branch_id<>old.branch_id or new.day_no<>old.day_no
     or new.title<>old.title or new.owner_department<>old.owner_department or new.due_at<>old.due_at then
    raise exception '30/60/90 görevinin kapsamı, sahibi ve vadesi değiştirilemez';
  end if;
  if old.status='open' and new.status='completed' then
    if not public.franchise_role_can_manage_followup(old.owner_department) or new.completed_by<>(select auth.uid())
       or new.completed_at is null or new.evidence_sha256 is null or length(trim(coalesce(new.completion_note,'')))<3 then
      raise exception 'Takip görevi yalnız sahibi tarafından kanıt ve notla tamamlanabilir';
    end if;
  elsif old.status='completed' and new.status='open' then
    if not exists(select 1 from public.franchise_followup_reopen_requests r where r.followup_task_id=old.id and r.status='approved') then
      raise exception 'Tamamlanan görev yalnız bağımsız onaylı yeniden açma talebiyle açılabilir';
    end if;
    new.completed_by:=null; new.completed_at:=null; new.evidence_sha256:=null; new.completion_note:=null;
  elsif new.status is distinct from old.status then
    if new.status<>'cancelled' or public.franchise_claim_role() not in ('gm','franchise_director') then raise exception 'Geçersiz takip görevi durum geçişi'; end if;
  end if;
  return new;
end;
$$;

create trigger franchise_followup_scope_guard_trigger
before update on public.franchise_followup_tasks
for each row execute function public.franchise_followup_scope_guard();

create or replace function public.complete_franchise_followup(p_task_id uuid,p_evidence_sha256 text,p_note text)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update public.franchise_followup_tasks set status='completed',completed_by=auth.uid(),completed_at=now(),evidence_sha256=lower(p_evidence_sha256),completion_note=trim(p_note)
  where id=p_task_id and status='open';
  if not found then raise exception 'Takip görevi bulunamadı, yetki yok veya görev açık değil'; end if;
end;
$$;

create or replace function public.request_franchise_followup_reopen(p_task_id uuid,p_reason text)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_task public.franchise_followup_tasks%rowtype; v_id uuid;
begin
  select * into v_task from public.franchise_followup_tasks where id=p_task_id;
  if not found or v_task.status<>'completed' or not public.franchise_role_can_manage_followup(v_task.owner_department) then raise exception 'Yeniden açma talebi için görev sahibi ve tamamlanmış görev zorunludur'; end if;
  insert into public.franchise_followup_reopen_requests(followup_task_id,requester_id,reason) values(p_task_id,auth.uid(),trim(p_reason)) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.review_franchise_followup_reopen(p_request_id uuid,p_approve boolean,p_note text)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_request public.franchise_followup_reopen_requests%rowtype;
begin
  select * into v_request from public.franchise_followup_reopen_requests where id=p_request_id;
  if not found then raise exception 'Yeniden açma talebi bulunamadı veya erişim yok'; end if;
  if v_request.requester_id=auth.uid() then raise exception 'Talep eden kendi yeniden açma talebini onaylayamaz'; end if;
  if public.franchise_claim_role() not in ('gm','franchise_director') then raise exception 'Yeniden açma ikinci onay yetkisi yok'; end if;
  update public.franchise_followup_reopen_requests set status=case when p_approve then 'approved' else 'rejected' end,reviewer_id=auth.uid(),reviewed_at=now(),review_note=left(trim(coalesce(p_note,'')),2000) where id=p_request_id and status='pending';
  if not found then raise exception 'Yeniden açma talebi daha önce karara bağlandı'; end if;
  if p_approve then
    update public.franchise_followup_tasks set status='open' where id=v_request.followup_task_id;
    update public.franchise_followup_reopen_requests set status='applied' where id=p_request_id;
  end if;
end;
$$;

create or replace view public.franchise_followup_status_v with (security_invoker=true) as
select t.*,
  case when t.status='completed' then 'completed' when t.status='cancelled' then 'cancelled'
       when t.due_at<now() then 'overdue' when t.due_at<=now()+interval '7 days' then 'due_soon' else 'open' end as sla_status
from public.franchise_followup_tasks t;
revoke all on public.franchise_followup_status_v from anon;
grant select on public.franchise_followup_status_v to authenticated,service_role;

revoke all on function public.franchise_role_can_manage_followup(text) from public,anon;
revoke all on function public.franchise_followup_scope_guard() from public,anon;
revoke all on function public.complete_franchise_followup(uuid,text,text) from public,anon;
revoke all on function public.request_franchise_followup_reopen(uuid,text) from public,anon;
revoke all on function public.review_franchise_followup_reopen(uuid,boolean,text) from public,anon;
grant execute on function public.franchise_role_can_manage_followup(text) to authenticated,service_role;
grant execute on function public.complete_franchise_followup(uuid,text,text) to authenticated;
grant execute on function public.request_franchise_followup_reopen(uuid,text) to authenticated;
grant execute on function public.review_franchise_followup_reopen(uuid,boolean,text) to authenticated;

commit;
