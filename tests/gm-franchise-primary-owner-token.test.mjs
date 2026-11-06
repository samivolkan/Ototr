import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root=new URL('../',import.meta.url);
const migration=await readFile(new URL('supabase/migrations/20261106023000_franchise_primary_owner_token_enforcement.sql',root),'utf8');
const acceptance=await readFile(new URL('supabase/ops/franchise-primary-owner-token-acceptance.sql',root),'utf8');

test('central JWT roles require the single active primary department assignment',()=>{
  assert.match(migration,/assignment_level='primary_responsible'/i);
  assert.match(migration,/r\.is_active/i);
  assert.match(migration,/when 'franchise_director' then 'franchise'/i);
  assert.match(migration,/when 'franchise_specialist' then 'franchise'/i);
  for(const role of ['finance','accounting','legal','hr','academy','operations','procurement','it','marketing','quality','ohs','architecture']){
    assert.match(migration,new RegExp(`when '${role}' then '${role}'`,'i'));
  }
  assert.match(migration,/found and app_private\.franchise_has_active_primary_assignment\(v_user_id,scope_row\.franchise_role\)/i);
});

test('legacy franchise role codes cannot create two active responsible actors',()=>{
  assert.match(migration,/when p_role in \('dealer','inspector','supplier','applicant'\) then true/i);
  assert.doesNotMatch(migration,/when p_role in \('franchise_director','franchise_specialist'\) then true/i);
  assert.match(acceptance,/unassigned_finance_user_is_denied/i);
  assert.match(acceptance,/assigned_finance_owner_is_authorized/i);
});

