import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('../supabase/migrations/20261105040000_franchise_department_rbac.sql', import.meta.url), 'utf8');
const acceptance = await readFile(new URL('../supabase/ops/franchise-rbac-acceptance.sql', import.meta.url), 'utf8');

test('department task policies are scoped and immutable', () => {
  assert.match(sql, /franchise_role_can_manage_department\(department\)/);
  assert.match(sql, /drop policy if exists franchise_task_manage/);
  assert.match(sql, /create policy franchise_task_update[\s\S]*using \(public\.franchise_role_can_manage_department\(department\)\)[\s\S]*with check/i);
  assert.match(sql, /new\.franchise_case_id <> old\.franchise_case_id/);
  assert.match(sql, /new\.department <> old\.department/);
  assert.match(sql, /new\.task_code <> old\.task_code/);
});

test('RBAC acceptance covers cross-department denial', () => {
  assert.match(acceptance, /finance_sees_only_finance_task/);
  assert.match(acceptance, /finance_cannot_update_legal_task/);
  assert.match(acceptance, /task_department_is_immutable/);
});
