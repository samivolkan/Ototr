import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import test from'node:test';

const migration=await readFile(new URL('../supabase/migrations/20261106095513_franchise_uat_roster_readiness.sql',import.meta.url),'utf8');
const rollback=await readFile(new URL('../supabase/ops/franchise-rollback.sql',import.meta.url),'utf8');

test('UAT roster readiness returns nine privacy-minimized assignment counts',()=>{
  assert.match(migration,/from public\.franchise_uat_signoff_catalog catalog/i);
  assert.match(migration,/count\(distinct responsibility\.user_id\)/i);
  assert.match(migration,/assignment_level='primary_responsible'/i);
  assert.match(migration,/GENERAL_MANAGER/i);
  for(const column of ['signoff_role','sequence_no','required_scenarios','eligible_primary_count','is_staffed'])assert.match(migration,new RegExp(column));
  for(const forbidden of ['email text','full_name text','phone text','user_id uuid'])assert.doesNotMatch(migration,new RegExp(forbidden,'i'));
});

test('UAT roster readiness is authenticated, role-gated and invoker wrapped',()=>{
  assert.match(migration,/UAT roster on kontrol yetkisi yok/);
  assert.match(migration,/create function public\.list_franchise_uat_roster_readiness\(\)[\s\S]*security invoker/i);
  assert.match(migration,/revoke all on function public\.list_franchise_uat_roster_readiness\(\) from public,anon/i);
  assert.match(migration,/revoke all on function app_private\.list_franchise_uat_roster_readiness\(\) from public,anon,authenticated/i);
});

test('rollback removes public UAT readiness wrapper before private implementation',()=>{
  const wrapper=rollback.indexOf('drop function if exists public.list_franchise_uat_roster_readiness');
  const implementation=rollback.indexOf('drop function if exists app_private.list_franchise_uat_roster_readiness');
  assert.ok(wrapper>=0&&implementation>wrapper);
});
