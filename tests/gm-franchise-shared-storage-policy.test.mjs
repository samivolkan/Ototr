import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const sql=await readFile(new URL('../supabase/migrations/20261105280000_shared_storage_policy_isolation.sql',import.meta.url),'utf8');
const shortCircuit=await readFile(new URL('../supabase/migrations/20261105290000_finance_storage_policy_short_circuit.sql',import.meta.url),'utf8');

test('shared Storage finance check is isolated behind a private security-definer helper',()=>{
  assert.match(sql,/function finance_private\.dispute_evidence_request_is_open/);
  assert.match(sql,/security definer[\s\S]*set search_path = pg_catalog, finance/i);
  assert.match(sql,/revoke all on function finance_private\.dispute_evidence_request_is_open\(uuid\) from public, anon/i);
  assert.match(sql,/finance_dispute_evidence_object_insert[\s\S]*dispute_evidence_request_is_open/i);
  assert.doesNotMatch(sql,/from finance\.dispute_evidence_requests r[\s\S]*create policy finance_dispute_evidence_object_insert[\s\S]*from finance\.dispute_evidence_requests/i);
});

test('all finance Storage policies short circuit inside isolated wrappers',()=>{
  for(const channel of ['dispute','payment','expense']){
    assert.match(shortCircuit,new RegExp(`function finance_private\\.storage_${channel}_evidence_access`));
    assert.match(shortCircuit,new RegExp(`finance_${channel}_evidence_object_insert[\\s\\S]*storage_${channel}_evidence_access`));
    assert.match(shortCircuit,new RegExp(`finance_${channel}_evidence_object_select[\\s\\S]*storage_${channel}_evidence_access`));
  }
  assert.match(shortCircuit,/security definer set search_path=/i);
  assert.match(shortCircuit,/if p_bucket<>'ototr-evidence'/i);
});
