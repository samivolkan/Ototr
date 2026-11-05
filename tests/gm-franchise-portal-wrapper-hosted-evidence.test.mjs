import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const evidence=JSON.parse(await readFile(new URL('../gm-franchise/portal-wrapper-hosted-evidence.json',import.meta.url),'utf8'));

test('hosted portal privilege boundary evidence is complete and fail-closed',()=>{
  assert.equal(evidence.environment,'ototr-staging');
  assert.equal(evidence.productionDataUsed,false);
  assert.equal(evidence.result,'PASS');
  assert.equal(evidence.releaseDecision,'NO_GO');
  for(const value of Object.values(evidence.checks))assert.equal(value,true);
  assert.deepEqual(evidence.workflowResult,{assignmentStatus:'completed',itemStatus:'confirmed',assignedUserMatched:true});
  for(const value of Object.values(evidence.cleanup))assert.equal(value,0);
  assert.deepEqual(evidence.remainingExternalGates,['R24','R25','R26','R27','R28']);
});
