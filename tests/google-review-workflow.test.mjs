import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { webcrypto, randomUUID } from 'node:crypto';
import vm from 'node:vm';
import test from 'node:test';

// Real Edge Function handler, isolated from the network and all live credentials.
const source = await readFile(new URL('../supabase/functions/google-business-oauth/index.ts', import.meta.url), 'utf8');
const javascript = stripTypeScriptTypes(source.replace(/^import .*?;\r?\n/, ''));
const encoder = new TextEncoder();
const keyBytes = new Uint8Array(32).fill(17);
const iv = new Uint8Array(12).fill(29);
const key = await webcrypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
const encrypted = await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode('fixture-refresh'));
const encryptedRefresh = `${Buffer.from(iv).toString('base64')}.${Buffer.from(encrypted).toString('base64')}`;
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const LOCATION = '13476693615171033693';
const BRANCH = 'branch-google-nilufer';
const TARGET = { account_id: '123', location_id: LOCATION, review_id: 'review-one', branch_id: BRANCH };

function workflowFixture(options = {}) {
  let handler;
  const calls = [], mutations = [], rows = [];
  const connection = { id: 'ototr-primary', connected_by: OWNER, oauth_client_id: 'fixture-client', refresh_token_encrypted: encryptedRefresh, connected_at: new Date().toISOString() };
  const values = {
    SUPABASE_URL: 'https://fixture.supabase.invalid', SUPABASE_ANON_KEY: 'fixture-public', SUPABASE_SERVICE_ROLE_KEY: 'fixture-server',
    GOOGLE_TOKEN_ENCRYPTION_KEY: Buffer.from(keyBytes).toString('base64'), GOOGLE_OAUTH_STATE_SECRET: 'fixture-state-signing',
    GOOGLE_OAUTH_CLIENT_ID: 'fixture-client', GOOGLE_OAUTH_CLIENT_SECRET: 'fixture-secret', GOOGLE_BUSINESS_ADMIN_USER_IDS: options.allowedUsers || '',
  };
  let remote = { reviewId: options.reviewId || 'review-one', name: `accounts/123/locations/${LOCATION}/reviews/${options.reviewId || 'review-one'}`, starRating: 'FIVE', comment: 'Fixture public review', reviewer: { displayName: 'Fixture reviewer' }, createTime: '2026-10-27T00:00:00Z', ...(options.remoteReply ? { reviewReply: { comment: options.remoteReply } } : {}) };
  const state = { putFailure: null, getFailure: null, failPublishedWrite: false, failAllWrites: false, failReads: false, beforePut: null, putCount: 0 };

  function query(table) {
    const filters = [];
    let operation = 'select', payload, mode = 'many', maximum = Infinity, offset = 0, ordering;
    const builder = {
      select() { return this; },
      eq(column, value) { filters.push(row => row[column] === value); return this; },
      neq(column, value) { filters.push(row => row[column] !== value); return this; },
      in(column, values) { filters.push(row => values.includes(row[column])); return this; },
      is(column, value) { filters.push(row => row[column] === value); return this; },
      lt(column, value) { filters.push(row => row[column] < value); return this; },
      lte(column, value) { filters.push(row => row[column] <= value); return this; },
      gt(column, value) { filters.push(row => row[column] > value); return this; },
      gte(column, value) { filters.push(row => row[column] >= value); return this; },
      order(column, config = {}) { ordering = { column, ascending: config.ascending !== false }; return this; },
      limit(value) { maximum = value; return this; },
      range(start, end) { offset = start; maximum = end - start + 1; return this; },
      insert(value) { operation = 'insert'; payload = value; return this; },
      update(value) { operation = 'update'; payload = value; return this; },
      upsert(value) { operation = 'upsert'; payload = value; return this; },
      maybeSingle() { mode = 'maybeSingle'; return this; },
      single() { mode = 'single'; return this; },
      then(resolve, reject) { return Promise.resolve().then(execute).then(resolve, reject); },
    };
    function execute() {
      if (table === 'google_business_connections') return { data: clone(connection), error: null };
      assert.equal(table, 'google_review_work_items', 'Unexpected database table');
      if (operation === 'select' && state.failReads) return { data: null, error: { code: '42P01', message: 'fixture table unavailable' } };
      if (operation !== 'select') {
        mutations.push({ operation, payload: clone(payload) });
        if (state.failAllWrites || (state.failPublishedWrite && payload.status === 'published')) return { data: null, error: { code: 'XX000', message: 'fixture database failure' } };
      }
      let selected = rows.filter(row => filters.every(predicate => predicate(row)));
      if (operation === 'insert' || operation === 'upsert') {
        const incoming = Array.isArray(payload) ? payload : [payload];
        selected = [];
        for (const data of incoming) {
          const existing = rows.find(row => ['connection_id', 'location_id', 'review_id', 'kind'].every(column => row[column] === data[column]));
          if (existing && operation === 'insert') return { data: null, error: { code: '23505', message: 'fixture duplicate' } };
          if (existing) Object.assign(existing, clone(data));
          const row = existing || { id: randomUUID(), version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), last_error: '', ...clone(data) };
          if (!existing) rows.push(row);
          selected.push(row);
        }
      } else if (operation === 'update') {
        for (const row of selected) Object.assign(row, clone(payload));
      }
      if (ordering) selected.sort((a, b) => String(a[ordering.column]).localeCompare(String(b[ordering.column])) * (ordering.ascending ? 1 : -1));
      selected = selected.slice(offset, offset + maximum);
      if (mode === 'single' && selected.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'fixture row count mismatch' } };
      if (mode === 'maybeSingle' && selected.length > 1) return { data: null, error: { code: 'PGRST116', message: 'fixture row count mismatch' } };
      return { data: clone(mode === 'many' ? selected : selected[0] || null), error: null };
    }
    return builder;
  }
  const context = vm.createContext({
    URL, URLSearchParams, Request, Response, TextEncoder, TextDecoder, Uint8Array, btoa, atob, crypto: webcrypto, AbortSignal,
    createClient() {
      return {
        auth: { async getUser() { return { data: { user: { id: options.userId || OWNER, app_metadata: {}, user_metadata: { role: 'admin' } } }, error: null }; } },
        from: query,
      };
    },
    async fetch(url, init = {}) {
      const parsed = new URL(url), method = init.method || 'GET';
      calls.push({ url: parsed, method, body: init.body ? String(init.body) : null });
      if (parsed.hostname === 'oauth2.googleapis.com') return Response.json({ access_token: 'fixture-access' });
      if (parsed.hostname === 'mybusinessbusinessinformation.googleapis.com') return Response.json({ name: `locations/${LOCATION}`, storeCode: options.storeCode || '13674839659006303129', title: 'OTOTR Oto Ekspertiz Bursa Nilüfer' });
      assert.equal(parsed.hostname, 'mybusiness.googleapis.com', 'Unexpected remote API');
      if (method === 'PUT') {
        state.putCount++;
        if (state.beforePut) await state.beforePut();
        const data = JSON.parse(init.body);
        if (state.putFailure === 'before') throw new TypeError('fixture network unavailable');
        if (typeof state.putFailure === 'number') return Response.json({ error: { status: 'PERMISSION_DENIED', message: 'fixture Google rejected' } }, { status: state.putFailure });
        remote.reviewReply = { comment: data.comment, updateTime: new Date().toISOString() };
        if (state.putFailure === 'after') throw new TypeError('fixture response lost after remote write');
        return Response.json(remote.reviewReply);
      }
      if (state.getFailure) return Response.json({ error: { status: 'UNAVAILABLE', message: 'fixture Google read failed' } }, { status: state.getFailure });
      return Response.json(remote);
    },
    Deno: { env: { get(name) { return values[name]; } }, serve(fn) { handler = fn; } },
  });
  vm.runInContext(javascript, context, { filename: 'google-business-oauth-workflow.js' });
  return {
    calls, mutations, rows, state,
    rotateClient(value) { values.GOOGLE_OAUTH_CLIENT_ID = value; },
    setRemoteReply(text) { remote.reviewReply = { comment: text, updateTime: new Date().toISOString() }; },
    getRemoteReply() { return remote.reviewReply?.comment || ''; },
    async request(body) {
      const response = await handler(new Request('https://fixture.supabase.invalid/functions/v1/google-business-oauth', { method: 'POST', headers: { authorization: 'Bearer fixture-session', 'content-type': 'application/json' }, body: JSON.stringify(body) }));
      return { status: response.status, data: await response.json() };
    },
  };
}

