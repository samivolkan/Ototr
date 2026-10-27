import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../assets/google-review-refresh.js', import.meta.url), 'utf8');

function fixture() {
  const state = { now: 100000, hash: '#google-reviews', visible: 'visible', online: true, modal: false, locked: false,
    reviewBusy: false, workflowBusy: false, reviewSuccess: 0, workflowSuccess: 0, reviewFails: false, workflowFails: false,
    selectedBranch: 'branch-google-gebze', filter: 'unreplied' };
  const calls = [], intervals = [], timeouts = [], events = new Map();
  const window = { addEventListener: (name, callback) => events.set(name, callback) };
  window.OTOTRGoogleReputation = {
    getRefreshState: () => ({ busy: state.reviewBusy, lastSuccessAt: state.reviewSuccess }),
    async syncAllGoogleReviews(options) {
      calls.push({ kind: 'reviews', time: state.now, quiet: options.quiet });
      if (state.reviewFails) return null;
      state.reviewSuccess = state.now;
      return { syncedBranches: 3, missing: [] };
    },
  };
  window.OTOTRGoogleReviewAI = {
    getRefreshState: () => ({ busy: state.workflowBusy, lastSuccessAt: state.workflowSuccess }),
    async refreshWorkflow() {
      calls.push({ kind: 'workflow', time: state.now });
      if (state.workflowFails) return { ok: false };
      state.workflowSuccess = state.now;
      return { ok: true };
    },
  };
  const context = vm.createContext({ window,
    location: { get hash() { return state.hash; } }, navigator: { get onLine() { return state.online; } },
    document: { get visibilityState() { return state.visible; },
      documentElement: { classList: { contains: () => state.locked } },
      getElementById: () => ({ classList: { contains: () => state.modal } }),
      addEventListener: (name, callback) => events.set(name, callback),
    },
    Date: { now: () => state.now }, setTimeout: callback => timeouts.push(callback), setInterval: callback => intervals.push(callback),
  });
  vm.runInContext(source, context);
  return { state, calls, window, context, intervals, timeouts, events, check: () => window.OTOTRGoogleReviewRefresh.check(),
    async advance(ms) { state.now += ms; await intervals[0](); },
  };
}

test('first entry synchronizes all branches quietly, without changing selection or filter', async () => {
  const h = fixture(); await h.timeouts[0]();
  assert.deepEqual(h.calls.map(call => call.kind), ['reviews', 'workflow']);
  assert.equal(h.calls[0].quiet, true);
  assert.equal(h.state.selectedBranch, 'branch-google-gebze');
  assert.equal(h.state.filter, 'unreplied');
  assert.equal(h.window.OTOTRGoogleReviewAI.generate, undefined);
  assert.equal(h.window.OTOTRGoogleReviewAI.publish, undefined);
});

for (const [key, blocked] of [['hash', '#dealer'], ['visible', 'hidden'], ['online', false], ['modal', true], ['locked', true], ['reviewBusy', true], ['workflowBusy', true]]) {
  test(`${key} guard blocks initial and scheduled refresh until safe`, async () => {
    const h = fixture(), original = h.state[key]; h.state[key] = blocked;
    await h.check(); await h.advance(600000);
    assert.equal(h.calls.length, 0);
    h.state[key] = original; await h.advance(5000);
    assert.deepEqual(h.calls.map(call => call.kind), ['reviews', 'workflow']);
  });
}

test('workflow refreshes every minute and reviews every five minutes, not every timer tick', async () => {
  const h = fixture(); await h.check();
  await h.advance(59999); assert.equal(h.calls.length, 2);
  await h.advance(1); assert.deepEqual(h.calls.map(call => call.kind), ['reviews', 'workflow', 'workflow']);
  await h.advance(240000);
  assert.equal(h.calls.filter(call => call.kind === 'reviews').length, 2);
  assert.equal(h.calls.filter(call => call.kind === 'workflow').length, 3);
  await h.events.get('focus')(); await h.events.get('hashchange')();
  assert.equal(h.calls.length, 5);
});

test('fresh manual successes defer automatic calls, while an expired hidden tab resumes once visible', async () => {
  const h = fixture(); h.state.reviewSuccess = h.state.now; h.state.workflowSuccess = h.state.now;
  await h.check(); assert.equal(h.calls.length, 0);
  h.state.visible = 'hidden'; await h.advance(600000); assert.equal(h.calls.length, 0);
  h.state.visible = 'visible'; await h.events.get('visibilitychange')();
  assert.deepEqual(h.calls.map(call => call.kind), ['reviews', 'workflow']);
  await h.events.get('visibilitychange')(); assert.equal(h.calls.length, 2);
});

test('overlapping timer/focus/route events cannot start a duplicate request', async () => {
  const h = fixture(); let release;
  h.window.OTOTRGoogleReputation.syncAllGoogleReviews = async options => {
    h.calls.push({ kind: 'reviews', quiet: options.quiet });
    await new Promise(resolve => { release = resolve; });
    h.state.reviewSuccess = h.state.now;
    return { syncedBranches: 3, missing: [] };
  };
  const pending = h.check();
  await h.events.get('focus')(); await h.events.get('hashchange')(); await h.advance(5000);
  assert.equal(h.calls.length, 1);
  release(); await pending;
  assert.deepEqual(h.calls.map(call => call.kind), ['reviews', 'workflow']);
});

