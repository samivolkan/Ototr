create or replace function public.list_franchise_department_staffing_requirements()
returns table (
  department_code text,
  erp_role text,
  eligible_candidate_count bigint,
  is_covered boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    eligibility.department_code,
    eligibility.erp_role,
    count(candidate.auth_user_id)::bigint as eligible_candidate_count,
    count(candidate.auth_user_id) > 0 as is_covered
  from public.franchise_department_erp_role_eligibility eligibility
  left join public.list_franchise_department_owner_candidates() candidate
    on eligibility.department_code = any(candidate.allowed_departments)
  group by eligibility.department_code, eligibility.erp_role
  order by eligibility.department_code;
$$;

revoke all on function public.list_franchise_department_staffing_requirements() from public, anon;
grant execute on function public.list_franchise_department_staffing_requirements() to authenticated, service_role;
