import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';

// Executes the real handler with local fixtures. No credentials or network calls.
const source = await readFile(new URL('../supabase/functions/google-business-oauth/index.ts', import.meta.url), 'utf8');
const javascript = stripTypeScriptTypes(source.replace(/^import .*?;\r?\n/, ''));
const keyBytes = new Uint8Array(32).fill(7);
const iv = new Uint8Array(12).fill(3);
const key = await webcrypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
const encrypted = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('fixture-refresh'));
const encryptedRefresh = `${Buffer.from(iv).toString('base64')}.${Buffer.from(encrypted).toString('base64')}`;

function fixture({ authenticated = true, connected = true, userId = 'fixture-owner', allowedUsers = '', savedClientId = 'fixture-client', databaseError = null, googleStatus = 200, googleBody = { reviews: [], nextPageToken: 'next-page' } } = {}) {
  const fetches = [];
  const writes = [];
  let handler;
  const values = {
    SUPABASE_URL: 'https://fixture.supabase.invalid',
    SUPABASE_ANON_KEY: 'fixture-public',
    SUPABASE_SERVICE_ROLE_KEY: 'fixture-server',
    GOOGLE_TOKEN_ENCRYPTION_KEY: Buffer.from(keyBytes).toString('base64'),
    GOOGLE_OAUTH_STATE_SECRET: 'fixture-state-signing',
    GOOGLE_OAUTH_CLIENT_ID: 'fixture-client',
    GOOGLE_OAUTH_CLIENT_SECRET: 'fixture-secret',
    GOOGLE_BUSINESS_ADMIN_USER_IDS: allowedUsers,
  };
  const connection = connected ? { id: 'ototr-primary', connected_by: 'fixture-owner', oauth_client_id: savedClientId, refresh_token_encrypted: encryptedRefresh, connected_at: '2026-10-27T00:00:00Z' } : null;
  const builder = {
    select() { return this; },
    eq() { return this; },
    async maybeSingle() { return { data: connection, error: databaseError }; },
    async upsert(value) { writes.push(value); return { error: null }; },
  };
  const context = vm.createContext({
    URL, URLSearchParams, Request, Response, TextEncoder, TextDecoder, Uint8Array,
    btoa, atob, crypto: webcrypto,
    createClient() {
      return {
        auth: { async getUser() { return authenticated ? { data: { user: { id: userId, app_metadata: {}, user_metadata: { role: 'admin' } } }, error: null } : { data: { user: null }, error: { message: 'invalid fixture session' } }; } },
        from() { return builder; },
      };
    },
    async fetch(url, init = {}) {
      const target = new URL(url);
      fetches.push({ url: target, init });
      if (target.hostname === 'oauth2.googleapis.com') return Response.json({ access_token: 'fixture-access', refresh_token: 'fixture-refresh', scope: 'https://www.googleapis.com/auth/business.manage' });
      assert.ok(['mybusinessaccountmanagement.googleapis.com', 'mybusinessbusinessinformation.googleapis.com', 'mybusiness.googleapis.com'].includes(target.hostname), 'Unexpected external destination');
      return Response.json(googleBody, { status: googleStatus });
    },
    Deno: { env: { get(name) { return values[name]; } }, serve(value) { handler = value; } },
  });
  vm.runInContext(javascript, context, { filename: 'google-business-oauth.js' });
  return {
    fetches, writes,
    setOwner(userId) { connection.connected_by = userId; },
    async call(body, { authorization = 'Bearer fixture-session', method = 'POST', query = '' } = {}) {
      return handler(new Request(`https://fixture.supabase.invalid/functions/v1/google-business-oauth${query}`, {
        method,
        headers: { ...(authorization ? { authorization } : {}), 'content-type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
      }));
    },
  };
}

const opaqueToken = 'a+/= &pageSize=999?ü';
for (const scenario of [
  { action: 'accounts', pathname: '/v1/accounts', hostname: 'mybusinessaccountmanagement.googleapis.com' },
  { action: 'locations', account_id: 'accounts/123', pathname: '/v1/accounts/123/locations', hostname: 'mybusinessbusinessinformation.googleapis.com', pageSize: '100' },
  { action: 'reviews', account_id: '123', location_id: '456', pathname: '/v4/accounts/123/locations/456/reviews', hostname: 'mybusiness.googleapis.com', pageSize: '50' },
]) {
  test(`${scenario.action}: forwards opaque pagination token without query injection`, async () => {
    const f = fixture();
    const response = await f.call({ ...scenario, page_token: opaqueToken });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).nextPageToken, 'next-page');
    const request = f.fetches.at(-1);
    assert.equal(request.url.hostname, scenario.hostname);
    assert.equal(request.url.pathname, scenario.pathname);
    assert.equal(request.url.searchParams.get('pageToken'), opaqueToken);
    assert.equal(request.url.searchParams.getAll('pageToken').length, 1);
    assert.equal(request.url.searchParams.get('pageSize'), scenario.pageSize || null);
    assert.equal(request.init.headers.Authorization, 'Bearer fixture-access');
    if (scenario.action === 'locations') assert.equal(request.url.searchParams.get('readMask'), 'name,title,storeCode,metadata');
  });
}

