import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifest = JSON.parse(await readFile(new URL('../gm-franchise/preproduction-gates.json', import.meta.url), 'utf8'));

test('release remains NO_GO while any mandatory gate is blocked', () => {
  assert.equal(manifest.releaseStatus, 'NO_GO');
  assert.equal(manifest.gates.length, 12);
  assert.ok(manifest.gates.some((gate) => gate.status === 'BLOCKED'));
  assert.ok(manifest.gates.some((gate) => gate.status === 'READY_FOR_STAGING'));
  assert.ok(manifest.gates.every((gate) => ['PASS','READY_FOR_STAGING','BLOCKED'].includes(gate.status)));
  for (const gate of manifest.gates.filter((item) => item.status === 'PASS')) assert.ok(gate.evidence, `${gate.id} needs evidence`);
});
