import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const aiSource = fs.readFileSync(new URL('../assets/google-review-ai.js', import.meta.url), 'utf8');
const begin = html.indexOf('    const googleReputationState=');
const end = html.indexOf('    window.OTOTRGetLiveSession=', begin);
assert.ok(begin >= 0 && end > begin);

function harness() {
  const page = { innerHTML: '' };
  const context = vm.createContext({
    window: {}, document: { getElementById: id => id === 'page-google-reviews' ? page : null },
    icon: () => '', pageHeader: () => '', deptPlan: () => '', toast: () => {},
    localStorage: { getItem: () => null, setItem: () => {} }, setTimeout: () => 0,
  });
  vm.runInContext(html.slice(begin, end), context);
  const read = expression => vm.runInContext(expression, context);
  return { context, read, page, api: context.window.OTOTRGoogleReputation,
    state: read('googleReputationState'), branches: read('googleBranches()') };
}

function location(branch, accountName = 'accounts/123') {
  return { name: `locations/${branch.googleBusinessLocationId}`, storeCode: branch.storeCode, title: branch.name, accountName };
}

function review(id, rating = 'FIVE', replied = false) {
  return { reviewId: id, starRating: rating, comment: 'Test yorumu', createTime: new Date().toISOString(),
    reviewer: { displayName: 'Test kullanıcı' }, ...(replied ? { reviewReply: { comment: 'Teşekkürler' } } : {}) };
}

// Older deployed backends explicitly reject the new action; other errors must
// not silently trigger a second set of Google calls.
const legacyRequest = handler => async (action, extra) => {
  if (action === 'sync_reviews') throw Object.assign(new Error('Geçersiz işlem.'), { status: 400 });
  return handler(action, extra);
};

function batchBranch(branch, reviews = [review(`batch-${branch.id}`)], extra = {}) {
  return { branch_id: branch.id, account_id: '123', location_id: branch.googleBusinessLocationId,
    location: location(branch), reviews, averageRating: 5, totalReviewCount: reviews.length,
    pagination_complete: true, ...extra };
}

test('batch sync needs one read request, retains branch/filter and exposes measured duration', async () => {
  const h = harness(), calls = []; let clock = 1000;
  h.context.Date = class extends Date { static now() { return clock; } };
  h.api.selectBranch('branch-google-gebze'); h.api.setFilter('unreplied');
  h.context.window.OTOTRGoogleReviewAI = {
    googleBusinessStatus: async () => { throw new Error('Batch must not perform an extra status call'); },
    googleBusinessRequest: async (action, body) => {
      calls.push({ action, body }); clock += 4200;
      return { connected: true, branches: h.branches.map(branch => batchBranch(branch)), errors: [] };
    },
  };
  const result = await h.api.syncAllGoogleReviews({ quiet: true });
  assert.equal(calls.length, 1); assert.equal(calls[0].action, 'sync_reviews');
  assert.equal(result.syncedBranches, 3); assert.equal(result.receivedReviews, 3);
  assert.equal(h.state.selectedBranchId, 'branch-google-gebze'); assert.equal(h.state.filter, 'unreplied');
  assert.equal(h.state.lastDurationMs, 4200); assert.match(h.page.innerHTML, /Son yenileme: 4,2 sn/);
  assert.match(h.page.innerHTML, /data-duration-ms="4200"/);
});

test('one-branch refresh scopes batch to that branch and preserves every other branch', async () => {
  const h = harness(), branch = h.branches[1], existing = { id: 'old-other', branchId: h.branches[0].id };
  h.api.demoReviews.push(existing); let sent;
  h.context.window.OTOTRGoogleReviewAI = { googleBusinessRequest: async (action, body) => {
    sent = body; return { connected: true, branches: [batchBranch(branch)], errors: [] };
  } };
  await h.api.syncGoogleReviewsForBranch(branch.id);
  assert.deepEqual([...sent.branch_ids], [branch.id]);
  assert.strictEqual(h.api.demoReviews.find(row => row.id === 'old-other'), existing);
  assert.equal(h.state.lastAllSyncAt, 0);
});

