import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('../supabase/migrations/20261105070000_franchise_record_gates.sql', import.meta.url), 'utf8');

test('record gates use latest consent receipts and seventeen approved documents', () => {
  assert.match(sql,/distinct on \(purpose\)/i);
  assert.match(sql,/count\(\*\)=3 and bool_and\(status='granted'\)/i);
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