test('opening the editor during review sync postpones the workflow until the modal closes', async () => {
  const h = fixture();
  h.window.OTOTRGoogleReputation.syncAllGoogleReviews = async () => {
    h.calls.push({ kind: 'reviews' }); h.state.modal = true; h.state.reviewSuccess = h.state.now;
    return { syncedBranches: 3, missing: [] };
  };
  await h.check(); assert.equal(h.calls.length, 1);
  h.state.modal = false; await h.advance(5000);
  assert.deepEqual(h.calls.map(call => call.kind), ['reviews', 'workflow']);
});

test('errors back off independently and focus/online events cannot reset the deadline', async () => {
  const h = fixture(); h.state.reviewFails = true; h.state.workflowFails = true;
  await h.check();
  await h.events.get('online')(); await h.events.get('focus')(); await h.advance(59999);
  assert.equal(h.calls.length, 2);
  await h.advance(1); assert.equal(h.calls.filter(call => call.kind === 'workflow').length, 2);
  await h.advance(60000); assert.equal(h.calls.filter(call => call.kind === 'workflow').length, 2);
  await h.advance(60000); assert.equal(h.calls.filter(call => call.kind === 'workflow').length, 3);
  await h.advance(120000); assert.equal(h.calls.filter(call => call.kind === 'reviews').length, 2);
  await h.advance(300000); assert.equal(h.calls.filter(call => call.kind === 'reviews').length, 2);
  await h.advance(300000); assert.equal(h.calls.filter(call => call.kind === 'reviews').length, 3);
});

test('partial sync and rejected API promises also back off; manual recovery resets freshness', async () => {
  const h = fixture();
  h.window.OTOTRGoogleReputation.syncAllGoogleReviews = async () => { h.calls.push({ kind: 'reviews' }); return { syncedBranches: 2, missing: ['TEST branch'] }; };
  h.window.OTOTRGoogleReviewAI.refreshWorkflow = async () => { h.calls.push({ kind: 'workflow' }); throw new Error('fixture auth unavailable'); };
  await h.check(); await h.advance(5000); assert.equal(h.calls.length, 2);
  h.state.reviewSuccess = h.state.now; h.state.workflowSuccess = h.state.now;
  await h.check(); await h.advance(59999); assert.equal(h.calls.length, 2);
  await h.advance(1); assert.equal(h.calls.filter(call => call.kind === 'workflow').length, 2);
});

test('loading the scheduler twice installs only one interval and one initial check', () => {
  const h = fixture(); vm.runInContext(source, h.context);
  assert.equal(h.intervals.length, 1); assert.equal(h.timeouts.length, 1);
});

test('persistent failures cap retry backoff at fifteen minutes and recovery restores five minutes', async () => {
  const h = fixture(); h.state.reviewFails = true;
  await h.check(); await h.advance(300000); await h.advance(600000); await h.advance(900000);
  assert.equal(h.calls.filter(call => call.kind === 'reviews').length, 4);
  await h.advance(899999); assert.equal(h.calls.filter(call => call.kind === 'reviews').length, 4);
  h.state.reviewFails = false; await h.advance(1);
  assert.equal(h.calls.filter(call => call.kind === 'reviews').length, 5);
  await h.advance(299999); assert.equal(h.calls.filter(call => call.kind === 'reviews').length, 5);
  await h.advance(1); assert.equal(h.calls.filter(call => call.kind === 'reviews').length, 6);
});

test('scheduler awaits read-only verification after workflow refresh before preparation', async () => {
  const h = fixture(); let release;
  h.window.OTOTRGoogleReviewAI.verifyPendingReply = async () => { h.calls.push({ kind: 'verify' }); await new Promise(resolve => { release = resolve; }); return { ok: true }; };
  h.window.OTOTRGoogleReviewAI.preparePendingDrafts = () => h.calls.push({ kind: 'prepare' });
  const pending = h.check(); for (let i = 0; i < 10; i++) await Promise.resolve();
  assert.deepEqual(h.calls.map(call => call.kind), ['reviews', 'workflow', 'verify']);
  await h.events.get('focus')(); await h.events.get('online')(); assert.equal(h.calls.filter(call => call.kind === 'verify').length, 1);
  h.state.modal = true; release(); await pending;
  assert.equal(h.calls.some(call => call.kind === 'prepare'), false);
});

test('opening the editor during workflow refresh defers automatic verification', async () => {
  const h = fixture();
  h.window.OTOTRGoogleReviewAI.refreshWorkflow = async () => { h.calls.push({ kind: 'workflow' }); h.state.workflowSuccess = h.state.now; h.state.modal = true; return { ok: true }; };
  h.window.OTOTRGoogleReviewAI.verifyPendingReply = async () => { h.calls.push({ kind: 'verify' }); return { skipped: true }; };
  await h.check(); assert.equal(h.calls.some(call => call.kind === 'verify'), false);
  h.state.modal = false; await h.advance(5000); assert.equal(h.calls.filter(call => call.kind === 'verify').length, 1);
});
