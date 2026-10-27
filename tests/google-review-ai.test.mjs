import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';

const source = stripTypeScriptTypes((await readFile(new URL('../supabase/functions/google-review-ai/index.ts', import.meta.url), 'utf8')).replace(/^import .*?;\r?\n/, ''));
const goodDraft = { reply: 'Değerlendirmeniz için teşekkür ederiz.\n\nOTOTR Bursa Nilüfer Şube ekibi', tone: 'samimi', requires_human_review: false, risk_reason: '', suggested_route: 'standard', quality_score: 90 };
function responsePayload(draft = goodDraft) { return { status: 'completed', output: [{ type: 'reasoning', summary: [] }, { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(draft) }] }], moderation: { input: { type: 'moderation_result', flagged: false }, output: { type: 'moderation_result', flagged: false } } }; }
const baseBody = { action: 'generate', review: { id: 'fixture-review', rating: 5, comment: 'Özenli hizmet.' }, branch: { id: 'branch-google-nilufer', name: 'Untrusted branch', city: 'Untrusted city', replySignatureName: 'OTORAPOR' } };

function harness(options = {}) {
  const calls = [], authTokens = [];
  let handler;
  const env = { SUPABASE_URL: 'https://fixture.invalid', SUPABASE_ANON_KEY: 'fixture-public', SUPABASE_SERVICE_ROLE_KEY: 'fixture-secret', OPENAI_API_KEY: options.missingKey ? '' : 'fixture-openai-key', OPENAI_MODEL: options.model || '', GOOGLE_BUSINESS_ADMIN_USER_IDS: options.allowlist || '' };
  const sandbox = vm.createContext({
    Request, Response, AbortSignal,
    createClient() { return {
      auth: { async getUser(token) { authTokens.push(token); return options.invalidSession || token === 'fixture-public-api-key' ? { data: { user: null }, error: { message: 'invalid session' } } : { data: { user: { id: options.userId || 'owner', user_metadata: { role: 'admin' } } }, error: null }; } },
      from() { return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: options.noConnection ? null : { connected_by: 'owner' }, error: options.dbError ? { message: 'fixture read failed' } : null }; } }; },
    }; },
    async fetch(url, init) { calls.push({ url, ...init, body: JSON.parse(init.body) }); if (options.timeout) { const error = new Error('fixture timeout'); error.name = 'TimeoutError'; throw error; } return Response.json(options.payload || responsePayload(), { status: options.openaiStatus || 200 }); },
    Deno: { env: { get: name => env[name] }, serve(fn) { handler = fn; } },
  });
  vm.runInContext(source, sandbox);
  return {
    calls, authTokens,
    async request(body = baseBody, authorization = 'Bearer fixture-user-session') {
      const response = await handler(new Request('https://fixture.invalid/ai', { method: 'POST', headers: { ...(authorization ? { authorization } : {}), 'content-type': 'application/json' }, body: JSON.stringify(body) }));
      return { status: response.status, data: await response.json() };
    },
  };
}

test('authorized owner receives complete validated OpenAI draft and canonical signature', async () => {
  const h = harness(), result = await h.request();
  assert.equal(result.status, 200);
  assert.deepEqual(result.data, goodDraft);
  assert.equal(h.calls.length, 1);
  const call = h.calls[0];
  assert.equal(call.url, 'https://api.openai.com/v1/responses');
  assert.equal(call.body.model, 'gpt-5-mini');
  assert.equal(call.body.store, false);
  assert.ok(call.body.max_output_tokens > 450);
  assert.equal(call.body.text.format.type, 'json_schema');
  assert.equal(call.body.text.format.strict, true);
  assert.equal(call.body.moderation.model, 'omni-moderation-latest');
  assert.doesNotMatch(call.body.instructions, /OTORAPOR|Untrusted branch/);
  assert.equal(JSON.parse(call.body.input).sube, 'OTOTR Bursa Nilüfer Şube');
  assert.equal(JSON.parse(call.body.input).musteri_yorumu, baseBody.review.comment);
});