test('partial batch failure keeps last-good data, applies healthy branches and does not claim all fresh', async () => {
  const h = harness(), failed = h.branches[0], good = h.branches[1];
  failed.googleReviewCount = 12; failed.googleRating = 4.5; failed.synced = true;
  const old = { id: 'preserved', branchId: failed.id }; h.api.demoReviews.push(old);
  h.context.window.OTOTRGoogleReviewAI = { googleBusinessRequest: async () => ({ connected: true,
    branches: [batchBranch(good)], errors: [{ branch_id: failed.id, error: 'Fixture quota denied' }, { branch_id: h.branches[2].id, error: 'Fixture unavailable' }],
  }) };
  const result = await h.api.syncAllGoogleReviews({ quiet: true });
  assert.equal(result.syncedBranches, 1); assert.equal(result.missing.length, 2);
  assert.equal(failed.googleReviewCount, 12); assert.strictEqual(h.api.demoReviews.find(row => row.id === 'preserved'), old);
  assert.equal(good.googleReviewCount, 1); assert.equal(h.state.lastAllSyncAt, 0);
  assert.match(h.state.error, /Fixture quota denied/);
});

test('reported total/list mismatch is explicit and unanswered totals are not treated as complete', async () => {
  const h = harness();
  h.context.window.OTOTRGoogleReviewAI = { googleBusinessRequest: async () => ({ connected: true,
    branches: h.branches.map((branch, index) => batchBranch(branch, [review(`count-${index}`)], index === 0 ? { totalReviewCount: 2 } : {})), errors: [],
  }) };
  await h.api.syncAllGoogleReviews({ quiet: true });
  assert.equal(h.branches[0].googleReviewCount, 2); assert.equal(h.branches[0].loadedReviewCount, 1);
  assert.equal(h.branches[0].loadedUnrepliedCount, 1); assert.equal(h.branches[0].unrepliedCount, null);
  assert.ok(h.state.lastAllSyncAt > 0, 'all pages finished; normal five-minute refresh remains appropriate');
  assert.match(h.page.innerHTML, /Google 2 toplam yorum bildiriyor; 1 yorum alınabildi/);
  assert.match(h.page.innerHTML, /Alınan 3 yorumda; tam toplam henüz doğrulanmadı/);
  assert.match(h.page.innerHTML, /<div class="google-kpi-value-large">3<\/div>/);
  assert.match(h.page.innerHTML, /Cevap bekleyen \(alınan\)/);
});

for (const status of [401, 403, 429, 500]) {
  test(`batch HTTP ${status} never falls back to duplicate legacy requests`, async () => {
    const h = harness(); let calls = 0;
    h.context.window.OTOTRGoogleReviewAI = {
      googleBusinessStatus: async () => { throw new Error('Unexpected status fallback'); },
      googleBusinessRequest: async () => { calls++; throw Object.assign(new Error('Fixture upstream failure'), { status }); },
    };
    await h.api.syncAllGoogleReviews(); assert.equal(calls, 1); assert.match(h.state.error, /Fixture upstream failure/);
  });
}

test('incomplete or wrong-branch batch rows never replace prior branch data', async () => {
  for (const invalid of [{ pagination_complete: false }, { location: { name: 'locations/999', storeCode: 'wrong-branch' } }]) {
    const h = harness(), branch = h.branches[0]; branch.googleReviewCount = 8;
    h.context.window.OTOTRGoogleReviewAI = { googleBusinessRequest: async () => ({ connected: true, branches: [batchBranch(branch, [], invalid)], errors: [] }) };
    assert.equal(await h.api.syncGoogleReviewsForBranch(branch.id), null);
    assert.equal(branch.googleReviewCount, 8); assert.ok(h.state.error);
  }
});

