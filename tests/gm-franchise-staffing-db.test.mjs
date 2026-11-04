import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('../supabase/migrations/20261105050000_franchise_staffing_gates.sql', import.meta.url), 'utf8');

test('database staffing rules contain all ten mandatory roles', () => {
  for (const key of ['owner','manager','reception','body_paint','mechanical','diagnostic','technical_lead','report_approver','cashier','support']) {
    assert.match(sql, new RegExp(`'standard','${key}'`));
  }
  assert.match(sql, /minimum_count smallint not null/);
  assert.match(sql, /franchise_staffing_is_ready/);
  assert.match(sql, /franchise_branch_staffing_gate_trigger/);
});

test('HR Academy and IT field ownership is enforced by trigger', () => {
  assert.match(sql, /v_role='hr'/);
  assert.match(sql, /İK yalnız işe alım/);
  assert.match(sql, /v_role='academy'/);
  assert.match(sql, /Academy yalnız eğitim/);
  assert.match(sql, /v_role='it'/);
  assert.match(sql, /BT yalnız kimlik bağlantısı/);
  assert.match(sql, /sertifika şartı ve pozisyon sırası değiştirilemez/);
});