test('first page omits pageToken and preserves empty results', async () => {
  const f = fixture({ googleBody: { reviews: [], totalReviewCount: 0 } });
  const response = await f.call({ action: 'reviews', account_id: '123', location_id: '456' });
  assert.equal(response.status, 200);
  assert.equal(f.fetches.at(-1).url.searchParams.has('pageToken'), false);
  assert.deepEqual(await response.json(), { reviews: [], totalReviewCount: 0 });
});

for (const authCase of [ { label: 'missing', authorization: '' }, { label: 'invalid', authenticated: false } ]) {
  test(`${authCase.label} ERP authentication rejects before Google requests or writes`, async () => {
    const f = fixture(authCase);
    const response = await f.call({ action: 'reply', account_id: '123', location_id: '456', review_id: 'review', reply: 'fixture' }, authCase);
    assert.equal(response.status, 401);
    assert.match((await response.json()).error, /ERP oturumu/);
    assert.equal(f.fetches.length, 0);
    assert.equal(f.writes.length, 0);
  });
}

for (const body of [
  { action: 'locations', account_id: 'accounts/123/../../other' },
  { action: 'reviews', account_id: 'accounts/123', location_id: '456' },
  { action: 'reviews', account_id: '123', location_id: '456?other=1' },
  { action: 'reply', account_id: '123', location_id: '456', review_id: 'review', reply: '   ' },
]) {
  test(`invalid ${body.action} identifier/body never reaches Google resource API`, async () => {
    const f = fixture();
    const response = await f.call(body);
    assert.equal(response.status, 400);
    assert.equal(f.fetches.filter(item => item.url.hostname !== 'oauth2.googleapis.com').length, 0);
  });
}

for (const [googleStatus, code, message] of [
  [403, 'PERMISSION_DENIED', 'My Business Account Management API has not been used or it is disabled.'],
  [429, 'RESOURCE_EXHAUSTED', 'Quota exceeded for quota metric Requests per minute.'],
]) {
  test(`Google ${googleStatus} reaches client with useful diagnostic code`, async () => {
    const f = fixture({ googleStatus, googleBody: { error: { code: googleStatus, status: code, message } } });
    const response = await f.call({ action: 'accounts' });
    assert.equal(response.status, googleStatus);
    assert.deepEqual(await response.json(), { error: message, code, source: 'google' });
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
  });
}

