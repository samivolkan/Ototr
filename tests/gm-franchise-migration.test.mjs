import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('../supabase/migrations/20261105010000_franchise_end_to_end.sql', import.meta.url), 'utf8');
const rollback = await readFile(new URL('../supabase/ops/franchise-rollback.sql', import.meta.url), 'utf8');
const acceptance = await readFile(new URL('../supabase/ops/franchise-activation-acceptance.sql', import.meta.url), 'utf8');

test('all franchise tables enable RLS and anon access is revoked', () => {
  const tables = ['franchise_cases','franchise_department_tasks','franchise_staff','franchise_branches','franchise_access_accounts','franchise_followup_tasks','franchise_exceptions','franchise_integration_outbox'];
  for (const table of tables) assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
  assert.match(sql, /revoke all on[\s\S]+from anon/i);
});

test('authorization uses app_metadata and never user_metadata', () => {
  assert.match(sql, /app_metadata/g);
  assert.doesNotMatch(sql, /user_metadata/);
  assert.doesNotMatch(sql, /auth\.role\(\)/);
});

test('activation is invoker-secured, locked and creates all downstream records', () => {
  assert.match(sql, /create or replace function public\.activate_franchise_case/);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /insert into public\.franchise_branches/);
  assert.match(sql, /insert into public\.franchise_access_accounts/);
  assert.match(sql, /insert into public\.franchise_followup_tasks/);
  assert.match(sql, /insert into public\.franchise_integration_outbox/);
  assert.match(sql, /day_no smallint not null check \(day_no in \(30,60,90\)\)/i);
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /dead_letter/i);
  assert.match(sql, /already_active/i);
  assert.match(sql, /<> 36 then raise exception 'Departman görev seti eksik; 36 görev zorunlu'/i);
});

test('maker-checker protects critical gates and prevents self approval', () => {
  assert.match(sql, /exception_type not in \('legal','license','payment'\)/i);
  assert.match(sql, /reviewer_id is null or reviewer_id <> requester_id/i);
  assert.match(sql, /requester_id<>\(select auth\.uid\(\)\)/i);
});

test('private storage and retention controls are fail closed', () => {
  assert.match(sql, /'franchise-private','franchise-private',false,20971520/i);
  assert.match(sql, /create policy franchise_storage_select/i);
  assert.match(sql, /owner_id=\(select auth\.jwt\(\)->>'sub'\)/i);
  assert.match(sql, /create table if not exists public\.franchise_document_retention/i);
  assert.doesNotMatch(sql, /franchise-private'[^;]+public\s*=\s*true/i);
});

test('rollback removes storage policies before dependent franchise tables', () => {
  assert.ok(rollback.indexOf('drop policy if exists franchise_storage_select') < rollback.indexOf('drop table if exists public.franchise_cases'));
  assert.match(rollback, /STAGING ONLY/i);
});

test('database acceptance covers fail-closed, idempotency, counts and outbox recovery', () => {
  assert.match(acceptance, /Eksik görev\/kadro aktivasyonu yanlışlıkla geçti/);
  assert.match(acceptance, /Hesap sayısı yanlış/);
  assert.match(acceptance, /30\/60\/90 görev sayısı yanlış/);
  assert.match(acceptance, /Tekrarlı aktivasyon idempotent değil/);
  assert.match(acceptance, /claim_franchise_outbox/);
  assert.match(acceptance, /rollback;/i);
});
