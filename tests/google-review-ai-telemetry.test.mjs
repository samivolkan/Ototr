import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

const source = stripTypeScriptTypes((await readFile(new URL('../supabase/functions/_shared/google-review-ai-telemetry.ts', import.meta.url), 'utf8')).replaceAll('export ', ''));
const generationId = '11111111-1111-4111-8111-111111111111';
const workId = '22222222-2222-4222-8222-222222222222';
const branch = 'branch-google-nilufer';
async function fixture(extra = {}) {
  const replyText = 'Sayın Değerli müşterimiz, teşekkür ederiz.';
  const digest = Buffer.from(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(replyText))).toString('hex');
  const generation = { id: generationId, connection_id: 'ototr-primary', branch_id: branch, context: 'generate', status: 'succeeded', review_id: 'google-review', reply_sha256: digest, experiment_id: 'experiment', variant: 'a', ...extra };
  const outcomes = [];
  const db = { from(table) {
    const filters = []; let insert = null;
    return {
      select() { return this; }, eq(key, value) { filters.push(row => row[key] === value); return this; }, maybeSingle() { return this; },
      insert(value) { insert = value; return this; },
      then(resolve, reject) { return Promise.resolve().then(() => {
        if (table === 'google_review_ai_generations') return { data: filters.every(fn => fn(generation)) ? generation : null, error: null };
        assert.equal(table, 'google_review_ai_outcomes');
        if (outcomes.some(row => row.event_key === insert.event_key)) return { error: { code: '23505' } };
        outcomes.push(insert); return { error: null };
      }).then(resolve, reject); }
    };
  } };
  const context = vm.createContext({ crypto: webcrypto, TextEncoder });
  vm.runInContext(source + '\nglobalThis.api = {verifyAiGeneration,recordAiOutcome};', context);
  const item = { id: workId, connection_id: 'ototr-primary', branch_id: branch, kind: 'reply', review_id: 'google-review', version: 4, review_snapshot: { ai_analysis: { generation_id: generationId } } };
  return { ...context.api, db, generation, item, outcomes, replyText };
}

test('verified generation binds the canonical review and exact draft hash', async () => {
  const f = await fixture();
  assert.equal((await f.verifyAiGeneration(f.db, generationId, { reviewId: 'google-review', replyText: f.replyText })).id, generationId);
  await assert.rejects(f.verifyAiGeneration(f.db, generationId, { reviewId: 'another-review' }), /eşleşmiyor/);
  await assert.rejects(f.verifyAiGeneration(f.db, generationId, { reviewId: 'google-review', replyText: 'Different reply' }), /metni kayıtlı/);
});
test('playground, failed or foreign branch generations cannot acquire production outcomes', async () => {
  for (const extra of [{ context: 'playground' }, { status: 'failed' }, { branch_id: 'branch-google-gebze' }]) {
    const f = await fixture(extra);
    await assert.rejects(f.recordAiOutcome(f.db, { item: f.item, actorId: 'actor', action: 'published' }), /eşleşmiyor/);
    assert.equal(f.outcomes.length, 0);
  }
});
test('recorded outcome is idempotent and contains no customer/reply content', async () => {
  const f = await fixture();
  const a = await f.recordAiOutcome(f.db, { item: f.item, actorId: 'actor', action: 'published' });
  const b = await f.recordAiOutcome(f.db, { item: f.item, actorId: 'actor', action: 'published' });
  assert.equal(a.recorded, true); assert.equal(b.replayed, true); assert.equal(f.outcomes.length, 1);
  assert.equal(f.outcomes[0].generation_id, generationId);
  assert.equal(f.outcomes[0].work_item_id, workId);
  assert.ok(!JSON.stringify(f.outcomes).includes(f.replyText));
});
test('demo work item or forged generation IDs cannot write outcomes', async () => {
  const f = await fixture();
  await assert.rejects(f.recordAiOutcome(f.db, { item: { ...f.item, branch_id: 'branch-google-gebze' }, actorId: 'actor', action: 'saved' }), /kapsamıyla/);
  await assert.rejects(f.verifyAiGeneration(f.db, 'bad-id', { reviewId: 'google-review' }), /Geçerli/);
  assert.equal(f.outcomes.length, 0);
});
test('legacy manual drafts without generated origin do not fabricate telemetry', async () => {
  const f = await fixture();
  const result = await f.recordAiOutcome(f.db, { item: { ...f.item, review_snapshot: {} }, actorId: 'actor', action: 'edited' });
  assert.equal(result.recorded, false); assert.equal(result.reason, 'no_generation'); assert.equal(f.outcomes.length, 0);
});
