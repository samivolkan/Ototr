import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const sql=await readFile(new URL('../supabase/migrations/20261105340000_franchise_uat_command_boundary.sql',import.meta.url),'utf8');
const commands=['submit_franchise_uat_result','review_franchise_uat_result','sign_franchise_uat_release'];

test('UAT commands bind actor and role server-side behind invoker wrappers',()=>{
  assert.match(sql,/revoke insert,update on public\.franchise_uat_results from authenticated/i);
  assert.match(sql,/revoke insert on public\.franchise_uat_signoffs from authenticated/i);
  for(const name of commands){
    assert.match(sql,new RegExp(`function app_private\\.${name}[\\s\\S]*?security definer`,'i'));
    assert.match(sql,new RegExp(`function public\\.${name}[\\s\\S]*?security invoker`,'i'));
    assert.match(sql,new RegExp(`revoke all on function public\\.${name}`,'i'));
  }
  assert.match(sql,/executor_id,executor_role[\s\S]*?auth\.uid\(\),v_role/i);
  assert.match(sql,/v_result\.executor_id=auth\.uid\(\)/i);
  assert.match(sql,/r\.executor_id<>auth\.uid\(\)/i);
  assert.match(sql,/p_signoff_role='CEO\/Yönetim'[\s\S]*?<>8/i);
});