const REPLY = 'Deneyiminizi paylaştığınız için teşekkür ederiz.\n\nOTOTR Bursa Nilüfer Şube ekibi';
async function saveDraft(f, extra = {}) {
  const response = await f.request({ action: 'save_draft', ...TARGET, reply_text: REPLY, draft_source: 'manual', ...extra });
  assert.ok(response.status >= 200 && response.status < 300, JSON.stringify(response));
  assert.ok(response.data.item?.id, 'saved draft must be returned');
  return response.data.item;
}
const publishBody = item => ({ action: 'publish_reply', item_id: item.id, expected_version: item.version, approved: true });

test('draft is persisted against verified Google IDs and canonical branch, without publishing', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f, { branch_name: 'Forged other branch', draft_source: 'local_template' });
  assert.equal(f.rows.length, 1);
  assert.equal(item.status, 'approval_pending');
  assert.equal(item.kind, 'reply');
  assert.equal(item.branch_id, BRANCH);
  assert.equal(item.account_id, TARGET.account_id);
  assert.equal(item.location_id, TARGET.location_id);
  assert.equal(item.review_id, TARGET.review_id);
  assert.equal(item.reply_text, REPLY);
  assert.equal(item.draft_source, 'local_template');
  assert.notEqual(item.branch_name, 'Forged other branch');
  assert.match(item.branch_name, /Nilüfer/);
  assert.equal(f.state.putCount, 0);
  const beforeListCalls = f.calls.length;
  const listed = await f.request({ action: 'workflow_list' });
  assert.equal(listed.status, 200);
  assert.equal(listed.data.items.length, 1);
  assert.equal(listed.data.items[0].id, item.id);
  assert.equal(f.calls.length, beforeListCalls, 'saved tasks must remain readable without calling Google');
  assert.doesNotMatch(JSON.stringify(listed.data), /fixture-refresh|fixture-secret|refresh_token_encrypted/);
});

