import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const sql=await readFile(new URL('../supabase/migrations/20261105330000_franchise_portal_private_implementations.sql',import.meta.url),'utf8');
const functions=['create_franchise_portal_assignment','create_franchise_portal_item','close_franchise_portal_assignment','complete_franchise_portal_item'];

test('portal privileged implementations live in app_private behind invoker wrappers',()=>{
  for(const name of functions){
    assert.match(sql,new RegExp(`function app_private\\.${name}[\\s\\S]*?security definer`,'i'));
    assert.match(sql,new RegExp(`function public\\.${name}[\\s\\S]*?security invoker`,'i'));
    assert.match(sql,new RegExp(`revoke all on function app_private\\.${name}`,'i'));
    assert.match(sql,new RegExp(`revoke all on function public\\.${name}`,'i'));
  }
  assert.match(sql,/set search_path=''/i);
  assert.match(sql,/v_assignment\.user_id<>auth\.uid\(\)/i);
});
