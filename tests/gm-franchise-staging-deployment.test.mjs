import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const deployment = JSON.parse(await readFile(new URL('../gm-franchise/staging-worker-deployment.json', import.meta.url), 'utf8'));

test('staging workers are recorded as fail-closed and not provider-configured', () => {
  assert.equal(deployment.environment, 'staging');
  assert.equal(deployment.productionDataUsed, false);
  assert.equal(deployment.providerSecretsConfigured, false);
  assert.equal(deployment.externalEndpointsConfigured, false);
  assert.equal(deployment.functions.length, 2);
  for (const fn of deployment.functions) {
    assert.equal(fn.status, 'ACTIVE');
    assert.equal(fn.version, 1);
    assert.equal(fn.verifyJwt, true);
    assert.match(fn.bundleSha256, /^[0-9a-f]{64}$/);
    assert.equal(fn.unauthenticatedProbeStatus, 401);
  }
  assert.deepEqual(deployment.functions.map((x) => x.slug).sort(), ['franchise-outbox-worker','franchise-provider-worker']);
});
