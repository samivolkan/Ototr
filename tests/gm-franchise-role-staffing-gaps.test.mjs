import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import test from'node:test';
const sql=await readFile(new URL('../supabase/migrations/20261106091623_franchise_role_staffing_gap_summary.sql',import.meta.url),'utf8');
const rollback=await readFile(new URL('../supabase/ops/franchise-rollback.sql',import.meta.url),'utf8');

test('role staffing gap summary counts seats and distinct eligible people',()=>{
 assert.match(sql,/list_franchise_role_staffing_gaps/);assert.match(sql,/count\(distinct eligibility\.department_code\)/);
 assert.match(sql,/count\(distinct candidate\.auth_user_id\)/);assert.match(sql,/greatest\(/);assert.match(sql,/missing_seats bigint/);
});

test('role staffing gap summary is invoker secured and rollback covered',()=>{
 assert.match(sql,/security invoker/);assert.match(sql,/revoke all .* from public, anon/i);assert.match(sql,/grant execute .* to authenticated, service_role/i);
 assert.doesNotMatch(sql,/email|phone|full_name/i);assert.match(rollback,/drop function if exists public\.list_franchise_role_staffing_gaps\(\)/);
});