test('initial dashboard distinguishes unavailable data from zero or critical scores', () => {
  const h = harness();
  h.api.render();
  assert.ok(h.branches.every(branch => branch.googleRating === null && branch.googleReviewCount === null && !branch.synced));
  assert.match(h.page.innerHTML, /Veri bekleniyor/);
  assert.match(h.page.innerHTML, /Henüz yorum alınmadı/);
  assert.match(h.page.innerHTML, /<strong>—<\/strong>/);
  assert.doesNotMatch(h.page.innerHTML, /0\.0|\+8%|\+0\.1|Risk Radar|En riskli 3 şube/);
  assert.equal(h.read('googleStatus(null).label'), 'Veri bekleniyor');
  assert.equal(h.branches.find(branch => branch.id === 'branch-google-nilufer').replySignatureName, 'OTOTR Bursa Nilüfer Şube');
});

test('a connected account is not presented as having synchronized reviews', async () => {
  const h = harness();
  h.context.window.OTOTRGoogleReviewAI = { googleBusinessStatus: async () => ({ connected: true }) };
  await h.read('refreshGoogleBusinessConnectionStatus()');
  assert.equal(h.state.connected, true);
  assert.match(h.page.innerHTML, /Google hesabı bağlı/);
  assert.match(h.page.innerHTML, /Henüz yorum alınmadı/);
  assert.ok(h.branches.every(branch => !branch.synced));
});

test('OAuth client rotation shows reconnect control and explains the correct Google account', async () => {
  const h = harness();
  h.context.window.OTOTRGoogleReviewAI = { googleBusinessStatus: async () => ({ connected: false, reconnection_required: true }) };
  await h.read('refreshGoogleBusinessConnectionStatus()');
  assert.equal(h.state.connected, false);
  assert.match(h.page.innerHTML, /data-testid="google-connect"/);
  assert.match(h.page.innerHTML, /dijital@ototr\.com/);
  assert.match(h.page.innerHTML, /yeniden yetkilendirin/);
});

test('strict branch matching cannot mix the Bursa branches and rejects ambiguous identifiers', () => {
  const h = harness();
  const nilufer = h.branches.find(branch => branch.id === 'branch-google-nilufer');
  const inegol = h.branches.find(branch => branch.id === 'branch-google-inegol');
  h.context.candidates = [location(inegol)];
  h.context.targetBranch = nilufer;
  assert.equal(h.read('googleLiveLocationForBranch(targetBranch,candidates)'), null);
  h.context.candidates.push(location(nilufer));
  assert.equal(h.read('googleLiveLocationForBranch(targetBranch,candidates).storeCode'), nilufer.storeCode);
  h.context.candidates.push({ name: 'locations/999999', storeCode: nilufer.storeCode });
  assert.equal(h.read('googleLiveLocationForBranch(targetBranch,candidates)'), null);
});

test('sync follows all account, location and review pages and updates the AI review reference', async () => {
  const h = harness();
  const branch = h.branches[0], calls = [], originalReviews = h.api.demoReviews;
  h.context.window.OTOTRGoogleReviewAI = {
    googleBusinessStatus: async () => ({ connected: true }),
    googleBusinessRequest: legacyRequest(async (action, extra) => {
      calls.push({ action, ...extra });
      if (action === 'accounts') return extra.page_token ? { accounts: [{ name: 'accounts/123' }] } : { accounts: [], nextPageToken: 'account-next' };
      if (action === 'locations') return extra.page_token ? { locations: [location(branch)] } : { locations: [], nextPageToken: 'location-next' };
      return extra.page_token
        ? { reviews: [review('r2', 'ONE'), review('r1', 'FIVE', true)] }
        : { reviews: [review('r1', 'FIVE', true)], averageRating: 3, totalReviewCount: 2, nextPageToken: 'review-next' };
    }),
  };
  const result = await h.api.syncGoogleReviewsForBranch(branch.id);
  assert.equal(result.syncedBranches, 1);
  assert.equal(h.state.loading, false);
  assert.equal(h.state.error, '');
  assert.strictEqual(h.api.demoReviews, originalReviews);
  assert.equal(originalReviews.length, 2);
  assert.equal(h.api.getReviewById(originalReviews[0].id).googleReviewId, 'r1');
  assert.equal(branch.googleReviewCount, 2);
  assert.equal(branch.googleRating, 3);
  assert.equal(branch.unrepliedCount, 1);
  assert.equal(branch.criticalCount, 1);
  assert.ok(branch.lastSyncedAt);
  assert.deepEqual(calls.filter(call => call.page_token).map(call => call.page_token), ['account-next', 'location-next', 'review-next']);
});

