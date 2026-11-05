begin;

create table if not exists public.franchise_portal_assignments (
  id uuid primary key default gen_random_uuid(),
  franchise_case_id uuid not null references public.franchise_cases(id) on delete cascade,
  branch_id uuid references public.franchise_branches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  persona text not null check (persona in ('applicant','dealer','inspector','supplier')),
  assignment_scope text not null check (assignment_scope in ('application','branch','site_visit','procurement_order')),
  reference_code text not null check (reference_code ~ '^[A-Za-z0-9._:-]{3,120}$'),
  status text not null default 'active' check (status in ('active','completed','revoked')),
  assigned_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  revoked_at timestamptz,
  check ((persona='applicant' and assignment_scope='application' and branch_id is null)
    or (persona='dealer' and assignment_scope='branch' and branch_id is not null)
    or (persona='inspector' and assignment_scope='site_visit')
    or (persona='supplier' and assignment_scope='procurement_order')),
  check ((status='active' and completed_at is null and revoked_at is null)
    or (status='completed' and completed_at is not null and revoked_at is null)
    or (status='revoked' and revoked_at is not null))
);
create unique index if not exists franchise_portal_assignment_active_uq on public.franchise_portal_assignments(user_id,persona,assignment_scope,reference_code) where status='active';
create index if not exists franchise_portal_assignment_case_idx on public.franchise_portal_assignments(franchise_case_id,persona,status);

