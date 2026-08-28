import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { JsonStore } from '../src/store.mjs';

test('JSON deposu kural, aday ve denetim kaydını kalıcı tutar', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'ototr-x-store-'));
  const file = path.join(directory, 'store.json');
  const store = await new JsonStore(file).init();

  await store.upsertRule({ id: 'r1', name: 'Test kuralı' });
  await store.upsertCandidate({ id: 'c1', postId: 'p1', mediaKey: 'm1', status: 'review_pending' });
  await store.addAudit({ type: 'candidate_review', candidateId: 'c1' });

  const reopened = await new JsonStore(file).init();
  assert.equal(reopened.getRule('r1').name, 'Test kuralı');
  assert.equal(reopened.getCandidate('c1').status, 'review_pending');
  assert.equal(reopened.listAudit(10).length, 1);
  assert.equal(reopened.findCandidateBySource('p1', 'm1').id, 'c1');

  await fs.rm(directory, { recursive: true, force: true });
});
