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

function fixture({ authenticated = true, connected = true, userId = 'fixture-owner', allowedUsers = '', savedClientId = 'fixture-client', databaseError = null, googleStatus = 200, googleBody = { reviews: [], nextPageToken: 'next-page' }, googleResponse, abortSync = false } = {}) {
  const fetches = [];
  const writes = [];
  const stats = { auth: 0, connectionReads: 0, timeouts: [] };
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
    async maybeSingle() { stats.connectionReads++; return { data: connection, error: databaseError }; },
    async upsert(value) { writes.push(value); return { error: null }; },
  };
  const context = vm.createContext({
    URL, URLSearchParams, Request, Response, TextEncoder, TextDecoder, Uint8Array,
    btoa, atob, crypto: webcrypto,
    AbortSignal: { timeout(ms) { stats.timeouts.push(ms); return abortSync ? AbortSignal.abort() : AbortSignal.timeout(ms); } },
    createClient() {
      return {
        auth: { async getUser() { stats.auth++; return authenticated ? { data: { user: { id: userId, app_metadata: {}, user_metadata: { role: 'admin' } } }, error: null } : { data: { user: null }, error: { message: 'invalid fixture session' } }; } },
        from() { return builder; },
      };
    },
    async fetch(url, init = {}) {
      const target = new URL(url);
      fetches.push({ url: target, init });
      if (init.signal?.aborted) throw init.signal.reason;
      if (target.hostname === 'oauth2.googleapis.com') return Response.json({ access_token: 'fixture-access', refresh_token: 'fixture-refresh', scope: 'https://www.googleapis.com/auth/business.manage' });
      assert.ok(['mybusinessaccountmanagement.googleapis.com', 'mybusinessbusinessinformation.googleapis.com', 'mybusiness.googleapis.com'].includes(target.hostname), 'Unexpected external destination');
      if (googleResponse) return googleResponse(target, init);
      return Response.json(googleBody, { status: googleStatus });
    },
    Deno: { env: { get(name) { return values[name]; } }, serve(value) { handler = value; } },
  });
  vm.runInContext(javascript, context, { filename: 'google-business-oauth.js' });
  return {
    fetches, writes, stats,
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

for (const action of ['start', 'status', 'accounts', 'locations', 'reviews', 'sync_reviews', 'reply']) {
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

const syncLocations = [
  { name: 'locations/101', storeCode: '13674839659006303129', title: 'Fixture Nilüfer' },
  { name: 'locations/102', storeCode: '05971556162544786377', title: 'Fixture Gebze' },
  { name: 'locations/103', storeCode: '03710924650104046695', title: 'Fixture İnegöl' },
];
const syncBranchNames = ['branch-google-nilufer', 'branch-google-gebze', 'branch-google-inegol'];
function syncResponse(overrides = {}) {
  return async (url, init) => {
    if (url.hostname === 'mybusinessaccountmanagement.googleapis.com') return overrides.accounts ? overrides.accounts(url, init) : Response.json({ accounts: [{ name: 'accounts/114698852482564472140' }] });
    if (url.hostname === 'mybusinessbusinessinformation.googleapis.com') return overrides.locations ? overrides.locations(url, init) : Response.json({ locations: syncLocations });
    return overrides.reviews ? overrides.reviews(url, init) : Response.json({ reviews: [{ reviewId: `fixture-${url.pathname.split('/')[4]}`, starRating: 'FIVE' }], totalReviewCount: 1, averageRating: 5 });
  };
}

test('batch sync reuses one auth, connection read and refresh token for all branches and pages', async () => {
  const f = fixture({ googleResponse: syncResponse({ reviews(url) {
    assert.equal(url.searchParams.get('pageSize'), '50');
    assert.equal(url.searchParams.get('orderBy'), 'updateTime desc');
    const next = url.searchParams.get('pageToken');
    return Response.json({ reviews: [{ reviewId: next ? 'second' : 'first' }], totalReviewCount: 2, averageRating: 4.5, ...(next ? {} : { nextPageToken: opaqueToken }) });
  } }) });
  const response = await f.call({ action: 'sync_reviews' });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.branches.map(b => b.branch_id), syncBranchNames);
  assert.ok(result.branches.every(b => b.reviews.length === 2 && b.pagination_complete && b.review_count_matches && b.account_id === '114698852482564472140'));
  assert.equal(f.stats.auth, 1); assert.equal(f.stats.connectionReads, 1);
  assert.equal(f.fetches.filter(r => r.url.hostname === 'oauth2.googleapis.com').length, 1);
  assert.equal(f.fetches.filter(r => r.url.searchParams.get('pageToken') === opaqueToken).length, 3);
  assert.deepEqual(f.stats.timeouts, [25000]);
  assert.ok(f.fetches.every(r => r.init.signal === f.fetches[0].init.signal));
  assert.equal(f.fetches.some(r => r.init.method === 'PUT'), false); assert.equal(f.writes.length, 0);
});

test('batch sync paginates discovery, limits concurrency to three and only fetches requested branches', async () => {
  let active = 0, peak = 0;
  const f = fixture({ googleResponse: syncResponse({
    accounts(url) { return Response.json(url.searchParams.has('pageToken') ? { accounts: [{ name: 'accounts/5' }, { name: 'accounts/6' }] } : { accounts: [1, 2, 3, 4].map(id => ({ name: `accounts/${id}` })), nextPageToken: opaqueToken }); },
    async locations(url) {
      active++; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 5)); active--;
      return Response.json(url.searchParams.has('pageToken') ? { locations: [syncLocations[2]] } : { locations: syncLocations.slice(0, 2), nextPageToken: opaqueToken });
    },
  }) });
  const result = await (await f.call({ action: 'sync_reviews', branch_ids: ['branch-google-inegol'] })).json();
  assert.equal(peak, 3);
  assert.equal(result.branches.length, 1); assert.deepEqual(result.errors, []);
  assert.equal(result.branches[0].account_id, '1');
  assert.equal(f.fetches.filter(r => r.url.hostname === 'mybusiness.googleapis.com').length, 1);
  assert.equal(f.fetches.filter(r => r.url.hostname === 'mybusinessbusinessinformation.googleapis.com' && r.url.searchParams.get('pageToken') === opaqueToken).length, 6);
});

