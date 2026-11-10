import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const evidence=JSON.parse(await readFile(new URL('../gm-franchise/expanded-intake-hosted-evidence.json',import.meta.url),'utf8'));

test('expanded intake hosted staging evidence is complete and remains fail-closed',()=>{
  assert.equal(evidence.schemaVersion,1);
  assert.equal(evidence.environment,'ototr-staging');
  assert.equal(evidence.productionDataUsed,false);
  assert.equal(evidence.migration.version,'20261110082445');
  assert.equal(evidence.migration.name,'franchise_expanded_intake_channels');
  assert.equal(evidence.result,'PASS');
  assert.equal(evidence.releaseDecision,'NO_GO');
  assert.equal(evidence.channelCodes.length,10);
  assert.equal(new Set(evidence.channelCodes).size,10);
  assert.equal(evidence.phase3AutomationTargetCount,8);
  for(const value of Object.values(evidence.checks))assert.equal(value,true);
  for(const value of Object.values(evidence.cleanup))assert.equal(value,0);
  assert.equal(evidence.rollback.persistentDestruction,false);
  assert.equal(evidence.rollback.franchiseSchemaPreserved,true);
  assert.deepEqual(evidence.remainingExternalGates,['R24','R25','R26','R27','R28']);
});
