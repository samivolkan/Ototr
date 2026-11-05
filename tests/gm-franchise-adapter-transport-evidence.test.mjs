import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const evidence=JSON.parse(await readFile(new URL('../gm-franchise/adapter-transport-hosted-evidence.json',import.meta.url),'utf8'));

test('hosted adapter transport evidence covers thirteen sources without claiming real providers',()=>{
  assert.equal(evidence.productionDataUsed,false);
  assert.equal(evidence.sources.length,13);
  assert.equal(new Set(evidence.sources).size,13);
  assert.ok(evidence.sources.includes('accounting'));
  assert.equal(evidence.delivered,13);
  assert.equal(evidence.finished,13);
  assert.equal(evidence.result,'PASS');
  for(const value of Object.values(evidence.checks))assert.equal(value,true);
  assert.equal(evidence.realDepartmentEndpointsConfigured,false);
  assert.equal(evidence.providerSecretsConfigured,false);
  assert.equal(evidence.releaseDecision,'NO_GO');
});
