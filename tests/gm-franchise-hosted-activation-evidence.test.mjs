import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const evidence=JSON.parse(await readFile(new URL('../gm-franchise/hosted-activation-evidence.json',import.meta.url),'utf8'));

test('hosted activation evidence covers staffing, Academy, access and atomic outputs',()=>{
  assert.equal(evidence.environment,'ototr-staging');
  assert.equal(evidence.productionDataUsed,false);
  assert.equal(evidence.executionMode,'single_transaction_rollback');
  assert.equal(evidence.result,'PASS');
  for(const value of Object.values(evidence.checks))assert.equal(value,true);
  for(const value of Object.values(evidence.cleanup))assert.equal(value,0);
  assert.equal(evidence.releaseDecision,'NO_GO');
  assert.match(evidence.verificationBoundary,/cannot SET ROLE/);
});
