begin;

create or replace function public.franchise_role_can_manage_department(p_department text)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case public.franchise_claim_role()
    when 'gm' then true
    when 'franchise_director' then true
    when 'franchise_specialist' then lower(trim(p_department)) = 'franchise'
    when 'finance' then lower(trim(p_department)) in ('finans','finans / muhasebe')
    when 'accounting' then lower(trim(p_department)) in ('muhasebe','finans / muhasebe')
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
  end
$$;

drop policy if exists franchise_task_select on public.franchise_department_tasks;
drop policy if exists franchise_task_manage on public.franchise_department_tasks;

create policy franchise_task_select on public.franchise_department_tasks for select to authenticated
using (
  public.franchise_claim_role() in ('gm','franchise_director')
  or public.franchise_role_can_manage_department(department)
);

create policy franchise_task_insert on public.franchise_department_tasks for insert to authenticated
with check (
  public.franchise_role_can_manage_department(department)
  and (status <> 'completed' or (completed_by = (select auth.uid()) and completed_at is not null))
);

create policy franchise_task_update on public.franchise_department_tasks for update to authenticated
using (public.franchise_role_can_manage_department(department))
with check (
  public.franchise_role_can_manage_department(department)
  and (status <> 'completed' or (completed_by = (select auth.uid()) and completed_at is not null))
);

create or replace function public.franchise_task_immutable_scope()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.franchise_case_id <> old.franchise_case_id or new.department <> old.department or new.task_code <> old.task_code then
    raise exception 'Görev dosyası, departmanı ve kodu değiştirilemez';
  end if;
  return new;
end;
$$;

drop trigger if exists franchise_task_immutable_scope_trigger on public.franchise_department_tasks;
create trigger franchise_task_immutable_scope_trigger
before update on public.franchise_department_tasks
for each row execute function public.franchise_task_immutable_scope();

revoke all on function public.franchise_role_can_manage_department(text) from public, anon;
grant execute on function public.franchise_role_can_manage_department(text) to authenticated, service_role;
revoke all on function public.franchise_task_immutable_scope() from public, anon;

commit;