for (const authorization of ['', 'Basic fixture', 'Bearer fixture-public-api-key']) {
  test('a public API key or missing/invalid session cannot spend OpenAI credits', async () => {
    const h = harness(), result = await h.request(baseBody, authorization);
    assert.equal(result.status, 401);
    assert.equal(h.calls.length, 0);
  });
}
test('authenticated branch user with editable admin metadata cannot generate', async () => {
  const h = harness({ userId: 'branch-user' });
  assert.equal((await h.request()).status, 403);
  assert.equal(h.calls.length, 0);
});
test('server allowlist grants access and no connection otherwise fails closed', async () => {
  const allowed = harness({ userId: 'other-admin', allowlist: 'owner, other-admin ' });
  assert.equal((await allowed.request()).status, 200);
  const blocked = harness({ noConnection: true });
  assert.equal((await blocked.request()).status, 403);
  assert.equal(blocked.calls.length, 0);
});
test('database authorization failure never calls OpenAI', async () => {
  const h = harness({ dbError: true });
  assert.equal((await h.request()).status, 503);
  assert.equal(h.calls.length, 0);
});
test('rating-only review is accepted with explicit absence of comment', async () => {
  const h = harness();
  const result = await h.request({ ...baseBody, review: { rating: 5, comment: '' } });
  assert.equal(result.status, 200);
  const input = JSON.parse(h.calls[0].body.input);
  assert.equal(input.musteri_yorumu, '');
  assert.equal(input.yalniz_yildiz, true);
});
for (const [id, signature] of [['branch-google-gebze', 'OTOTR Gebze Şube ekibi'], ['branch-google-inegol', 'OTOTR Bursa İnegöl Şube ekibi']]) {
  test(`each branch uses its own canonical signature: ${id}`, async () => {
    const draft = { ...goodDraft, reply: `Değerlendirmeniz için teşekkür ederiz.\n\n${signature}` };
    const h = harness({ payload: responsePayload(draft) });
    const result = await h.request({ ...baseBody, branch: { id, replySignatureName: 'OTORAPOR' } });
    assert.equal(result.status, 200);
    assert.ok(result.data.reply.endsWith(signature));
    assert.ok(h.calls[0].body.instructions.includes(signature));
    assert.doesNotMatch(h.calls[0].body.instructions, /OTORAPOR/);
  });
}
test('unknown branch and invalid rating fail before OpenAI', async () => {
  const h = harness();
  assert.equal((await h.request({ ...baseBody, branch: { id: 'unknown' } })).status, 400);
  assert.equal((await h.request({ ...baseBody, review: { rating: 0 } })).status, 400);
  assert.equal(h.calls.length, 0);
});
test('incomplete JSON is never treated as a successful reply', async () => {
  const h = harness({ payload: { ...responsePayload(), status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } } });
  const result = await h.request();
  assert.equal(result.status, 502);
  assert.equal(result.data.reply, undefined);
});
test('refusal and moderation flags do not become publishable replies', async () => {
  const refusal = responsePayload(); refusal.output = [{ type: 'message', content: [{ type: 'refusal', refusal: 'Cannot respond' }] }];
  assert.equal((await harness({ payload: refusal }).request()).status, 422);
  const flagged = responsePayload(); flagged.moderation.output.flagged = true;
  assert.equal((await harness({ payload: flagged }).request()).status, 422);
});
test('moderation error or missing moderation does not silently pass', async () => {
  const failed = responsePayload(); failed.moderation.input = { type: 'error', message: 'fixture moderation error' };
  assert.equal((await harness({ payload: failed }).request()).status, 503);
  const absent = responsePayload(); delete absent.moderation;
  assert.equal((await harness({ payload: absent }).request()).status, 503);
});
for (const draft of [{ ...goodDraft, quality_score: 101 }, { ...goodDraft, reply: 'Wrong team signature text' }, { ...goodDraft, extra: 'unexpected' }, { ...goodDraft, requires_human_review: 'false' }]) {
  test('malformed schema or incorrect branch signature is rejected', async () => {
    const result = await harness({ payload: responsePayload(draft) }).request();
    assert.equal(result.status, 502);
    assert.equal(result.data.reply, undefined);
  });
}
test('low rating and legal allegations force human review even if the model misses risk', async () => {
  const h = harness();
  const low = await h.request({ ...baseBody, review: { rating: 1, comment: '' } });
  assert.equal(low.data.requires_human_review, true);
  assert.equal(low.data.suggested_route, 'branch_manager');
  const legal = await h.request({ ...baseBody, review: { rating: 4, comment: 'Avukat ile görüşeceğim.' } });
  assert.equal(legal.data.requires_human_review, true);
  assert.equal(legal.data.suggested_route, 'legal');
});
test('provider credential errors do not expose raw provider message or keys', async () => {
  const h = harness({ openaiStatus: 401, payload: { error: { message: 'Incorrect API key: fixture-sensitive-secret' } } });
  const result = await h.request();
  assert.equal(result.status, 502);
  assert.doesNotMatch(JSON.stringify(result.data), /fixture-sensitive-secret/);
});
test('missing server key reports setup failure without a provider call', async () => {
  const h = harness({ missingKey: true });
  assert.equal((await h.request()).status, 503);
  assert.equal(h.calls.length, 0);
});
