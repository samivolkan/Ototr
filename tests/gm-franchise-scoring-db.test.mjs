import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const sql=await readFile(new URL('../supabase/migrations/20261105100000_franchise_scoring_board.sql',import.meta.url),'utf8');
test('seven weighted score dimensions and thresholds are exact',()=>{
  assert.equal((sql.match(/^\('standard'/gm)||[]).length,0);
  for(const code of ['financial_capacity','management_experience','brand_ethics_fit','location_potential','operational_capability','background_references','growth_potential'])assert.match(sql,new RegExp(`'${code}'`));
  assert.match(sql,/p_score>=80 then 'strong'/);assert.match(sql,/p_score>=65 then 'conditional'/);assert.match(sql,/p_score>=50 then 'manager_review'/);
  assert.match(sql,/case when count\(\*\)=7/);
});
test('board decision is independent maker checker and gates stage',()=>{
  assert.match(sql,/maker_id<>\(select auth\.uid\(\)\)/);assert.match(sql,/kendi kurul kararını onaylayamaz/);
  assert.match(sql,/Skor önerisinden sapma gerekçesi zorunludur/);
  assert.match(sql,/old\.stage=7 and new\.stage=8/);
  assert.match(sql,/franchise_score_supersedes_board_trigger/);
  assert.match(sql,/b\.superseded_at is null/);
});
