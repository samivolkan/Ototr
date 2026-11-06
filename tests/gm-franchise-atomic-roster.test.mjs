import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import test from'node:test';
const sql=await readFile(new URL('../supabase/migrations/20261106085302_franchise_atomic_department_roster.sql',import.meta.url),'utf8');
const rollback=await readFile(new URL('../supabase/ops/franchise-rollback.sql',import.meta.url),'utf8');
const candidates=await readFile(new URL('../supabase/migrations/20261106085604_franchise_department_candidate_eligibility.sql',import.meta.url),'utf8');
test('atomic roster requires the exact catalog and thirteen distinct active ERP users',()=>{
 assert.match(sql,/jsonb_array_length\(p_roster\)<>13/);assert.match(sql,/count\(distinct x\.department_code\).*<>13/is);assert.match(sql,/count\(distinct x\.user_id\).*<>13/is);
 assert.match(sql,/u\.auth_user_id=x\.user_id and u\.is_active/);assert.match(sql,/x\.user_id=v_actor/);assert.match(sql,/existing active Franchise scope|mevcut aktif Franchise kapsamı/i);
});
test('candidate directory excludes GM and any user with an active Franchise scope',()=>{
 assert.match(candidates,/not exists\([\s\S]*franchise_user_scopes[\s\S]*s\.auth_user_id=u\.auth_user_id and s\.is_active/);
 assert.match(candidates,/security invoker/i);assert.match(candidates,/revoke all .* from public,anon/i);assert.doesNotMatch(candidates,/email|phone/i);
});
test('atomic roster serializes and delegates all writes inside one invoker transaction',()=>{
 assert.match(sql,/security invoker/i);assert.doesNotMatch(sql,/security definer/i);assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/order by u\.id for update/);
 assert.match(sql,/perform public\.assign_franchise_primary_department_owner/);assert.match(sql,/v_assigned=13/);assert.match(sql,/revoke all .* from public,anon/i);assert.match(sql,/grant execute .* to authenticated/i);
 assert.match(rollback,/drop function if exists public\.assign_franchise_department_roster\(jsonb\)/);
});