test('empty reply is rejected instead of creating an unusable approval item', async () => {
  const f = workflowFixture();
  const response = await f.request({ action: 'save_draft', ...TARGET, reply_text: '   ', draft_source: 'manual' });
  assert.equal(response.status, 400);
  assert.equal(f.rows.length, 0);
});

test('a Google location cannot be mislabeled as a different OTOTR branch', async () => {
  const f = workflowFixture({ storeCode: '03710924650104046695' });
  const response = await f.request({ action: 'save_draft', ...TARGET, reply_text: REPLY, draft_source: 'manual' });
  assert.ok(response.status >= 400);
  assert.equal(f.rows.length, 0);
  assert.equal(f.state.putCount, 0);
});

test('duplicate draft create never creates two rows or overwrites the first text silently', async () => {
  const f = workflowFixture();
  await saveDraft(f);
  const again = await f.request({ action: 'save_draft', ...TARGET, reply_text: 'Second independent draft must not overwrite.', draft_source: 'manual' });
  assert.ok([200, 409].includes(again.status), JSON.stringify(again));
  assert.equal(f.rows.length, 1);
  assert.equal(f.rows[0].reply_text, REPLY);
});

test('the same Google location/review cannot get a second approval row through another account wrapper', async () => {
  const f = workflowFixture();
  await saveDraft(f);
  const response = await f.request({ action: 'save_draft', ...TARGET, account_id: '789', reply_text: 'Conflicting reply from another Google account wrapper.', draft_source: 'manual' });
  assert.equal(response.status, 409);
  assert.equal(f.rows.length, 1);
  assert.equal(f.rows[0].account_id, TARGET.account_id);
  assert.equal(f.rows[0].reply_text, REPLY);
});

