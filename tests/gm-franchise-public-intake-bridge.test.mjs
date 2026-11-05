import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('../supabase/migrations/20261105220000_franchise_public_intake_bridge.sql', import.meta.url), 'utf8');

test('legacy public web applications enter a privacy-safe canonicalization queue', () => {
  assert.match(sql, /after insert on public\.public_franchise_applications/i);
  assert.match(sql, /source_application_id uuid primary key/i);
  assert.match(sql, /awaiting_processing_consent/i);
  assert.match(sql, /SEPARATE_PROCESSING_CONSENT_REQUIRED/);
  assert.match(sql, /rejected_missing_privacy/i);
  assert.doesNotMatch(sql, /full_name|phone|payload|request_meta|utm/i);
  assert.match(sql, /on conflict\(source_application_id\) do nothing/i);
});

test('bridge is RLS protected and trigger function is not an exposed RPC', () => {
  assert.match(sql, /alter table public\.franchise_public_intake_bridge enable row level security/i);
  assert.match(sql, /revoke all on public\.franchise_public_intake_bridge from anon/i);
  assert.match(sql, /security definer[\s\S]*set search_path=''/i);
  assert.match(sql, /revoke execute on function public\.franchise_capture_public_application\(\) from public,anon,authenticated/i);
  assert.match(sql, /check \(\(status='canonicalized'\)=\(canonical_case_id is not null\)\)/i);
});
