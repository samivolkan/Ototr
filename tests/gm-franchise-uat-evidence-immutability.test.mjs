import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const sql=await readFile(new URL('../supabase/migrations/20261105310000_franchise_uat_evidence_immutability.sql',import.meta.url),'utf8');

test('UAT review cannot rewrite executor, scenario or evidence',()=>{
  for(const field of ['release_candidate','scenario_code','revision','executor_id','executor_role','evidence_sha256','result_summary','submitted_at']){
    assert.match(sql,new RegExp(`new\\.${field}<>old\\.${field}`));
  }
  assert.match(sql,/old\.status<>'submitted'/);
  assert.match(sql,/new\.status not in \('approved','rejected'\)/);
  assert.match(sql,/new\.checker_id=old\.executor_id/);
  assert.match(sql,/length\(trim\(coalesce\(new\.checker_note,''\)\)\) not between 10 and 2000/);
  assert.match(sql,/revoke all on function public\.franchise_uat_result_review_guard\(\) from public,anon,authenticated/);
});