test('draft edit uses version checking and does not change the Google target', async () => {
  const f = workflowFixture();
  const initial = await saveDraft(f);
  const edited = await saveDraft(f, { item_id: initial.id, expected_version: initial.version, reply_text: 'Onay öncesinde düzenlenen yeni cevap.' });
  assert.equal(edited.version, initial.version + 1);
  const stale = await f.request({ action: 'save_draft', ...TARGET, item_id: initial.id, expected_version: initial.version, reply_text: 'Stale edit must never win.', draft_source: 'manual' });
  assert.equal(stale.status, 409);
  assert.equal(f.rows[0].reply_text, edited.reply_text);
  assert.equal(f.rows[0].account_id, TARGET.account_id);
  assert.equal(f.rows[0].location_id, TARGET.location_id);
  assert.equal(f.rows[0].review_id, TARGET.review_id);
});

test('publishing requires explicit approval of the current stored version', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  for (const body of [
    { ...publishBody(item), approved: false },
    { ...publishBody(item), approved: undefined },
    { ...publishBody(item), expected_version: item.version + 1 },
  ]) {
    const response = await f.request(body);
    assert.ok(response.status >= 400);
  }
  assert.equal(f.state.putCount, 0);
  assert.equal(f.rows[0].status, 'approval_pending');
});

test('approved publication uses stored IDs/text and verifies the remote reply', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  const response = await f.request({ ...publishBody(item), account_id: '999', location_id: '888', review_id: 'malicious', reply_text: 'Unapproved replacement' });
  assert.equal(response.status, 200, JSON.stringify(response));
  assert.equal(response.data.item.status, 'published');
  assert.equal(f.rows[0].status, 'published');
  assert.equal(f.rows[0].approved_by, OWNER);
  assert.ok(f.rows[0].approved_at);
  assert.ok(f.rows[0].published_at);
  assert.equal(f.getRemoteReply(), REPLY);
  const put = f.calls.find(call => call.method === 'PUT');
  assert.equal(put.url.pathname, `/v4/accounts/123/locations/${LOCATION}/reviews/review-one/reply`);
  assert.deepEqual(JSON.parse(put.body), { comment: REPLY });
  const putIndex = f.calls.indexOf(put);
  assert.ok(f.calls.slice(putIndex + 1).some(call => call.method === 'GET' && call.url.hostname === 'mybusiness.googleapis.com'), 'must verify after the write');
});

test('repeating the same successful approval does not send another Google write', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  assert.equal((await f.request(publishBody(item))).status, 200);
  const again = await f.request(publishBody(item));
  assert.equal(again.status, 200, JSON.stringify(again));
  assert.equal(again.data.item.status, 'published');
  assert.equal(f.state.putCount, 1);
});

test('concurrent approval claims permit at most one remote write', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  let release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  f.state.beforePut = async () => { entered(); await gate; };
  const first = f.request(publishBody(item));
  await started;
  try {
    const second = await f.request(publishBody(item));
    assert.equal(second.status, 409);
  } finally { release(); }
  assert.equal((await first).status, 200);
  assert.equal(f.state.putCount, 1);
});

test('another Google reply added after drafting is never silently overwritten', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  f.setRemoteReply('A branch manager answered directly in Google.');
  const response = await f.request(publishBody(item));
  assert.equal(response.status, 409, JSON.stringify(response));
  assert.equal(f.state.putCount, 0);
  assert.notEqual(f.rows[0].status, 'published');
  assert.equal(f.getRemoteReply(), 'A branch manager answered directly in Google.');
});

