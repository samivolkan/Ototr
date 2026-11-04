import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('../supabase/migrations/20261105010000_franchise_end_to_end.sql', import.meta.url), 'utf8');

test('all franchise tables enable RLS and anon access is revoked', () => {
  const tables = ['franchise_cases','franchise_department_tasks','franchise_staff','franchise_branches','franchise_access_accounts','franchise_followup_tasks'];
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
  assert.match(sql, /day_no smallint not null check \(day_no in \(30,60,90\)\)/i);
});
