-- Finance and Accounting are independent owners in the opening workflow.
create or replace function public.franchise_role_can_manage_department(p_department text)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case (select auth.jwt() -> 'app_metadata' ->> 'franchise_role')
    when 'gm' then true
    when 'franchise_director' then true
    when 'franchise_specialist' then lower(trim(p_department)) = 'franchise'
    when 'finance' then lower(trim(p_department)) = 'finans'
    when 'accounting' then lower(trim(p_department)) = 'muhasebe'
    when 'legal' then lower(trim(p_department)) = 'hukuk'
    when 'hr' then lower(trim(p_department)) in ('ik','insan kaynakları')
    when 'academy' then lower(trim(p_department)) = 'academy'
    when 'operations' then lower(trim(p_department)) = 'operasyon'
    when 'procurement' then lower(trim(p_department)) = 'tedarik'
    when 'it' then lower(trim(p_department)) in ('bt','bilgi teknolojileri')
    when 'marketing' then lower(trim(p_department)) = 'pazarlama'
    when 'quality' then lower(trim(p_department)) = 'kalite'
    when 'ohs' then lower(trim(p_department)) in ('isg','i̇sg')
    when 'architecture' then lower(trim(p_department)) in ('mimari','mimari / proje')
    else false
  end;
$$;

do $$
declare
  v_definition text;
  v_old_gate text := $gate$if (select count(*) from public.franchise_department_tasks where franchise_case_id=p_case_id) <> 36 then raise exception 'Departman görev seti eksik; 36 görev zorunlu'; end if;$gate$;
  v_new_gate text := $gate$if (select count(*) from public.franchise_department_tasks where franchise_case_id=p_case_id) <> 39
     or (select count(distinct lower(trim(department))) from public.franchise_department_tasks where franchise_case_id=p_case_id) <> 13
     or exists (
       select 1 from public.franchise_department_tasks
       where franchise_case_id=p_case_id
       group by lower(trim(department))
       having count(*) <> 3
     )
     or not exists (select 1 from public.franchise_department_tasks where franchise_case_id=p_case_id and lower(trim(department))='finans')
     or not exists (select 1 from public.franchise_department_tasks where franchise_case_id=p_case_id and lower(trim(department))='muhasebe')
  then raise exception 'Departman görev seti eksik; 13 departman ve 39 görev zorunlu'; end if;$gate$;
  v_old_outbox text := $outbox$(p_case_id,'finance','royalty_profile.created',jsonb_build_object('branch_id',v_branch.id)),
    (p_case_id,'hr','staffing_plan.created'$outbox$;
  v_new_outbox text := $outbox$(p_case_id,'finance','royalty_profile.created',jsonb_build_object('branch_id',v_branch.id)),
    (p_case_id,'accounting','chart_of_accounts.created',jsonb_build_object('branch_id',v_branch.id,'chart_reference','pending-provider-assignment')),
    (p_case_id,'hr','staffing_plan.created'$outbox$;
begin
  select pg_get_functiondef('public.activate_franchise_case(uuid)'::regprocedure) into v_definition;
  if position(v_old_gate in v_definition) = 0 then
    raise exception 'Beklenen 36 görev aktivasyon kapısı bulunamadı; migration güvenli şekilde durduruldu';
  end if;
  if position(v_old_outbox in v_definition) = 0 then
    raise exception 'Beklenen Finans outbox bloğu bulunamadı; migration güvenli şekilde durduruldu';
  end if;
  v_definition := replace(v_definition, v_old_gate, v_new_gate);
  v_definition := replace(v_definition, v_old_outbox, v_new_outbox);
  execute v_definition;
end;
$$;

revoke all on function public.franchise_role_can_manage_department(text) from public, anon;
grant execute on function public.franchise_role_can_manage_department(text) to authenticated, service_role;

