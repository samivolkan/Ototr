import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('../supabase/migrations/20261105060000_franchise_opening_evidence.sql', import.meta.url), 'utf8');

test('four non-waivable opening evidence gates are structured', () => {
  for (const gate of ['entry_fee_payment','franchise_contract','site_visit','operating_license']) assert.match(sql,new RegExp(`'${gate}'`));
  assert.match(sql,/evidence_sha256 text not null/);
  assert.match(sql,/source_reference text not null/);
  assert.match(sql,/count\(\*\)=4/);
  assert.match(sql,/franchise_branch_evidence_gate_trigger/);
});

test('opening evidence enforces department ownership and maker checker', () => {
  assert.match(sql,/franchise_role_can_manage_opening_gate/);
  assert.match(sql,/maker_id<>\(select auth\.uid\(\)\)/);
  assert.match(sql,/checker_id=\(select auth\.uid\(\)\)/);
  assert.match(sql,/kendi kaydını onaylayamaz/);
  assert.match(sql,/Açılış kanıtının kapsamı ve kaynağı inceleme sırasında değiştirilemez/);
});