create table if not exists public.franchise_portal_items (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.franchise_portal_assignments(id) on delete cascade,
  item_type text not null check (item_type in ('status','document_request','appointment','message','contract','payment_plan','training','inspection','procurement_order')),
  title text not null check (length(trim(title)) between 3 and 200),
  safe_payload jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open','confirmed','acknowledged','submitted','completed','delivered','cancelled')),
  action_reference text check (action_reference is null or action_reference ~ '^[A-Za-z0-9._:-]{3,120}$'),
  due_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists franchise_portal_items_assignment_idx on public.franchise_portal_items(assignment_id,status,due_at);

create or replace function public.franchise_role_can_manage_portal_persona(p_persona text)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case p_persona
    when 'applicant' then public.franchise_claim_role() in ('gm','franchise_director','franchise_specialist')
    when 'dealer' then public.franchise_claim_role() in ('gm','franchise_director','it')
    when 'inspector' then public.franchise_claim_role() in ('gm','franchise_director','operations','quality')
    when 'supplier' then public.franchise_claim_role() in ('gm','franchise_director','procurement')
    else false end
$$;

create or replace function public.franchise_portal_scope_guard()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_table_name='franchise_portal_assignments' then
    if new.franchise_case_id<>old.franchise_case_id or new.branch_id is distinct from old.branch_id or new.user_id<>old.user_id or new.persona<>old.persona or new.assignment_scope<>old.assignment_scope or new.reference_code<>old.reference_code or new.assigned_by<>old.assigned_by then
      raise exception 'Portal atama kapsamı değiştirilemez';
    end if;
  else
    if new.assignment_id<>old.assignment_id or new.item_type<>old.item_type or new.title<>old.title or new.safe_payload<>old.safe_payload or new.created_by<>old.created_by then
      raise exception 'Portal işi kapsamı ve güvenli yükü değiştirilemez';
    end if;
  end if;
  return new;
end;
$$;
create trigger franchise_portal_assignment_scope_guard_trigger before update on public.franchise_portal_assignments for each row execute function public.franchise_portal_scope_guard();
create trigger franchise_portal_item_scope_guard_trigger before update on public.franchise_portal_items for each row execute function public.franchise_portal_scope_guard();

create or replace function public.franchise_portal_item_privacy_guard()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare v_persona text; v_allowed text[];
begin
  if jsonb_typeof(new.safe_payload)<>'object' then raise exception 'Portal güvenli yükü JSON nesnesi olmalıdır'; end if;
  if public.franchise_jsonb_has_prohibited_integration_key(new.safe_payload) then raise exception 'Portal güvenli yükünde kişisel veya gizli alan olamaz'; end if;
  select persona into v_persona from public.franchise_portal_assignments where id=new.assignment_id;
  v_allowed:=case v_persona
    when 'applicant' then array['status','document_request','appointment','message','contract','payment_plan','training']
    when 'dealer' then array['status','appointment','message','contract','payment_plan','training','procurement_order']
    when 'inspector' then array['appointment','message','inspection']
    when 'supplier' then array['appointment','message','procurement_order']
    else '{}'::text[] end;
  if not new.item_type=any(v_allowed) then raise exception 'Portal işi persona ile uyumsuz'; end if;
  return new;
end;
$$;
create trigger franchise_portal_item_privacy_guard_trigger before insert or update of safe_payload on public.franchise_portal_items for each row execute function public.franchise_portal_item_privacy_guard();

alter table public.franchise_portal_assignments enable row level security;
alter table public.franchise_portal_items enable row level security;
revoke all on public.franchise_portal_assignments,public.franchise_portal_items from anon,authenticated;
grant select on public.franchise_portal_assignments,public.franchise_portal_items to authenticated;
grant all on public.franchise_portal_assignments,public.franchise_portal_items to service_role;

create policy franchise_portal_assignment_select on public.franchise_portal_assignments for select to authenticated using (
  (user_id=(select auth.uid()) and persona=public.franchise_claim_role()) or public.franchise_role_can_manage_portal_persona(persona)
);
create policy franchise_portal_item_select on public.franchise_portal_items for select to authenticated using (
  exists(select 1 from public.franchise_portal_assignments a where a.id=assignment_id and ((a.user_id=(select auth.uid()) and a.persona=public.franchise_claim_role()) or public.franchise_role_can_manage_portal_persona(a.persona)))
);

create or replace function public.create_franchise_portal_assignment(p_case_id uuid,p_branch_id uuid,p_user_id uuid,p_persona text,p_scope text,p_reference_code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_id uuid;
begin
  if not public.franchise_role_can_manage_portal_persona(p_persona) then raise exception 'Bu portal personasına atama yetkisi yok'; end if;
  if p_persona='applicant' and not exists(select 1 from public.franchise_cases where id=p_case_id and applicant_user_id=p_user_id) then raise exception 'Aday yalnız kendi başvurusuna atanabilir'; end if;
  if p_persona='dealer' and not exists(select 1 from public.franchise_branches where id=p_branch_id and franchise_case_id=p_case_id) then raise exception 'Bayi şubesi franchise dosyasıyla eşleşmiyor'; end if;
  insert into public.franchise_portal_assignments(franchise_case_id,branch_id,user_id,persona,assignment_scope,reference_code,assigned_by)
  values(p_case_id,p_branch_id,p_user_id,p_persona,p_scope,trim(p_reference_code),auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.create_franchise_portal_item(p_assignment_id uuid,p_item_type text,p_title text,p_safe_payload jsonb default '{}'::jsonb,p_due_at timestamptz default null)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_assignment public.franchise_portal_assignments%rowtype; v_id uuid;
begin
  select * into v_assignment from public.franchise_portal_assignments where id=p_assignment_id and status='active';
  if not found or not public.franchise_role_can_manage_portal_persona(v_assignment.persona) then raise exception 'Aktif portal ataması bulunamadı veya yetki yok'; end if;
  insert into public.franchise_portal_items(assignment_id,item_type,title,safe_payload,due_at,created_by)
  values(p_assignment_id,p_item_type,trim(p_title),coalesce(p_safe_payload,'{}'::jsonb),p_due_at,auth.uid()) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.close_franchise_portal_assignment(p_assignment_id uuid,p_status text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_assignment public.franchise_portal_assignments%rowtype;
begin
  select * into v_assignment from public.franchise_portal_assignments where id=p_assignment_id and status='active';
  if not found or not public.franchise_role_can_manage_portal_persona(v_assignment.persona) then raise exception 'Aktif portal ataması bulunamadı veya kapatma yetkisi yok'; end if;
  if p_status not in ('completed','revoked') then raise exception 'Portal ataması yalnız tamamlanabilir veya iptal edilebilir'; end if;
  update public.franchise_portal_assignments set status=p_status,completed_at=case when p_status='completed' then now() else null end,revoked_at=case when p_status='revoked' then now() else null end where id=p_assignment_id;
end;
$$;

create or replace function public.complete_franchise_portal_item(p_item_id uuid,p_status text,p_action_reference text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_item public.franchise_portal_items%rowtype; v_assignment public.franchise_portal_assignments%rowtype; v_allowed text[];
begin
  select i.* into v_item from public.franchise_portal_items i where i.id=p_item_id and i.status='open';
  if not found then raise exception 'Açık portal işi bulunamadı'; end if;
  select * into v_assignment from public.franchise_portal_assignments where id=v_item.assignment_id and status='active';
  if not found or v_assignment.user_id<>auth.uid() or v_assignment.persona<>public.franchise_claim_role() then raise exception 'Portal işi yalnız atanmış kullanıcı tarafından tamamlanabilir'; end if;
  v_allowed:=case v_item.item_type
    when 'appointment' then array['confirmed']
    when 'message' then array['acknowledged']
    when 'status' then array['acknowledged']
    when 'contract' then array['acknowledged']
    when 'payment_plan' then array['acknowledged']
    when 'document_request' then array['submitted']
    when 'inspection' then array['submitted']
    when 'training' then array['completed']
    when 'procurement_order' then array['delivered']
    else '{}'::text[] end;
  if not p_status=any(v_allowed) then raise exception 'Portal işi için geçersiz durum geçişi'; end if;
  if p_status in ('submitted','completed','delivered') and coalesce(trim(p_action_reference),'') !~ '^[A-Za-z0-9._:-]{3,120}$' then raise exception 'Güvenli işlem referansı zorunludur'; end if;
  update public.franchise_portal_items set status=p_status,action_reference=nullif(trim(coalesce(p_action_reference,'')),''),completed_at=now() where id=p_item_id;
end;
$$;

create or replace view public.franchise_portal_work_v with (security_invoker=true) as
select a.id assignment_id,a.franchise_case_id,a.branch_id,a.persona,a.assignment_scope,a.reference_code,a.status assignment_status,
       i.id item_id,i.item_type,i.title,i.safe_payload,i.status item_status,i.action_reference,i.due_at,i.completed_at
from public.franchise_portal_assignments a left join public.franchise_portal_items i on i.assignment_id=a.id;
grant select on public.franchise_portal_work_v to authenticated,service_role;

revoke all on function public.franchise_role_can_manage_portal_persona(text) from public,anon;
revoke all on function public.franchise_portal_scope_guard() from public,anon,authenticated;
revoke all on function public.franchise_portal_item_privacy_guard() from public,anon,authenticated;
revoke all on function public.create_franchise_portal_assignment(uuid,uuid,uuid,text,text,text) from public,anon;
revoke all on function public.create_franchise_portal_item(uuid,text,text,jsonb,timestamptz) from public,anon;
revoke all on function public.close_franchise_portal_assignment(uuid,text) from public,anon;
revoke all on function public.complete_franchise_portal_item(uuid,text,text) from public,anon;
grant execute on function public.franchise_role_can_manage_portal_persona(text) to authenticated,service_role;
grant execute on function public.create_franchise_portal_assignment(uuid,uuid,uuid,text,text,text) to authenticated;
grant execute on function public.create_franchise_portal_item(uuid,text,text,jsonb,timestamptz) to authenticated;
grant execute on function public.close_franchise_portal_assignment(uuid,text) to authenticated;
grant execute on function public.complete_franchise_portal_item(uuid,text,text) to authenticated;

commit;