test('a Google rejection is not represented as a published reply', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  f.state.putFailure = 403;
  const response = await f.request(publishBody(item));
  assert.ok(response.status >= 400);
  assert.equal(f.rows[0].status, 'publish_failed');
  assert.ok(f.rows[0].last_error);
  assert.equal(f.getRemoteReply(), '');
});

test('Google server error during PUT remains uncertain rather than unlocking edits', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  f.state.putFailure = 503;
  const response = await f.request(publishBody(item));
  assert.equal(response.status, 503);
  assert.equal(f.rows[0].status, 'publish_unknown');
});

test('a definite PUT rejection on an unknown retry unlocks review without overwriting Google', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  f.state.putFailure = 'before';
  await f.request(publishBody(item));
  assert.equal(f.rows[0].status, 'publish_unknown');
  f.state.putFailure = 400;
  const retried = await f.request(publishBody(item));
  assert.equal(retried.status, 400);
  assert.equal(f.rows[0].status, 'publish_failed');
  assert.equal(f.getRemoteReply(), '');
  const edited = await saveDraft(f, { item_id: item.id, expected_version: item.version, reply_text: 'Corrected reply after Google rejected the old text.' });
  assert.equal(edited.version, item.version + 1);
  assert.equal(edited.status, 'approval_pending');
  assert.equal(f.state.putCount, 2, 'Saving the correction does not publish it');
});

test('a lost response after successful Google write is recovered read-only', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  f.state.putFailure = 'after';
  const response = await f.request(publishBody(item));
  assert.ok(response.status >= 400);
  assert.equal(f.rows[0].status, 'publish_unknown');
  assert.equal(f.getRemoteReply(), REPLY);
  f.state.putFailure = null;
  const checked = await f.request({ action: 'verify_reply', item_id: item.id, expected_version: item.version });
  assert.equal(checked.status, 200, JSON.stringify(checked));
  assert.equal(checked.data.item.status, 'published');
  assert.equal(f.state.putCount, 1);
});

test('failed local finalization cannot pretend success and can recover without a second write', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  f.state.failPublishedWrite = true;
  const response = await f.request(publishBody(item));
  assert.ok(response.status >= 400);
  assert.notEqual(f.rows[0].status, 'published');
  assert.equal(f.getRemoteReply(), REPLY);
  f.state.failPublishedWrite = false;
  // If the failed database write left a lock, it must expire before recovery claims it.
  f.rows[0].updated_at = new Date(Date.now() - 120_000).toISOString();
  const checked = await f.request({ action: 'verify_reply', item_id: item.id, expected_version: item.version });
  assert.equal(checked.status, 200, JSON.stringify(checked));
  assert.equal(checked.data.item.status, 'published');
  assert.equal(f.state.putCount, 1);
});

test('unknown publication preserves immutable text until its outcome is resolved', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  f.state.putFailure = 'after';
  await f.request(publishBody(item));
  const edited = await f.request({ action: 'save_draft', ...TARGET, item_id: item.id, expected_version: item.version, reply_text: 'Unsafe edit while write outcome is unknown.', draft_source: 'manual' });
  assert.equal(edited.status, 409);
  assert.equal(f.rows[0].reply_text, REPLY);
});

test('verified conflicting external reply recovers unknown state through review and a fresh saved approval', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  f.state.putFailure = 'before';
  await f.request(publishBody(item));
  assert.equal(f.rows[0].status, 'publish_unknown');
  f.state.putFailure = null;
  const externalReply = 'A manager has already answered this customer in Google.';
  f.setRemoteReply(externalReply);
  const checked = await f.request({ action: 'verify_reply', item_id: item.id, expected_version: item.version });
  assert.equal(checked.status, 200);
  assert.equal(checked.data.item.status, 'publish_failed');
  assert.equal(checked.data.item.review_snapshot.current_reply, externalReply);
  assert.equal(checked.data.item.review_snapshot.reply_conflict, true);
  assert.equal(f.getRemoteReply(), externalReply);
  assert.equal(f.state.putCount, 1, 'Verification must not write to Google');
  const bypass = await f.request(publishBody(item));
  assert.equal(bypass.status, 409, 'Old approval cannot overwrite the newly observed reply');
  const saved = await saveDraft(f, { item_id: item.id, expected_version: item.version, reply_text: 'Reviewed revised reply.' });
  assert.equal(saved.version, item.version + 1);
  assert.equal(saved.expected_reply, externalReply);
  assert.equal(saved.review_snapshot.reply_conflict, undefined);
  assert.equal((await f.request(publishBody(item))).status, 409, 'Stale version must still fail');
  const published = await f.request(publishBody(saved));
  assert.equal(published.data.item.status, 'published');
  assert.equal(f.getRemoteReply(), 'Reviewed revised reply.');
  assert.equal(f.state.putCount, 2);
});

