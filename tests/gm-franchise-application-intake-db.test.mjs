import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql=await readFile(new URL('../supabase/migrations/20261105130000_franchise_application_intake.sql',import.meta.url),'utf8');
const acceptance=await readFile(new URL('../supabase/ops/franchise-application-intake-acceptance.sql',import.meta.url),'utf8');

test('application intake supports six channels and one idempotent canonical case',()=>{
  for(const channel of ['web','gm','crm','reference','social','call_center']) assert.match(sql,new RegExp(`'${channel}'`));
  assert.match(sql,/idempotency_key text not null unique/);
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(sql,/if found then return v_case_id/);
  assert.match(acceptance,/six_channels_created/);
  assert.match(acceptance,/retry_does_not_duplicate_case/);
});

test('application intake creates separate consent evidence without raw identity data',()=>{
  for(const purpose of ['privacy_notice','data_processing','commercial_communication']) assert.match(sql,new RegExp(`'${purpose}'`));
  assert.match(sql,/raw_payload_retained=false/);
  assert.match(sql,/T.C. kimlik numarası doğrudan saklanamaz/);
  assert.match(acceptance,/three_separate_receipts_per_application/);
  assert.match(acceptance,/applicant_sees_only_own_intake/);
});
