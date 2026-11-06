import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql=await readFile(new URL('../supabase/migrations/20261106022407_franchise_atomic_primary_owner_assignment.sql',import.meta.url),'utf8');

test('primary owner assignment writes scope and responsibility atomically',()=>{
  assert.match(sql,/security invoker/i);
  assert.match(sql,/v_role<>'gm'/i);
  assert.match(sql,/public\.app_users[\s\S]*auth_user_id=p_user_id[\s\S]*is_active/i);
  assert.match(sql,/insert into public\.franchise_user_scopes/i);
  assert.match(sql,/insert into public\.franchise_department_responsibilities/i);
  assert.match(sql,/different|farklı aktif Franchise departman rolü/i);
  assert.doesNotMatch(sql,/security definer/i);
});

test('assignment RPC exposes no name email phone or raw token',()=>{
  const returned=sql.match(/return jsonb_build_object\(([\s\S]*?)\);/i)?.[1]||'';
  for(const prohibited of ['full_name','email','phone','access_token','user_id']) assert.doesNotMatch(returned,new RegExp(prohibited,'i'));
  assert.match(sql,/revoke all on function[\s\S]*from public,anon/i);
  assert.match(sql,/grant execute on function[\s\S]*to authenticated/i);
});