test('failed Google verification keeps outcome unknown and does not unlock draft edits', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  f.state.putFailure = 'before';
  await f.request(publishBody(item));
  f.state.getFailure = 503;
  const checked = await f.request({ action: 'verify_reply', item_id: item.id, expected_version: item.version });
  assert.equal(checked.status, 503);
  assert.equal(f.rows[0].status, 'publish_unknown');
  assert.equal(f.rows[0].review_snapshot.reply_conflict, undefined);
  f.state.getFailure = null;
  const edited = await f.request({ action: 'save_draft', ...TARGET, item_id: item.id, expected_version: item.version, reply_text: 'Do not unlock on a failed read.' });
  assert.equal(edited.status, 409);
  assert.equal(f.rows[0].reply_text, REPLY);
});

test('saved branch task is shared, uniquely identified, and can be completed with a version', async () => {
  const f = workflowFixture();
  const created = await f.request({ action: 'create_task', ...TARGET, kind: 'branch' });
  assert.equal(created.status, 200, JSON.stringify(created));
  const item = created.data.item;
  assert.equal(item.kind, 'branch');
  assert.equal(item.status, 'open');
  const again = await f.request({ action: 'create_task', ...TARGET, kind: 'branch' });
  assert.ok([200, 409].includes(again.status));
  assert.equal(f.rows.length, 1);
  const completed = await f.request({ action: 'update_task', item_id: item.id, expected_version: item.version, status: 'done', note: 'Şube yönetimi değerlendirdi.' });
  assert.equal(completed.status, 200, JSON.stringify(completed));
  assert.equal(completed.data.item.status, 'done');
  assert.equal(f.state.putCount, 0);
  const listed = await f.request({ action: 'workflow_list' });
  assert.equal(listed.data.items[0].status, 'done');
});

test('OAuth client rotation preserves shared tasks but blocks all Google token use until reconnect', async () => {
  const f = workflowFixture();
  const created = await f.request({ action: 'create_task', ...TARGET, kind: 'branch' });
  const item = created.data.item;
  f.rotateClient('new-approved-project-client');
  const callCount = f.calls.length;
  const status = await f.request({ action: 'status' });
  assert.equal(status.data.connected, false);
  assert.equal(status.data.reconnection_required, true);
  const listed = await f.request({ action: 'workflow_list' });
  assert.equal(listed.status, 200);
  assert.equal(listed.data.items[0].id, item.id);
  const completed = await f.request({ action: 'update_task', item_id: item.id, expected_version: item.version, status: 'done', note: 'Handled while reconnect is pending.' });
  assert.equal(completed.data.item.status, 'done');
  const draft = await f.request({ action: 'save_draft', ...TARGET, reply_text: REPLY });
  assert.equal(draft.status, 409);
  assert.equal(f.calls.length, callCount, 'Client rotation must never try old credentials against Google');
});

test('task updates cannot mark a reply as published or bypass approval', async () => {
  const f = workflowFixture();
  const draft = await saveDraft(f);
  const response = await f.request({ action: 'update_task', item_id: draft.id, expected_version: draft.version, status: 'done' });
  assert.ok(response.status >= 400);
  assert.equal(f.rows[0].status, 'approval_pending');
  assert.equal(f.state.putCount, 0);
});

