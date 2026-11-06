import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migration = await readFile(new URL('../supabase/migrations/20261105140000_franchise_financial_terms.sql', import.meta.url), 'utf8');
const acceptance = await readFile(new URL('../supabase/ops/franchise-finance-acceptance.sql', import.meta.url), 'utf8');
const rollback = await readFile(new URL('../supabase/ops/franchise-rollback.sql', import.meta.url), 'utf8');
const html = await readFile(new URL('../gm-franchise/index.html', import.meta.url), 'utf8');

test('finance terms encode binding commercial decisions', () => {
  assert.match(migration, /opening_collection_threshold numeric\(5,2\).*default 100/i);
  assert.match(migration, /royalty_basis text.*vat_inclusive_customer_collection/i);
  assert.match(migration, /royalty_rate numeric\(5,2\).*default 10/i);
  assert.match(migration, /advertising_fund_rate numeric\(5,2\).*default 0/i);
  assert.match(migration, /royalty_exemption_months in \(0,6,12\)/i);
  assert.match(html, /signed:0,paid:0,slug:"",roy:10,giris:250000/);
});

test('finance and accounting use maker-checker and immutable references', () => {
  assert.match(migration, /checker_id is null or checker_id <> maker_id/i);
  assert.match(migration, /Hazırlayan kendi finans koşulunu onaylayamaz/i);
  assert.match(migration, /Kaydı hazırlayan tahsilatı onaylayamaz/i);
  assert.match(migration, /unique\(financial_term_id,receipt_reference\)/i);
});

test('branch opening trusts approved ledger calculation, not summary percentage', () => {
  assert.match(migration, /franchise_entry_fee_collection_percent/i);
  assert.match(migration, /franchise_branch_finance_gate_trigger/i);
  assert.match(acceptance, /Yüzde 99 finans kapısını yanlışlıkla açtı/i);
  assert.match(acceptance, /Yüzde 100 finans kapısını açmadı/i);
});

test('late payment policy never automatically stops operations', () => {
  assert.match(migration, /restriction_review/);
  assert.match(migration, /automatic_operational_stop/);
  assert.match(acceptance, /automatic_operational_stop=false/);
});

test('rollback removes finance dependencies before franchise cases', () => {
  assert.ok(rollback.indexOf('drop table if exists public.franchise_financial_terms') < rollback.indexOf('drop table if exists public.franchise_cases'));
});
