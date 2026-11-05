import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const evidence=JSON.parse(await readFile(new URL('../gm-franchise/public-handoff-hosted-evidence.json',import.meta.url),'utf8'));

test('hosted public handoff evidence is synthetic, complete and still fail closed for live domain',()=>{
  assert.equal(evidence.environment,'ototr-staging');
  assert.equal(evidence.edgeFunction.version,11);
  assert.equal(evidence.productionDataUsed,false);
  assert.equal(evidence.result,'PASS');
  for(const value of Object.values(evidence.checks))assert.equal(value,true);
  for(const value of Object.values(evidence.cleanup))assert.equal(value,0);
  assert.match(evidence.verificationBoundary,/does not prove or change.*ototr\.com/i);
  assert.equal(evidence.releaseDecision,'NO_GO');
});