test('database read and save failures remain explicit errors', async () => {
  const f = workflowFixture();
  f.state.failReads = true;
  const listed = await f.request({ action: 'workflow_list' });
  assert.equal(listed.status, 503);
  assert.equal(listed.data.items, undefined);
  f.state.failReads = false;
  f.state.failAllWrites = true;
  const saved = await f.request({ action: 'save_draft', ...TARGET, reply_text: REPLY, draft_source: 'manual' });
  assert.equal(saved.status, 503);
  assert.equal(f.rows.length, 0);
  assert.equal(f.state.putCount, 0);
});

test('a stale publish lock requires verification before any retry', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  f.rows[0].status = 'publishing';
  f.rows[0].attempt_id = randomUUID();
  f.rows[0].updated_at = new Date(Date.now() - 120_000).toISOString();
  const blocked = await f.request(publishBody(item));
  assert.equal(blocked.status, 409);
  assert.equal(f.state.putCount, 0);
  const checked = await f.request({ action: 'verify_reply', item_id: item.id, expected_version: item.version });
  assert.equal(checked.status, 200);
  assert.equal(checked.data.item.status, 'publish_unknown');
  assert.equal(f.state.putCount, 0);
});

test('verification of an unknown outcome never itself publishes the draft', async () => {
  const f = workflowFixture();
  const item = await saveDraft(f);
  f.state.putFailure = 'before';
  await f.request(publishBody(item));
  assert.equal(f.rows[0].status, 'publish_unknown');
  f.state.putFailure = null;
  const checked = await f.request({ action: 'verify_reply', item_id: item.id, expected_version: item.version });
  assert.equal(checked.status, 200);
  assert.equal(checked.data.item.status, 'publish_unknown');
  assert.equal(f.state.putCount, 1);
  assert.equal(f.getRemoteReply(), '');
  const retry = await f.request(publishBody(item));
  assert.equal(retry.status, 200);
  assert.equal(retry.data.item.status, 'published');
  assert.equal(f.getRemoteReply(), REPLY);
});

test('saved Google review IDs stay a single encoded path component on publication', async () => {
  const reviewId = 'review/one?two=ü';
  const f = workflowFixture({ reviewId });
  const item = await saveDraft(f, { review_id: reviewId });
  assert.equal((await f.request(publishBody(item))).status, 200);
  const put = f.calls.find(call => call.method === 'PUT');
  assert.equal(put.url.pathname, `/v4/accounts/123/locations/${LOCATION}/reviews/${encodeURIComponent(reviewId)}/reply`);
  assert.equal(put.url.search, '');
});

test('stale task completion cannot overwrite a newer task decision', async () => {
  const f = workflowFixture();
  const created = await f.request({ action: 'create_task', ...TARGET, kind: 'branch' });
  const item = created.data.item;
  const callsBeforeUpdate = f.calls.length;
  const done = await f.request({ action: 'update_task', item_id: item.id, expected_version: item.version, status: 'done', note: 'Current decision' });
  assert.equal(done.status, 200);
  const stale = await f.request({ action: 'update_task', item_id: item.id, expected_version: item.version, status: 'open', note: 'Stale decision' });
  assert.equal(stale.status, 409);
  assert.equal(f.rows[0].status, 'done');
  assert.equal(f.rows[0].note, 'Current decision');
  assert.equal(f.calls.length, callsBeforeUpdate);
});

for (const action of ['workflow_list', 'save_draft', 'create_task', 'update_task', 'publish_reply', 'verify_reply']) {
  test(`unprivileged authenticated user cannot use workflow action ${action}`, async () => {
    const f = workflowFixture({ userId: OTHER });
    const response = await f.request({ action, ...TARGET, kind: 'branch', reply_text: REPLY, approved: true, item_id: randomUUID(), expected_version: 1, status: 'done' });
    assert.equal(response.status, 403);
    assert.equal(f.calls.length, 0);
    assert.equal(f.mutations.length, 0);
  });
}
