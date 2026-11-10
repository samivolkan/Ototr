import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const base = await readFile(new URL('../supabase/migrations/20261105070000_franchise_record_gates.sql', import.meta.url), 'utf8');
const expanded = await readFile(new URL('../supabase/migrations/20261110082445_franchise_expanded_intake_channels.sql', import.meta.url), 'utf8');
const acceptance = await readFile(new URL('../supabase/ops/franchise-record-gates-acceptance.sql', import.meta.url), 'utf8');
const sql = base+'\n'+expanded;

test('record gates use latest consent receipts and seventeen approved documents', () => {
  assert.match(sql,/distinct on \(purpose\)/i);
  assert.match(expanded,/purpose in \('privacy_notice','data_processing'\) then status='granted'/i);
  assert.match(expanded,/else status in \('granted','withdrawn'\)/i);
  assert.match(acceptance,/optional_commercial_withdrawal_keeps_required_consent_gate/);
  assert.match(sql,/count\(\*\)>0 and bool_and/i);
  assert.match(sql,/d\.status='approved'/i);
  assert.match(sql,/d\.expires_at is null or d\.expires_at>now\(\)/i);
  assert.match(sql,/franchise_branch_record_gate_trigger/);
});

test('document source and digest are immutable after upload', () => {
  assert.match(sql,/evidence_sha256 text/);
  assert.match(sql,/Belge SHA-256 özeti zorunludur/);
  assert.match(sql,/new\.storage_path<>old\.storage_path/);
  assert.match(sql,/new\.evidence_sha256 is distinct from old\.evidence_sha256/);
  assert.equal((sql.match(/^\('standard','/gm)||[]).length,17);
});