test('upstream identifiers cannot break inline action attributes', () => {
  const h = harness();
  h.context.raw = review("x');alert(1);//\"<&");
  const model = h.read('googleLiveReviewModel(raw,googleBranches()[0])');
  assert.match(model.id, /^[a-z0-9-]+$/);
  assert.equal(model.googleReviewId, "x');alert(1);//\"<&");
});

test('quiet full sync preserves branch/filter and records freshness without a success toast', async () => {
  const h = harness(), toasts = [];
  h.context.toast = message => toasts.push(message);
  h.api.selectBranch('branch-google-gebze'); h.api.setFilter('unreplied');
  h.context.window.OTOTRGoogleReviewAI = {
    googleBusinessStatus: async () => ({ connected: true }),
    googleBusinessRequest: legacyRequest(async action => action === 'accounts' ? { accounts: [{ name: 'accounts/123' }] }
      : action === 'locations' ? { locations: h.branches.map(branch => location(branch)) }
      : { reviews: [], totalReviewCount: 0 }),
  };
  await h.api.syncAllGoogleReviews({ quiet: true });
  assert.equal(toasts.length, 0);
  assert.equal(h.state.selectedBranchId, 'branch-google-gebze');
  assert.equal(h.state.filter, 'unreplied');
  assert.ok(h.api.getRefreshState().lastSuccessAt > 0);
  const snapshot = h.api.getRefreshState(); snapshot.busy = true;
  assert.equal(h.api.getRefreshState().busy, false);
  await h.api.syncAllGoogleReviews();
  assert.equal(toasts.length, 1);
});

test('AI draft reads the current live review and signs with its own branch team', async () => {
  const h = harness();
  const fields = new Map();
  const field = id => {
    if (!fields.has(id)) fields.set(id, { value: '', textContent: '', innerHTML: '', checked: false, setAttribute() {} });
    return fields.get(id);
  };
  const modal = { dataset: {}, classList: { add: () => {} }, querySelector: field };
  h.context.document.getElementById = id => id === 'googleReviewAiModal' ? modal : h.page;
  h.context.document.addEventListener = () => {};
  vm.runInContext(aiSource, h.context);
  for (const branch of h.branches) {
    branch.googleBusinessAccountId = '123';
    h.context.raw = review(`signature-${branch.id}`);
    h.context.branch = branch;
    const item = h.read('googleLiveReviewModel(raw,branch)');
    h.api.demoReviews.push(item);
    const draft = await h.api.generateReplyDraft(item.id);
    assert.ok(draft.endsWith(`${branch.replySignatureName} ekibi`));
    assert.match(fields.get('#googleAiWarning').textContent, /Google’a gönderilmedi/);
    if (branch.id === 'branch-google-nilufer') assert.ok(draft.endsWith('OTOTR Bursa Nilüfer Şube ekibi'));
  }
});

test('failed sync leaves connection and last successful data intact with a persistent error', async () => {
  const h = harness();
  h.state.connected = true;
  const branch = h.branches[0];
  branch.synced = true; branch.googleReviewCount = 12; branch.googleRating = 4.5;
  const existing = review('existing'); h.api.demoReviews.push(existing);
  h.context.window.OTOTRGoogleReviewAI = {
    googleBusinessStatus: async () => ({ connected: true }),
    googleBusinessRequest: async () => { throw new Error('API erişim kotası 0'); },
  };
  assert.equal(await h.api.syncAllGoogleReviews(), null);
  assert.equal(h.state.connected, true);
  assert.equal(h.state.loading, false);
  assert.equal(branch.googleReviewCount, 12);
  assert.strictEqual(h.api.demoReviews[0], existing);
  h.api.render();
  assert.match(h.page.innerHTML, /data-testid="google-sync-error"/);
  assert.match(h.page.innerHTML, /API erişim kotası 0/);
  assert.doesNotMatch(h.page.innerHTML, /Google hesabı bağlı değil/);
});

