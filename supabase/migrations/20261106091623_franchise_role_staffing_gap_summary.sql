create or replace function public.list_franchise_role_staffing_gaps()
returns table (
  erp_role text,
  required_seats bigint,
  eligible_candidate_count bigint,
  missing_seats bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    eligibility.erp_role,
    count(distinct eligibility.department_code)::bigint as required_seats,
    count(distinct candidate.auth_user_id)::bigint as eligible_candidate_count,
    greatest(
      count(distinct eligibility.department_code) - count(distinct candidate.auth_user_id),
      0
    )::bigint as missing_seats
  from public.franchise_department_erp_role_eligibility eligibility
  left join public.list_franchise_department_owner_candidates() candidate
    on eligibility.department_code = any(candidate.allowed_departments)
  group by eligibility.erp_role
  order by eligibility.erp_role;
$$;

revoke all on function public.list_franchise_role_staffing_gaps() from public, anon;
grant execute on function public.list_franchise_role_staffing_gaps() to authenticated, service_role;
