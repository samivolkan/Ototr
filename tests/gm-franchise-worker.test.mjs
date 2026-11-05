import assert from 'node:assert/strict';
import test from 'node:test';
import { adapterConfig, deliverEvent, processOutboxBatch } from '../supabase/functions/franchise-outbox-worker/handler.mjs';

const values = {
  FRANCHISE_ADAPTER_ALLOWED_HOSTS: 'finance.staging.invalid',
  FRANCHISE_FINANCE_ADAPTER_URL: 'https://finance.staging.invalid/franchise/events',
  FRANCHISE_FINANCE_ADAPTER_TOKEN: 'test-token'
};
const env = (name) => values[name] || '';
const event = { id: 'EVT-1', franchise_case_id: 'FR-1', source: 'finance', event_type: 'royalty_profile.created', payload: { branch_id: 'BR-1' }, contract_version: 1, created_at: '2026-11-05T00:00:00Z' };

test('adapter configuration requires HTTPS and explicit host allowlist', () => {
  assert.equal(adapterConfig('finance', env).url, values.FRANCHISE_FINANCE_ADAPTER_URL);
  assert.throws(() => adapterConfig('finance', (name) => name === 'FRANCHISE_FINANCE_ADAPTER_URL' ? 'http://finance.staging.invalid' : env(name)), /HTTPS/);
  assert.throws(() => adapterConfig('finance', (name) => name === 'FRANCHISE_ADAPTER_ALLOWED_HOSTS' ? 'other.invalid' : env(name)), /izin listesinde/);
});

test('delivery sends minimal event with idempotency key and bearer token', async () => {
  let request;
  const result = await deliverEvent(event, { env, fetcher: async (url, init) => { request = { url, init }; return new Response('', { status: 202 }); } });
  assert.equal(result.status, 202);
  assert.equal(request.init.headers['idempotency-key'], 'EVT-1');
  assert.equal(request.init.headers.authorization, 'Bearer test-token');
  assert.equal(JSON.parse(request.init.body).franchiseCaseId, 'FR-1');
  assert.equal(JSON.parse(request.init.body).contractVersion, 1);
});

test('worker rejects contract drift and prohibited data before network delivery', async () => {
  let calls = 0;
  await assert.rejects(() => deliverEvent({ ...event, payload: { branch_id: 'BR-1', email: 'sentetik@example.invalid' } }, { env, fetcher: async () => { calls++; return new Response('', { status: 200 }); } }), /yasaklı/);
  await assert.rejects(() => deliverEvent({ ...event, contract_version: 2 }, { env, fetcher: async () => { calls++; return new Response('', { status: 200 }); } }), /sürümü/);
  assert.equal(calls, 0);
});

test('worker records both success and failure without leaking tokens', async () => {
  const finishes = [];
  const results = await processOutboxBatch([event, { ...event, id: 'EVT-2' }], {
    env,
    fetcher: async (_url, init) => init.headers['idempotency-key'] === 'EVT-1' ? new Response('', { status: 200 }) : new Response('', { status: 503 }),
    finish: async (...args) => finishes.push(args)
  });
  assert.deepEqual(results.map((x) => x.ok), [true, false]);
  assert.deepEqual(finishes.map((x) => x[1]), [true, false]);
  assert.doesNotMatch(JSON.stringify(results), /test-token/);
});