test('status failures are shown rather than converted to disconnected state', async () => {
  const h = harness();
  h.state.connected = true;
  h.context.window.OTOTRGoogleReviewAI = { googleBusinessStatus: async () => { throw new Error('Bağlantı kontrolü başarısız'); } };
  await h.read('refreshGoogleBusinessConnectionStatus()');
  assert.equal(h.state.connected, true);
  assert.match(h.state.error, /Bağlantı kontrolü başarısız/);
});

test('repeated pagination tokens fail visibly without accepting incomplete metrics', async () => {
  const h = harness();
  h.context.window.OTOTRGoogleReviewAI = {
    googleBusinessStatus: async () => ({ connected: true }),
    googleBusinessRequest: legacyRequest(async () => ({ accounts: [{ name: 'accounts/123' }], nextPageToken: 'repeated' })),
  };
  await h.api.syncAllGoogleReviews();
  assert.match(h.state.error, /sayfalama yanıtı tekrarlandı/);
  assert.equal(h.state.loading, false);
  assert.ok(h.branches.every(branch => branch.googleReviewCount === null));
});

test('loading is rendered and concurrent sync clicks do not duplicate requests', async () => {
  const h = harness();
  let release, calls = 0;
  h.context.window.OTOTRGoogleReviewAI = {
    googleBusinessStatus: () => { calls++; return new Promise(resolve => { release = resolve; }); },
    googleBusinessRequest: legacyRequest(async () => ({ accounts: [] })),
  };
  const pending = h.api.syncAllGoogleReviews();
  assert.equal(h.state.loading, true);
  assert.match(h.page.innerHTML, /role="status"/);
  assert.equal(await h.api.syncAllGoogleReviews(), null);
  assert.equal(calls, 1);
  release({ connected: false });
  await pending;
  assert.equal(h.state.loading, false);
  assert.match(h.page.innerHTML, /data-testid="google-connect"/);
});

test('background dealer synchronization never changes the current route', () => {
  const start = html.indexOf('    function dealerRenderAfterSupabaseSync(');
  const stop = html.indexOf('    async function dealerSyncSupabaseWorkOrders(', start);
  let renders = 0;
  const context = vm.createContext({ current: 'google-reviews', renderDealerPageOnly: () => { renders++; } });
  vm.runInContext(html.slice(start, stop), context);
  context.dealerRenderAfterSupabaseSync({});
  assert.equal(renders, 0);
  context.current = 'dealer';
  context.dealerRenderAfterSupabaseSync({});
  assert.equal(renders, 1);
  context.dealerRenderAfterSupabaseSync({ noRender: true });
  assert.equal(renders, 1);
});

function aiHarness(message) {
  const context = vm.createContext({
    window: { OTOTRGoogleReputation: {}, OTOTRGetLiveSession: async () => ({ access_token: 'test-only-token' }), OTOTRGetSupabaseKey: () => 'test-only-key' },
    fetch: async () => ({ ok: false, status: 429, json: async () => ({ error: message }) }),
    AbortController, setTimeout: () => 1, clearTimeout: () => {},
  });
  vm.runInContext(aiSource, context);
  return context.window.OTOTRGoogleReviewAI;
}

test('API disabled and zero quota errors explain the actual Google configuration problem in Turkish', async () => {
  const disabled = aiHarness('My Business Account Management API has not been used in project 123 before or it is disabled.');
  await assert.rejects(disabled.googleBusinessRequest('accounts'), /Google hesabı bağlı.*My Business Account Management API.*etkin değil/);
  const quota = aiHarness("Quota exceeded for quota metric 'Requests' and limit 'Requests per minute'");
  await assert.rejects(quota.googleBusinessStatus(), /API erişim onayı ve kota tanımlanması gerekir/);
});

test('the changed classic inline scripts and AI asset parse', () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=|type\s*=\s*["'](?:module|text\/plain|application\/json)/i.test(attributes));
  assert.ok(scripts.length);
  scripts.forEach(([, , source]) => new vm.Script(source));
  new vm.Script(aiSource);
});
