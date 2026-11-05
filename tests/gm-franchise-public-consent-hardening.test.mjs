import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const sql=await readFile(new URL('../supabase/migrations/20261105230000_franchise_public_consent_hardening.sql',import.meta.url),'utf8');

test('public intake stores three distinct consent decisions without legacy backfill',()=>{
  assert.match(sql,/add column if not exists processing_consent boolean/i);
  assert.match(sql,/processing_consent is not null/i);
  assert.doesNotMatch(sql,/update public\.public_franchise_applications/i);
  for(const purpose of ['privacy_evidence_sha256','processing_evidence_sha256','commercial_evidence_sha256']){
    assert.match(sql,new RegExp(purpose+' text','i'));
  }
});

test('database overwrites browser evidence with server-bound sha256 receipts',()=>{
  assert.match(sql,/before insert on public\.public_franchise_applications/i);
  assert.match(sql,/statement_timestamp\(\)/i);
  assert.match(sql,/extensions\.digest\(/i);
  assert.match(sql,/new\.privacy_evidence_sha256 :=/i);
  assert.match(sql,/new\.processing_evidence_sha256 :=/i);
  assert.match(sql,/new\.commercial_evidence_sha256 :=/i);
  assert.match(sql,/revoke execute on function public\.franchise_bind_public_consent_evidence\(\) from public,anon,authenticated/i);
});

test('bridge only marks new complete receipts ready and keeps legacy clients fail closed',()=>{
  assert.match(sql,/when v_ready then 'ready_for_canonicalization'/i);
  assert.match(sql,/else 'awaiting_processing_consent'/i);
  assert.match(sql,/SEPARATE_CONSENTS_VERIFIED/i);
  assert.match(sql,/CONSENT_VERSION_REQUIRED/i);
  assert.match(sql,/on conflict\(source_application_id\) do nothing/i);
});
