import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('../supabase/migrations/20261105090000_franchise_followup_governance.sql', import.meta.url), 'utf8');

test('30 60 90 completion requires owner evidence and note', () => {
  assert.match(sql,/complete_franchise_followup/);
  assert.match(sql,/evidence_sha256/);
  assert.match(sql,/new\.completed_by<>\(select auth\.uid\(\)\)/);
  assert.match(sql,/franchise_role_can_manage_followup/);
  assert.match(sql,/30\/60\/90 görevinin kapsamı, sahibi ve vadesi değiştirilemez/);
});

test('followup reopen is maker checker and SLA view is invoker secured', () => {
  assert.match(sql,/requester_id<>\(select auth\.uid\(\)\)/);
  assert.match(sql,/kendi yeniden açma talebini onaylayamaz/);
  assert.match(sql,/with \(security_invoker=true\)/i);
  assert.match(sql,/when t\.due_at<now\(\) then 'overdue'/i);
});
