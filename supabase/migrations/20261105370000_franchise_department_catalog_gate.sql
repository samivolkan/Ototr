-- Activation requires the exact thirteen-department catalog, three tasks each.
do $$
declare
  v_definition text;
  v_old_gate text := $gate$if (select count(*) from public.franchise_department_tasks where franchise_case_id=p_case_id) <> 39
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
  v_new_gate text := $gate$if (select count(*) from public.franchise_department_tasks where franchise_case_id=p_case_id) <> 39
     or exists (
       select 1
       from (values
         ('Franchise'),('Finans'),('Muhasebe'),('Hukuk'),('İnsan Kaynakları'),('Academy'),
         ('Operasyon'),('Tedarik'),('Bilgi Teknolojileri'),('Pazarlama'),('Kalite'),('İSG'),('Mimari / Proje')
       ) as required_department(department)
       left join lateral (
         select count(*) as task_count
         from public.franchise_department_tasks task
         where task.franchise_case_id=p_case_id
           and task.department=required_department.department
       ) catalog_count on true
       where catalog_count.task_count <> 3
     )
     or exists (
       select 1
       from public.franchise_department_tasks task
       where task.franchise_case_id=p_case_id
         and task.department not in (
           'Franchise','Finans','Muhasebe','Hukuk','İnsan Kaynakları','Academy','Operasyon',
           'Tedarik','Bilgi Teknolojileri','Pazarlama','Kalite','İSG','Mimari / Proje'
         )
     )
  then raise exception 'Departman görev seti eksik; resmi 13 departmanda üçer görev zorunlu'; end if;$gate$;
begin
  select pg_get_functiondef('public.activate_franchise_case(uuid)'::regprocedure) into v_definition;
  if position(v_old_gate in v_definition) = 0 then
    raise exception 'Beklenen 13 departman kapısı bulunamadı; migration güvenli şekilde durduruldu';
  end if;
  execute replace(v_definition, v_old_gate, v_new_gate);
end;
$$;

