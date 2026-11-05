drop function if exists public.create_franchise_portal_assignment(uuid,uuid,uuid,text,text,text);
drop function if exists public.create_franchise_portal_item(uuid,text,text,jsonb,timestamptz);
drop function if exists public.close_franchise_portal_assignment(uuid,text);
drop function if exists public.complete_franchise_portal_item(uuid,text,text);

create or replace function app_private.create_franchise_portal_assignment(p_case_id uuid,p_branch_id uuid,p_user_id uuid,p_persona text,p_scope text,p_reference_code text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_id uuid;
begin
  if not public.franchise_role_can_manage_portal_persona(p_persona) then raise exception 'Bu portal personasına atama yetkisi yok'; end if;
  if p_persona='applicant' and not exists(select 1 from public.franchise_cases where id=p_case_id and applicant_user_id=p_user_id) then raise exception 'Aday yalnız kendi başvurusuna atanabilir'; end if;
  if p_persona='dealer' and not exists(select 1 from public.franchise_branches where id=p_branch_id and franchise_case_id=p_case_id) then raise exception 'Bayi şubesi franchise dosyasıyla eşleşmiyor'; end if;
  insert into public.franchise_portal_assignments(franchise_case_id,branch_id,user_id,persona,assignment_scope,reference_code,assigned_by)
  values(p_case_id,p_branch_id,p_user_id,p_persona,p_scope,trim(p_reference_code),auth.uid()) returning id into v_id;
  return v_id;
end $$;

create or replace function app_private.create_franchise_portal_item(p_assignment_id uuid,p_item_type text,p_title text,p_safe_payload jsonb default '{}'::jsonb,p_due_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_assignment public.franchise_portal_assignments%rowtype; v_id uuid;
begin
  select * into v_assignment from public.franchise_portal_assignments where id=p_assignment_id and status='active';
  if not found or not public.franchise_role_can_manage_portal_persona(v_assignment.persona) then raise exception 'Aktif portal ataması bulunamadı veya yetki yok'; end if;
  insert into public.franchise_portal_items(assignment_id,item_type,title,safe_payload,due_at,created_by)
  values(p_assignment_id,p_item_type,trim(p_title),coalesce(p_safe_payload,'{}'::jsonb),p_due_at,auth.uid()) returning id into v_id;
  return v_id;
end $$;

create or replace function app_private.close_franchise_portal_assignment(p_assignment_id uuid,p_status text)
returns void language plpgsql security definer set search_path=''
as $$
declare v_assignment public.franchise_portal_assignments%rowtype;
begin
  select * into v_assignment from public.franchise_portal_assignments where id=p_assignment_id and status='active';
  if not found or not public.franchise_role_can_manage_portal_persona(v_assignment.persona) then raise exception 'Aktif portal ataması bulunamadı veya kapatma yetkisi yok'; end if;
  if p_status not in ('completed','revoked') then raise exception 'Portal ataması yalnız tamamlanabilir veya iptal edilebilir'; end if;
  update public.franchise_portal_assignments set status=p_status,completed_at=case when p_status='completed' then now() else null end,revoked_at=case when p_status='revoked' then now() else null end where id=p_assignment_id;
end $$;

create or replace function app_private.complete_franchise_portal_item(p_item_id uuid,p_status text,p_action_reference text default null)
returns void language plpgsql security definer set search_path=''
as $$
declare v_item public.franchise_portal_items%rowtype; v_assignment public.franchise_portal_assignments%rowtype; v_allowed text[];
begin
  select i.* into v_item from public.franchise_portal_items i where i.id=p_item_id and i.status='open';
  if not found then raise exception 'Açık portal işi bulunamadı'; end if;
  select * into v_assignment from public.franchise_portal_assignments where id=v_item.assignment_id and status='active';
  if not found or v_assignment.user_id<>auth.uid() or v_assignment.persona<>public.franchise_claim_role() then raise exception 'Portal işi yalnız atanmış kullanıcı tarafından tamamlanabilir'; end if;
  v_allowed:=case v_item.item_type
    when 'appointment' then array['confirmed'] when 'message' then array['acknowledged'] when 'status' then array['acknowledged']
    when 'contract' then array['acknowledged'] when 'payment_plan' then array['acknowledged'] when 'document_request' then array['submitted']
    when 'inspection' then array['submitted'] when 'training' then array['completed'] when 'procurement_order' then array['delivered'] else '{}'::text[] end;
  if not p_status=any(v_allowed) then raise exception 'Portal işi için geçersiz durum geçişi'; end if;
  if p_status in ('submitted','completed','delivered') and coalesce(trim(p_action_reference),'') !~ '^[A-Za-z0-9._:-]{3,120}$' then raise exception 'Güvenli işlem referansı zorunludur'; end if;
  update public.franchise_portal_items set status=p_status,action_reference=nullif(trim(coalesce(p_action_reference,'')),''),completed_at=now() where id=p_item_id;
end $$;

revoke all on function app_private.create_franchise_portal_assignment(uuid,uuid,uuid,text,text,text) from public,anon;
revoke all on function app_private.create_franchise_portal_item(uuid,text,text,jsonb,timestamptz) from public,anon;
revoke all on function app_private.close_franchise_portal_assignment(uuid,text) from public,anon;
revoke all on function app_private.complete_franchise_portal_item(uuid,text,text) from public,anon;
grant execute on function app_private.create_franchise_portal_assignment(uuid,uuid,uuid,text,text,text) to authenticated;
grant execute on function app_private.create_franchise_portal_item(uuid,text,text,jsonb,timestamptz) to authenticated;
grant execute on function app_private.close_franchise_portal_assignment(uuid,text) to authenticated;
grant execute on function app_private.complete_franchise_portal_item(uuid,text,text) to authenticated;

create function public.create_franchise_portal_assignment(p_case_id uuid,p_branch_id uuid,p_user_id uuid,p_persona text,p_scope text,p_reference_code text)
returns uuid language sql security invoker set search_path=''
as $$ select app_private.create_franchise_portal_assignment(p_case_id,p_branch_id,p_user_id,p_persona,p_scope,p_reference_code); $$;
create function public.create_franchise_portal_item(p_assignment_id uuid,p_item_type text,p_title text,p_safe_payload jsonb default '{}'::jsonb,p_due_at timestamptz default null)
returns uuid language sql security invoker set search_path=''
as $$ select app_private.create_franchise_portal_item(p_assignment_id,p_item_type,p_title,p_safe_payload,p_due_at); $$;
create function public.close_franchise_portal_assignment(p_assignment_id uuid,p_status text)
returns void language sql security invoker set search_path=''
as $$ select app_private.close_franchise_portal_assignment(p_assignment_id,p_status); $$;
create function public.complete_franchise_portal_item(p_item_id uuid,p_status text,p_action_reference text default null)
returns void language sql security invoker set search_path=''
as $$ select app_private.complete_franchise_portal_item(p_item_id,p_status,p_action_reference); $$;

revoke all on function public.create_franchise_portal_assignment(uuid,uuid,uuid,text,text,text) from public,anon;
revoke all on function public.create_franchise_portal_item(uuid,text,text,jsonb,timestamptz) from public,anon;
revoke all on function public.close_franchise_portal_assignment(uuid,text) from public,anon;
revoke all on function public.complete_franchise_portal_item(uuid,text,text) from public,anon;
grant execute on function public.create_franchise_portal_assignment(uuid,uuid,uuid,text,text,text) to authenticated;
grant execute on function public.create_franchise_portal_item(uuid,text,text,jsonb,timestamptz) to authenticated;
grant execute on function public.close_franchise_portal_assignment(uuid,text) to authenticated;
grant execute on function public.complete_franchise_portal_item(uuid,text,text) to authenticated;
