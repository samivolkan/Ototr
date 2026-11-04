import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { providerConfig, sendProviderRequest, processProviderBatch } from '../supabase/functions/franchise-provider-worker/handler.mjs';

const values = {
  FRANCHISE_SMS_PROVIDER_URL: 'https://staging-messaging.example.invalid/sms',
  FRANCHISE_SMS_PROVIDER_TOKEN: 'test-token',
  FRANCHISE_PROVIDER_ALLOWED_HOSTS: 'staging-messaging.example.invalid'
};
const env = (key) => values[key] || '';
const request = { id: 'REQ-1', channel: 'sms', purpose: 'application_status', recipient_ref: 'CONTACT-1', template_id: 'TPL-1', variables: { status: 'İlk temas' }, idempotency_key: 'franchise:1' };

test('provider config requires HTTPS, allowlist and channel token', () => {
  assert.equal(providerConfig('sms', env).token, 'test-token');
  assert.throws(() => providerConfig('email', env), /PROVIDER_NOT_CONFIGURED/);
  assert.throws(() => providerConfig('sms', (key) => key === 'FRANCHISE_SMS_PROVIDER_URL' ? 'http://unsafe.test' : values[key] || ''), /PROVIDER_HTTPS_REQUIRED/);
});

test('provider request sends idempotency key and accepts strict response', async () => {
  let call;
  const result = await sendProviderRequest(request, { env, fetcher: async (url, options) => {
    call = { url, options };
    return { ok: true, json: async () => ({ status: 'accepted', providerMessageId: 'FAKE-42' }) };
  }});
  assert.equal(call.options.headers['idempotency-key'], 'franchise:1');
  assert.equal(JSON.parse(call.options.body).recipientRef, 'CONTACT-1');
  assert.deepEqual(result, { status: 'accepted', providerMessageId: 'FAKE-42' });
});

test('batch records success and safe error codes without exposing token', async () => {
  const finishes = [];
  const results = await processProviderBatch([request, { ...request, id: 'REQ-2', channel: 'email' }], {
    env,
    fetcher: async () => ({ ok: true, json: async () => ({ status: 'delivered', providerMessageId: 'FAKE-1' }) }),
    finish: async (...args) => finishes.push(args)
  });
  assert.deepEqual(results.map((x) => x.ok), [true, false]);
  assert.equal(finishes[0][1], true);
  assert.equal(finishes[1][4], 'PROVIDER_NOT_CONFIGURED');
  assert.doesNotMatch(JSON.stringify(results), /test-token/);
});

test('provider queue RPC is service-role only and recovers stale leases', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261105030000_franchise_provider_worker.sql', import.meta.url), 'utf8');
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /interval '15 minutes'/);
  assert.match(sql, /attempt_count >= 10 then 'dead_letter'/);
  assert.match(sql, /revoke all on function public\.claim_franchise_provider_requests\(integer\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.claim_franchise_provider_requests\(integer\) to service_role/i);
});
