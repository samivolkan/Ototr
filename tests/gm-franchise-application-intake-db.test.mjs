import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const base=await readFile(new URL('../supabase/migrations/20261105130000_franchise_application_intake.sql',import.meta.url),'utf8');
const expanded=await readFile(new URL('../supabase/migrations/20261110120000_franchise_expanded_intake_channels.sql',import.meta.url),'utf8');
const sql=base+'\n'+expanded;
const acceptance=await readFile(new URL('../supabase/ops/franchise-application-intake-acceptance.sql',import.meta.url),'utf8');
const rollback=await readFile(new URL('../supabase/ops/franchise-rollback.sql',import.meta.url),'utf8');

test('application intake supports ten channels and one idempotent canonical case',()=>{
  for(const channel of ['web','gm','crm','reference','social','call_center','event_qr','field_team','corporate_partner','bulk_import']) assert.match(expanded,new RegExp(`'${channel}'`));
  assert.match(sql,/idempotency_key text not null unique/);
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(sql,/if found then return v_case_id/);
  assert.match(expanded,/franchise_intake_channel_catalog/);
  assert.match(expanded,/phase3_automation_target/);
  assert.match(expanded,/BATCH- kaynak referansı zorunludur/);
  assert.match(acceptance,/ten_channels_created/);
  assert.match(acceptance,/ten_active_channel_catalog_rows/);
  assert.match(acceptance,/eight_phase3_automation_targets/);
  assert.match(acceptance,/retry_does_not_duplicate_case/);
  assert.match(rollback,/drop table if exists public\.franchise_intake_channel_catalog/);
});

test('application intake creates separate consent evidence without raw identity data',()=>{
  for(const purpose of ['privacy_notice','data_processing','commercial_communication']) assert.match(sql,new RegExp(`'${purpose}'`));
  assert.match(sql,/raw_payload_retained=false/);
  assert.match(sql,/T.C. kimlik numarası doğrudan saklanamaz/);
  assert.match(acceptance,/three_separate_receipts_per_application/);
  assert.match(acceptance,/applicant_sees_only_own_intake/);
});
