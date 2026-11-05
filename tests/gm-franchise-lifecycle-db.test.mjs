import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('../supabase/migrations/20261105080000_franchise_lifecycle_audit.sql', import.meta.url), 'utf8');

test('database lifecycle only advances sequentially through role owners', () => {
  assert.match(sql,/franchise_stage_owner_allowed/);
  assert.match(sql,/new\.stage<>old\.stage\+1/);
  assert.match(sql,/Aşamalar yalnız sırayla ilerletilebilir/);
  assert.match(sql,/p_expected_stage/);
  assert.match(sql,/old\.stage=0 and new\.stage=1 and not public\.franchise_consents_ready/);
});

test('active stage requires branch and history is append only', () => {
  assert.match(sql,/exists\(select 1 from public\.franchise_branches/);
  assert.match(sql,/Aşama geçmişi değiştirilemez ve silinemez/);
  assert.match(sql,/pg_trigger_depth\(\)<2/);
  assert.match(sql,/insert into public\.franchise_case_stage_history/);
});
