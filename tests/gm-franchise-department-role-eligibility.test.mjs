import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import test from'node:test';
const sql=await readFile(new URL('../supabase/migrations/20261106085909_franchise_department_erp_role_eligibility.sql',import.meta.url),'utf8');
const rollback=await readFile(new URL('../supabase/ops/franchise-rollback.sql',import.meta.url),'utf8');
test('all thirteen departments have an explicit ERP role eligibility mapping',()=>{
 for(const department of ['franchise','finance','accounting','legal','hr','academy','operations','procurement','it','marketing','quality','ohs','architecture'])assert.match(sql,new RegExp(`\\('${department}','`));
 assert.match(sql,/primary key\(department_code,erp_role\)/);assert.match(sql,/alter table public\.franchise_department_erp_role_eligibility enable row level security/);
 assert.match(sql,/revoke all .* from public,anon/i);assert.match(sql,/grant select .* to authenticated,service_role/i);
});
test('candidate directory returns only role-compatible users without active Franchise scope',()=>{
 assert.match(sql,/allowed_departments text\[\]/);assert.match(sql,/array_agg\(e\.department_code order by e\.department_code\)/);
 assert.match(sql,/join public\.franchise_department_erp_role_eligibility e on e\.erp_role=u\.role and e\.is_active/);
 assert.match(sql,/not exists\([\s\S]*franchise_user_scopes[\s\S]*s\.is_active/);
});
test('database trigger rejects a primary owner whose ERP role does not match the department',()=>{
 assert.match(sql,/franchise_primary_owner_erp_role_guard/);assert.match(sql,/new\.assignment_level='primary_responsible'/);assert.match(sql,/e\.department_code=new\.department_code/);
 assert.match(sql,/ERP kullanıcı rolü seçilen departmanla uyumlu değil/);assert.match(rollback,/drop trigger if exists franchise_primary_owner_erp_role_guard_trigger/);
 assert.match(rollback,/drop table if exists public\.franchise_department_erp_role_eligibility/);
});
