begin;
create index if not exists franchise_uat_results_scenario_code_idx
  on public.franchise_uat_results(scenario_code);
create index if not exists franchise_uat_signoffs_signoff_role_idx
  on public.franchise_uat_signoffs(signoff_role);
commit;
