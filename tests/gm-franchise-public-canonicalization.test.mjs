import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import test from'node:test';

const sql=await readFile(new URL('../supabase/migrations/20261105240000_franchise_public_intake_canonicalization.sql',import.meta.url),'utf8');
const hardening=await readFile(new URL('../supabase/migrations/20261105250000_franchise_public_canonicalization_private.sql',import.meta.url),'utf8');
const acceptance=await readFile(new URL('../supabase/ops/franchise-public-canonicalization-acceptance.sql',import.meta.url),'utf8');

test('public canonicalization is authenticated role scoped and direct bridge update is closed',()=>{
  assert.match(sql,/v_actor uuid := auth\.uid\(\)/i);
  assert.match(sql,/v_role not in \('gm','franchise_director','franchise_specialist'\)/i);
  assert.match(sql,/revoke update on public\.franchise_public_intake_bridge from authenticated/i);
  assert.match(sql,/revoke execute on function public\.canonicalize_public_franchise_application[\s\S]*from public,anon/i);
});

test('only locked ready rows with server-bound three-consent evidence can canonicalize',()=>{
  assert.match(sql,/where source_application_id=p_source_application_id[\s\S]*for update/i);
  assert.match(sql,/status<>'ready_for_canonicalization'/i);
  for(const field of ['privacy_evidence_sha256','processing_evidence_sha256','commercial_evidence_sha256'])assert.match(sql,new RegExp(`v_source\\.${field}`));
  assert.match(sql,/ham payload kopyalamaz/i);
});

test('canonicalization delegates to canonical intake and records maker audit idempotently',()=>{
  assert.match(sql,/public\.submit_franchise_application\(/i);
  assert.match(sql,/'PUBLIC-WEB-'\|\|p_source_application_id::text/i);
  assert.match(sql,/canonicalized_by=v_actor/i);
  assert.match(sql,/if v_bridge\.status='canonicalized' then return v_bridge\.canonical_case_id/i);
  assert.match(acceptance,/retry_is_idempotent/i);
  assert.match(acceptance,/rollback;/i);
});

test('privileged implementation is private and exposed wrapper is security invoker',()=>{
  assert.match(hardening,/function app_private\.canonicalize_public_franchise_application/i);
  assert.match(hardening,/function public\.canonicalize_public_franchise_application[\s\S]*security invoker/i);
  assert.doesNotMatch(hardening,/function public\.canonicalize_public_franchise_application[\s\S]*security definer/i);
  assert.match(hardening,/revoke execute on function app_private\.canonicalize_public_franchise_application[\s\S]*from public,anon/i);
});
