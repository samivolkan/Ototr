create or replace function public.assign_franchise_department_roster(p_roster jsonb)
returns jsonb
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_actor uuid:=(select auth.uid());
  v_item record;
  v_assigned integer:=0;
  v_catalog constant text[]:=array['academy','accounting','architecture','finance','franchise','hr','it','legal','marketing','ohs','operations','procurement','quality'];
begin
  if v_actor is null or (select public.franchise_claim_role())<>'gm' then
    raise exception 'Departman kadrosunu yalnız Genel Müdür atayabilir';
  end if;
  if jsonb_typeof(p_roster)<>'array' or jsonb_array_length(p_roster)<>13 then
    raise exception 'Departman kadrosu tam olarak 13 satır içermelidir';
  end if;
  if exists(
    select 1 from jsonb_array_elements(p_roster) item
    cross join lateral jsonb_object_keys(item) key
    where key not in('department_code','user_id','assignment_note')
  ) then raise exception 'Departman kadrosunda beklenmeyen alan var'; end if;
  if (select count(distinct x.department_code) from jsonb_to_recordset(p_roster) x(department_code text,user_id uuid,assignment_note text))<>13
     or (select array_agg(x.department_code order by x.department_code) from jsonb_to_recordset(p_roster) x(department_code text,user_id uuid,assignment_note text))<>v_catalog
  then raise exception 'Departman kadrosu resmi 13 departmanın her birini bir kez içermelidir'; end if;
  if (select count(distinct x.user_id) from jsonb_to_recordset(p_roster) x(department_code text,user_id uuid,assignment_note text))<>13
  then raise exception 'Her departman için farklı bir ana sorumlu seçilmelidir'; end if;
  if exists(
    select 1 from jsonb_to_recordset(p_roster) x(department_code text,user_id uuid,assignment_note text)
    where x.user_id is null or length(trim(coalesce(x.assignment_note,''))) not between 10 and 500
  ) then raise exception 'Her satırda kullanıcı ve 10-500 karakter atama notu zorunludur'; end if;

  perform pg_advisory_xact_lock(hashtext('public.assign_franchise_department_roster'));
  if exists(select 1 from public.franchise_department_responsibilities where is_active and assignment_level='primary_responsible')
  then raise exception 'Toplu kadro yalnız boş başlangıç organizasyonuna uygulanabilir'; end if;
  if exists(
    select 1 from jsonb_to_recordset(p_roster) x(department_code text,user_id uuid,assignment_note text)
    left join public.app_users u on u.auth_user_id=x.user_id and u.is_active
    where u.id is null or x.user_id=v_actor
  ) then raise exception 'Adaylar aktif Auth bağlantılı ERP kullanıcısı olmalı; Genel Müdür departman sorumlusu olamaz'; end if;
  if exists(
    select 1 from jsonb_to_recordset(p_roster) x(department_code text,user_id uuid,assignment_note text)
    join public.franchise_user_scopes s on s.auth_user_id=x.user_id and s.is_active
  ) then raise exception 'Adaylardan en az birinin mevcut aktif Franchise kapsamı var'; end if;

  -- Lock candidate rows in a stable order to avoid concurrent roster deadlocks.
  perform 1 from public.app_users u
  where u.auth_user_id in(select x.user_id from jsonb_to_recordset(p_roster) x(department_code text,user_id uuid,assignment_note text))
  order by u.id for update;

  for v_item in
    select x.department_code,x.user_id,trim(x.assignment_note) assignment_note
    from jsonb_to_recordset(p_roster) x(department_code text,user_id uuid,assignment_note text)
    order by x.department_code
  loop
    perform public.assign_franchise_primary_department_owner(v_item.department_code,v_item.user_id,v_item.assignment_note);
    v_assigned:=v_assigned+1;
  end loop;

  return jsonb_build_object('assignedDepartments',v_assigned,'complete',v_assigned=13);
end
$$;

revoke all on function public.assign_franchise_department_roster(jsonb) from public,anon;
grant execute on function public.assign_franchise_department_roster(jsonb) to authenticated;

comment on function public.assign_franchise_department_roster(jsonb) is
'GM-only, all-or-nothing initial roster assignment for exactly thirteen distinct department owners.';
