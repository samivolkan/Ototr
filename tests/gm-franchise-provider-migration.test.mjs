import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('../supabase/migrations/20261105020000_franchise_provider_governance.sql', import.meta.url), 'utf8');
const verify = await readFile(new URL('../supabase/ops/franchise-staging-verify.sql', import.meta.url), 'utf8');
const rollback = await readFile(new URL('../supabase/ops/franchise-rollback.sql', import.meta.url), 'utf8');

test('provider governance persists consent, approved templates and idempotent requests', () => {
  for (const table of ['franchise_consent_receipts', 'franchise_message_templates', 'franchise_provider_requests']) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`revoke all on[\\s\\S]*${table}[\\s\\S]*from anon, authenticated`));
  }
  assert.match(sql, /idempotency_key text not null unique/);
  assert.match(sql, /evidence_sha256 text not null/);
  assert.match(sql, /t\.status = 'approved'/);
});

test('staging verification and rollback include provider governance', () => {
  assert.match(verify, /provider_requests_table_exists/);
  assert.match(verify, /anon_cannot_read_provider_requests/);
  const requestDrop = rollback.indexOf('drop table if exists public.franchise_provider_requests');
  const caseDrop = rollback.indexOf('drop table if exists public.franchise_cases');
  assert.ok(requestDrop >= 0 && requestDrop < caseDrop, 'provider requests must be removed before franchise cases');
});