test('status never returns encrypted connection credentials or contacts Google', async () => {
  const f = fixture();
  const response = await f.call({ action: 'status' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { connected: true, connected_at: '2026-10-27T00:00:00Z', reconnection_required: false });
  assert.equal(f.fetches.length, 0);
});

test('allowlisted operator sees disconnected sync explicitly before Google requests', async () => {
  const f = fixture({ connected: false, allowedUsers: 'fixture-owner' });
  const response = await f.call({ action: 'accounts' });
  assert.equal(response.status, 409);
  assert.equal(f.fetches.length, 0);
});

for (const action of ['start', 'status', 'accounts', 'locations', 'reviews', 'reply']) {
  test(`unprivileged authenticated account cannot perform ${action} even with editable admin metadata`, async () => {
    const f = fixture({ userId: 'fixture-branch-user' });
    const response = await f.call({ action, account_id: '123', location_id: '456', review_id: 'review', reply: 'fixture' });
    assert.equal(response.status, 403);
    assert.equal(f.fetches.length, 0);
    assert.equal(f.writes.length, 0);
  });
}

test('empty connection cannot be bootstrapped by an arbitrary authenticated user', async () => {
  const f = fixture({ connected: false });
  const response = await f.call({ action: 'start' });
  assert.equal(response.status, 403);
  assert.equal(f.fetches.length, 0);
});

test('server allowlist authorizes another general-center operator', async () => {
  const f = fixture({ userId: 'fixture-other-admin', allowedUsers: 'fixture-owner, fixture-other-admin ' });
  const response = await f.call({ action: 'status' });
  assert.equal(response.status, 200);
});

for (const savedClientId of [null, 'retired-google-project-client']) {
  test('legacy or rotated OAuth client requires reconnect without using an old refresh token', async () => {
    const f = fixture({ savedClientId });
    const status = await f.call({ action: 'status' });
    assert.deepEqual(await status.json(), { connected: false, connected_at: '2026-10-27T00:00:00Z', reconnection_required: true });
    const accounts = await f.call({ action: 'accounts' });
    assert.equal(accounts.status, 409);
    assert.equal((await accounts.json()).reconnection_required, true);
    assert.equal(f.fetches.length, 0);
    const start = await f.call({ action: 'start' });
    const auth = new URL((await start.json()).auth_url);
    assert.equal(auth.searchParams.get('client_id'), 'fixture-client');
    assert.equal(auth.searchParams.get('login_hint'), 'dijital@ototr.com');
    assert.equal(auth.searchParams.get('scope'), 'https://www.googleapis.com/auth/business.manage');
    const callback = await f.call(null, { method: 'GET', authorization: '', query: `?${new URLSearchParams({ code: 'fixture-code', state: auth.searchParams.get('state') })}` });
    assert.equal(callback.status, 302);
    assert.equal(f.writes[0].oauth_client_id, 'fixture-client');
    assert.equal(f.writes[0].connected_by, 'fixture-owner');
  });
}

test('database read error fails closed instead of pretending the account is disconnected', async () => {
  const f = fixture({ databaseError: { message: 'fixture database unavailable' } });
  const response = await f.call({ action: 'status' });
  assert.equal(response.status, 503);
  assert.equal(f.fetches.length, 0);
});

test('OAuth callback rechecks ownership after a valid start', async () => {
  const f = fixture();
  const start = await f.call({ action: 'start' });
  assert.equal(start.status, 200);
  const authUrl = new URL((await start.json()).auth_url);
  f.setOwner('fixture-replacement-owner');
  const query = new URLSearchParams({ code: 'fixture-code', state: authUrl.searchParams.get('state') });
  const response = await f.call(null, { method: 'GET', authorization: '', query: `?${query}` });
  assert.equal(response.status, 403);
  assert.equal(f.fetches.length, 0);
  assert.equal(f.writes.length, 0);
});

for (const pageToken of [123, 'x'.repeat(8193)]) {
  test('invalid pagination value rejects without resource fetch', async () => {
    const f = fixture();
    const response = await f.call({ action: 'accounts', page_token: pageToken });
    assert.equal(response.status, 400);
    assert.equal(f.fetches.filter(item => item.url.hostname !== 'oauth2.googleapis.com').length, 0);
  });
}

test('OAuth callback rejects an invalid state before token exchange or writes', async () => {
  const f = fixture();
  const response = await f.call(null, { method: 'GET', authorization: '', query: '?code=fixture&state=bad.signature' });
  assert.ok(response.status >= 400);
  assert.equal(f.fetches.length, 0);
  assert.equal(f.writes.length, 0);
});

test('legacy direct reply cannot bypass the saved draft approval workflow', async () => {
  const f = fixture();
  const response = await f.call({ action: 'reply', account_id: '123', location_id: '456', review_id: 'review/one?two', reply: '  Fixture approved reply  ' });
  assert.ok(response.status >= 400);
  assert.equal(f.fetches.some(request => request.init.method === 'PUT'), false);
});