test('three branch review reads run concurrently and prefer the existing group wrapper', async () => {
  let active = 0, peak = 0;
  const f = fixture({ googleResponse: syncResponse({
    accounts() { return Response.json({ accounts: [{ name: 'accounts/114698852482564472140' }, { name: 'accounts/999' }] }); },
    async reviews() { active++; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 5)); active--; return Response.json({ totalReviewCount: 0 }); },
  }) });
  const result = await (await f.call({ action: 'sync_reviews' })).json();
  assert.equal(peak, 3);
  assert.ok(result.branches.every(b => b.account_id === '114698852482564472140' && b.review_count_matches));
});

for (const branch_ids of [null, [], ['other'], ['__proto__'], ['branch-google-inegol', 1], ['branch-google-inegol', 'branch-google-inegol', 'branch-google-inegol', 'branch-google-inegol']]) {
  test('batch sync rejects invalid branch selection before refreshing Google token', async () => {
    const f = fixture(); assert.equal((await f.call({ action: 'sync_reviews', branch_ids })).status, 400); assert.equal(f.fetches.length, 0);
  });
}

test('batch Google 429 is isolated to its branch and preserves upstream diagnostics', async () => {
  const f = fixture({ googleResponse: syncResponse({ reviews(url) { return url.pathname.includes('/locations/102/') ? Response.json({ error: { message: 'Fixture quota', status: 'RESOURCE_EXHAUSTED' } }, { status: 429 }) : Response.json({ totalReviewCount: 0 }); } }) });
  const result = await (await f.call({ action: 'sync_reviews' })).json();
  assert.equal(result.branches.length, 2);
  assert.deepEqual(result.errors, [{ branch_id: 'branch-google-gebze', error: 'Fixture quota', status: 429, code: 'RESOURCE_EXHAUSTED', source: 'google' }]);
});

test('batch discovery failure preserves HTTP 403 and never claims an empty sync', async () => {
  const f = fixture({ googleResponse: syncResponse({ locations() { return Response.json({ error: { message: 'Fixture denied', status: 'PERMISSION_DENIED' } }, { status: 403 }); } }) });
  const response = await f.call({ action: 'sync_reviews' }); assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'PERMISSION_DENIED');
  assert.equal(f.fetches.some(r => r.url.hostname === 'mybusiness.googleapis.com'), false);
});

