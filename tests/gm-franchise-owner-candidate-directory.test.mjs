import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql=await readFile(new URL('../supabase/migrations/20261106022719_franchise_department_owner_candidate_directory.sql',import.meta.url),'utf8');

test('candidate directory is GM-only, invoker secured and privacy minimized',()=>{
  assert.match(sql,/security invoker/i);
  assert.doesNotMatch(sql,/security definer/i);
  assert.match(sql,/franchise_claim_role\(\)\)<>'gm'/i);
  assert.match(sql,/u\.is_active and u\.auth_user_id is not null/i);
  assert.match(sql,/returns table\(auth_user_id uuid,display_name text,erp_role text\)/i);
  for(const prohibited of ['email','phone']) assert.doesNotMatch(sql.match(/return query([\s\S]*?)end/i)?.[1]||'',new RegExp(prohibited,'i'));
  assert.match(sql,/revoke all on function[\s\S]*from public,anon/i);
});

