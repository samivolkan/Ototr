import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import test from'node:test';
const sql=await readFile(new URL('../supabase/migrations/20261106091150_franchise_department_staffing_gap_report.sql',import.meta.url),'utf8');
const rollback=await readFile(new URL('../supabase/ops/franchise-rollback.sql',import.meta.url),'utf8');

test('GM staffing requirement report is invoker secured and privacy minimized',()=>{
 assert.match(sql,/list_franchise_department_staffing_requirements/);assert.match(sql,/security invoker/);
 assert.match(sql,/department_code text/);assert.match(sql,/erp_role text/);assert.match(sql,/eligible_candidate_count bigint/);assert.match(sql,/is_covered boolean/);
 assert.doesNotMatch(sql,/email|phone|full_name/i);assert.match(sql,/revoke all .* from public, anon/i);assert.match(sql,/grant execute .* to authenticated, service_role/i);
});

test('staffing report reuses the governed candidate directory and has rollback coverage',()=>{
 assert.match(sql,/list_franchise_department_owner_candidates\(\)/);assert.match(sql,/eligibility\.department_code = any\(candidate\.allowed_departments\)/);
 assert.match(rollback,/drop function if exists public\.list_franchise_department_staffing_requirements\(\)/);
});
