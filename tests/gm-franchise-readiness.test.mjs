import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifest = JSON.parse(await readFile(new URL('../gm-franchise/preproduction-gates.json', import.meta.url), 'utf8'));
const decision = JSON.parse(await readFile(new URL('../gm-franchise/preproduction-decision.json', import.meta.url), 'utf8'));

test('release remains NO_GO while any mandatory gate is blocked', () => {
  assert.equal(manifest.releaseStatus, 'NO_GO');
  assert.equal(manifest.gates.length, 12);
  assert.ok(manifest.gates.some((gate) => gate.status === 'BLOCKED'));
  assert.ok(manifest.gates.some((gate) => gate.status === 'READY_FOR_STAGING'));
  assert.ok(manifest.gates.every((gate) => ['PASS','READY_FOR_STAGING','BLOCKED'].includes(gate.status)));
  for (const gate of manifest.gates.filter((item) => item.status === 'PASS')) assert.ok(gate.evidence, `${gate.id} needs evidence`);
});

test('production decision fails closed until evidence and independent signoffs exist', () => {
  assert.equal(decision.productionDecision, 'NO_GO');
  assert.equal(decision.decision, 'NOT_READY');
  assert.equal(decision.productionDataUsed, false);
  assert.equal(decision.releaseCommit, null);
  assert.ok(decision.signoffs.length >= 6);
  assert.ok(decision.signoffs.every((signoff) => signoff.identitySha256 === null && signoff.signedAtUtc === null));
  const allPassed = manifest.gates.every((gate) => gate.status === 'PASS');
  assert.equal(allPassed, false);
  assert.notEqual(decision.productionDecision, 'GO');
});