for (const locations of [[], [{ ...syncLocations[0], storeCode: 'other' }], [syncLocations[0], { ...syncLocations[0], name: 'locations/999' }]]) {
  test('batch exact store-code matching rejects missing or ambiguous locations', async () => {
    const f = fixture({ googleResponse: syncResponse({ locations() { return Response.json({ locations }); } }) });
    const result = await (await f.call({ action: 'sync_reviews', branch_ids: ['branch-google-nilufer'] })).json();
    assert.equal(result.branches.length, 0); assert.equal(result.errors[0].status, 409);
    assert.equal(f.fetches.some(r => r.url.hostname === 'mybusiness.googleapis.com'), false);
  });
}

test('batch deduplicates repeated IDs using newest content and exposes Google count mismatch', async () => {
  const f = fixture({ googleResponse: syncResponse({ reviews(url) { return Response.json(url.searchParams.has('pageToken') ? { reviews: [{ reviewId: 'same', updateTime: '2026-10-25T00:00:00Z' }] } : { reviews: [{ reviewId: 'same', updateTime: '2026-10-26T00:00:00Z', reviewReply: { comment: 'Fixture existing reply' } }], nextPageToken: opaqueToken, totalReviewCount: 2 }); } }) });
  const result = await (await f.call({ action: 'sync_reviews', branch_ids: ['branch-google-nilufer'] })).json();
  assert.equal(result.branches[0].reviews.length, 1); assert.equal(result.branches[0].reviews[0].reviewReply.comment, 'Fixture existing reply');
  assert.equal(result.branches[0].totalReviewCount, 2); assert.equal(result.branches[0].pagination_complete, true); assert.equal(result.branches[0].review_count_matches, false);
});

test('missing Google total remains unknown rather than invented from the loaded list', async () => {
  const f = fixture({ googleResponse: syncResponse({ reviews() { return Response.json({ reviews: [{ reviewId: 'fixture' }] }); } }) });
  const result = await (await f.call({ action: 'sync_reviews', branch_ids: ['branch-google-inegol'] })).json();
  assert.equal(result.branches[0].totalReviewCount, null); assert.equal(result.branches[0].review_count_matches, null);
});

for (const response of [
  () => Response.json({ reviews: [], nextPageToken: 'cycle' }),
  () => Response.json({ reviews: [{ starRating: 'FIVE' }] }),
  () => Response.json({ reviews: [{ reviewId: 'fixture', name: 'accounts/999/locations/999/reviews/fixture' }] }),
  () => Response.json({ reviews: 'invalid' }),
  () => new Response('{broken-json'),
  () => ({ ok: true, json: async () => { throw new DOMException('Fixture body aborted', 'AbortError'); } }),
]) {
  test('incomplete or malformed review page cannot produce a successful replacement', async () => {
    const f = fixture({ googleResponse: syncResponse({ reviews: response }) });
    const result = await (await f.call({ action: 'sync_reviews', branch_ids: ['branch-google-inegol'] })).json();
    assert.equal(result.branches.length, 0); assert.equal(result.errors.length, 1); assert.equal(result.errors[0].status, 502);
  });
}

test('shared sync deadline covers token refresh and returns clear 504 without resource reads', async () => {
  const f = fixture({ abortSync: true });
  const response = await f.call({ action: 'sync_reviews' }); assert.equal(response.status, 504);
  assert.equal((await response.json()).code, 'GOOGLE_SYNC_TIMEOUT');
  assert.equal(f.fetches.filter(r => r.url.hostname !== 'oauth2.googleapis.com').length, 0);
});

for (const authCase of [{ authenticated: false }, { authorization: '' }]) {
  test('batch endpoint rejects missing or invalid ERP auth before any Google access', async () => {
    const f = fixture(authCase); assert.equal((await f.call({ action: 'sync_reviews' }, authCase)).status, 401); assert.equal(f.fetches.length, 0);
  });
}

test('rotated OAuth client blocks batch sync without a stale refresh request', async () => {
  const f = fixture({ savedClientId: 'retired-client' });
  const response = await f.call({ action: 'sync_reviews' }); assert.equal(response.status, 409); assert.equal((await response.json()).reconnection_required, true); assert.equal(f.fetches.length, 0);
});
