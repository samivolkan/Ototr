import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../assets/google-review-ai.js', import.meta.url), 'utf8');
const scheduler = fs.readFileSync(new URL('../assets/google-review-refresh.js', import.meta.url), 'utf8');
const BRANCH = { id: 'branch-google-nilufer', name: 'OTOTR Bursa Nilüfer', replySignatureName: 'OTOTR Bursa Nilüfer Şube', googleBusinessAccountId: '123', googleBusinessLocationId: '900001' };
const decode = text => String(text).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const settle = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); await new Promise(resolve => setImmediate(resolve)); };

function fixture(count = 1) {
  const reviews = Array.from({ length: count }, (_, index) => ({ id: `erp-${index}`, googleReviewId: `google-${index}`, branchId: BRANCH.id, rating: 5, comment: `Synthetic review ${index}`, replyText: '', isReplied: false }));
  const server = { items: [], calls: [], holds: [], prepareHold: false, prepareError: false, publishHold: false, active: 0, maxActive: 0 };
  const state = { now: Date.parse('2026-10-27T12:00:00Z'), hash: '#google-reviews', visible: 'visible', online: true, locked: false, modal: false, syncBusy: false };
  const toasts = [], syncs = [];
  const listeners = new Map(), timeouts = new Map(), modalElements = new Map(); let timerId = 0, controller, rendered = new Map(), textareas = new Map();
  function modalElement() {
    const children = new Map(), classes = new Set();
    return { value: '', textContent: '', innerHTML: '', hidden: false, disabled: false, checked: false, dataset: {},
      classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) },
      querySelector(selector) { if (!children.has(selector)) children.set(selector, modalElement()); return children.get(selector); },
      addEventListener() {}, setAttribute() {},
    };
  }
  function item(review, status = 'approval_pending', extra = {}) {
    return { id: `00000000-0000-4000-8000-${String(reviews.indexOf(review) + 1).padStart(12, '0')}`, kind: 'reply',
      branch_id: BRANCH.id, branch_name: BRANCH.name, account_id: '123', location_id: BRANCH.googleBusinessLocationId,
      review_id: review.googleReviewId, version: 1, status, reply_text: status === 'draft_failed' ? '' : `Saved reply for ${review.id}`,
      draft_source: 'openai', expected_reply: '', review_snapshot: { comment: review.comment, rating: review.rating },
      last_error: status === 'draft_failed' ? 'Synthetic preparation failure' : null, ...extra };
  }
  function textarea(id, value) {
    return { dataset: { googleCardText: id }, value, selectionStart: 0, selectionEnd: 0, scrollTop: 0,
      focus() { document.activeElement = this; }, setSelectionRange(start, end) { this.selectionStart = start; this.selectionEnd = end; },
      closest: selector => selector === '.google-reply-panel' ? { querySelector: () => ({ disabled: false }) } : null };
  }
  const document = { activeElement: null, get visibilityState() { return state.visible; },
    documentElement: { classList: { contains: () => state.locked } },
    getElementById: id => modalElements.get(id) || (id === 'googleReviewAiModal' && state.modal ? { classList: { contains: () => true } } : null),
    createElement: modalElement, head: { appendChild() {} }, body: { appendChild(element) { if (element.id) modalElements.set(element.id, element); } },
    querySelectorAll: selector => selector === '[data-google-card-text]' ? [...textareas.values()] : [],
    addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(callback); },
  };
  const window = { addEventListener() {}, OTOTRGetLiveSession: async () => ({ access_token: 'synthetic-only' }), OTOTRGetSupabaseKey: () => 'synthetic-only', toast: message => toasts.push(message),
    OTOTRGoogleReputation: { demoReviews: reviews, getReviewById: id => reviews.find(review => review.id === id), getBranchById: id => id === BRANCH.id ? BRANCH : null,
      getRefreshState: () => ({ busy: state.syncBusy, lastSuccessAt: Date.now() }), syncAllGoogleReviews: async () => ({ syncedBranches: 3, missing: [] }),
      syncGoogleReviewsForBranch: async (id, options) => { syncs.push({ id, options }); }, setError() {}, render() {
        if (!controller) return;
        const nextTextareas = new Map(); rendered = new Map();
        for (const review of reviews) {
          const html = controller.renderReplyCard(review, BRANCH); rendered.set(review.id, html);
          const field = html.match(/<textarea[^>]*data-google-card-text="([^"]*)"[^>]*>([\s\S]*?)<\/textarea>/);
          if (field) nextTextareas.set(decode(field[1]), textarea(decode(field[1]), decode(field[2])));
        }
        textareas = nextTextareas;
      },
    },
  };
  async function fetch(url, options) {
    const body = JSON.parse(options.body); server.calls.push(body);
    if (body.action === 'workflow_list') return Response.json({ items: server.items, next_offset: null });
    if (body.action === 'prepare_draft') {
      server.active++; server.maxActive = Math.max(server.maxActive, server.active);
      try {
        if (server.prepareHold) await new Promise(resolve => server.holds.push({ action: 'prepare', resolve, body }));
        if (server.prepareError) return Response.json({ error: 'Synthetic temporary prepare error' }, { status: 502 });
        let saved = server.items.find(row => row.review_id === body.review_id);
        if (!saved) { saved = item(reviews.find(review => review.googleReviewId === body.review_id)); server.items.push(saved); }
        else if (body.retry) Object.assign(saved, { status: 'approval_pending', reply_text: 'Explicitly retried draft', last_error: null, version: saved.version + 1 });
        return Response.json({ item: saved });
      } finally { server.active--; }
    }
    if (body.action === 'save_draft') {
      const saved = server.items.find(row => row.id === body.item_id);
      if (!saved || saved.version !== body.expected_version) return Response.json({ error: 'Synthetic stale version' }, { status: 409 });
      Object.assign(saved, { version: saved.version + 1, reply_text: body.reply_text, draft_source: body.draft_source, status: 'approval_pending' });
      return Response.json({ item: saved });
    }
    if (body.action === 'publish_reply') {
      if (server.publishHold) await new Promise(resolve => server.holds.push({ action: 'publish', resolve, body }));
      const saved = server.items.find(row => row.id === body.item_id);
      if (saved.version !== body.expected_version) return Response.json({ error: 'Synthetic stale publication' }, { status: 409 });
      saved.status = 'published';
      return server.publishResponseLost ? Response.json({ error: 'Synthetic lost response' }, { status: 502 }) : Response.json({ item: saved });
    }
    if (body.action === 'verify_reply') {
      if (server.verifyHold) await new Promise(resolve => server.holds.push({ action: 'verify', resolve, body }));
      if (server.verifyError) return Response.json({ error: 'Synthetic verification network error' }, { status: 502 });
      const saved = server.items.find(row => row.id === body.item_id);
      Object.assign(saved, { status: server.verifyOutcome || 'published', last_error: null, review_snapshot: { ...saved.review_snapshot, reply_conflict: false } });
      return Response.json({ item: saved });
    }
    if (String(url).endsWith('/google-review-ai')) return Response.json({ reply: 'Explicitly regenerated synthetic draft' });
    throw new Error(`Unexpected synthetic action: ${body.action}`);
  }
  const context = vm.createContext({ window, document, fetch, Response, URL, AbortController,
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [state.now])); } static now() { return state.now; } },
    location: { get hash() { return state.hash; } }, navigator: { get onLine() { return state.online; } },
    setTimeout(callback, delay) { const id = ++timerId; timeouts.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timeouts.delete(id); }, setInterval() {}, localStorage: { getItem: () => null },
  });
  vm.runInContext(source, context); controller = window.OTOTRGoogleReviewAI;
  function emit(type, target) { for (const handler of listeners.get(type) || []) handler({ target }); }
  return { api: controller, state, server, reviews, window, document, context, item, toasts, syncs,
    html: id => controller.renderReplyCard(reviews.find(review => review.id === id), BRANCH),
    async load() { await controller.refreshWorkflow(); },
    async pump() { controller.preparePendingDrafts(); await settle(); },
    async runTimers() { const pending = [...timeouts].filter(([, timer]) => timer.delay === 0); for (const [id, timer] of pending) { timeouts.delete(id); timer.callback(); } await settle(); },
    async click(id, action) { const target = { dataset: { reviewId: id, googleCardAction: action }, closest: selector => selector === '[data-google-card-action]' ? target : null }; emit('click', target); await settle(); },
    async openWorkflow(id) { const target = { dataset: { googleWorkOpen: id }, closest: selector => selector === '[data-google-work-open]' ? target : null }; emit('click', target); await settle(); },
    approve(id, checked = true) { emit('change', { dataset: { googleCardApprove: id }, checked }); },
    input(id, value) { const target = textareas.get(id) || textarea(id, value); target.value = value; document.activeElement = target; emit('input', target); return target; },
    field: id => textareas.get(id), calls: action => server.calls.filter(call => call.action === action),
    modal: () => modalElements.get('googleReviewAiModal'), modalField: selector => modalElements.get('googleReviewAiModal')?.querySelector(selector),
    release(action = 'prepare') { const index = server.holds.findIndex(hold => hold.action === action); assert.ok(index >= 0, `No ${action} request held`); server.holds.splice(index, 1)[0].resolve(); },
  };
}

test('automatic preparation keeps at most two requests in flight and fills the freed slot', async () => {
  const h = fixture(5); h.server.prepareHold = true; await h.load(); await h.pump();
  assert.equal(h.calls('prepare_draft').length, 2); assert.equal(h.server.active, 2);
  await h.pump(); assert.equal(h.calls('prepare_draft').length, 2);
  h.release(); await settle(); await h.runTimers();
  assert.equal(h.calls('prepare_draft').length, 3); assert.equal(h.server.active, 2);
  while (h.server.holds.length) { h.release(); await settle(); await h.runTimers(); }
  assert.equal(h.calls('prepare_draft').length, 5); assert.equal(h.server.maxActive, 2);
  assert.equal(h.calls('publish_reply').length, 0);
});

test('automatic preparation skips answered reviews and every existing saved/preparing/failed draft', async () => {
  const h = fixture(5); h.reviews[0].isReplied = true; h.reviews[0].replyText = 'Existing Google answer';
  h.server.items.push(h.item(h.reviews[1]), h.item(h.reviews[2], 'draft_failed'), h.item(h.reviews[3], 'preparing'));
  await h.load(); await h.pump();
  assert.deepEqual(h.calls('prepare_draft').map(call => call.review_id), ['google-4']);
  assert.match(h.html('erp-0'), /Existing Google answer/); assert.doesNotMatch(h.html('erp-0'), /data-google-card-approve/);
  assert.match(h.html('erp-2'), /Yeniden dene/);
});

test('preparation failure never retries automatically; explicit retry is the only next attempt', async () => {
  const h = fixture(); h.server.prepareError = true; await h.load(); await h.pump();
  await h.runTimers(); await h.pump(); await h.pump();
  assert.equal(h.calls('prepare_draft').length, 1); assert.match(h.html('erp-0'), /Synthetic temporary prepare error/);
  assert.doesNotMatch(h.html('erp-0'), /data-google-card-approve/);
  h.server.prepareError = false; await h.click('erp-0', 'prepare');
  assert.equal(h.calls('prepare_draft').length, 2); assert.match(h.html('erp-0'), /Hazır yanıt/);
});

test('explicit retry of a saved failed draft binds its id and current version', async () => {
  const h = fixture(); const saved = h.item(h.reviews[0], 'draft_failed', { version: 4 }); h.server.items.push(saved);
  await h.load(); await h.pump(); assert.equal(h.calls('prepare_draft').length, 0);
  await h.click('erp-0', 'prepare');
  const sent = h.calls('prepare_draft')[0]; assert.equal(sent.retry, true); assert.equal(sent.item_id, saved.id); assert.equal(sent.expected_version, 4);
  assert.equal(h.api.getApprovalQueue()[0].version, 5);
});

test('explicit retry cannot exceed the same two-request preparation concurrency bound', async () => {
  const h = fixture(3); h.server.items.push(h.item(h.reviews[2], 'draft_failed')); h.server.prepareHold = true;
  await h.load(); await h.pump(); await h.click('erp-2', 'prepare');
  assert.equal(h.server.maxActive, 2);
  while (h.server.holds.length) { h.release(); await settle(); }
});

test('inline approval binds exact item version and text, and a remote change clears it', async () => {
  const h = fixture(); const saved = h.item(h.reviews[0]); h.server.items.push(saved); await h.load();
  await h.click('erp-0', 'send'); assert.equal(h.calls('publish_reply').length, 0);
  h.approve('erp-0'); saved.version = 2; saved.reply_text = 'Remote version two'; await h.load();
  await h.click('erp-0', 'send'); assert.equal(h.calls('publish_reply').length, 0);
  h.approve('erp-0'); saved.reply_text = 'Changed text with same version'; await h.load();
  await h.click('erp-0', 'send'); assert.equal(h.calls('publish_reply').length, 0);
  h.approve('erp-0'); await h.click('erp-0', 'send');
  assert.deepEqual(h.calls('publish_reply')[0], { action: 'publish_reply', item_id: saved.id, expected_version: 2, approved: true });
});

test('editing clears approval; unsaved text cannot send and saved changes need a new approval', async () => {
  const h = fixture(); h.server.items.push(h.item(h.reviews[0])); await h.load(); h.approve('erp-0');
  await h.click('erp-0', 'edit'); h.input('erp-0', 'My revised draft');
  assert.doesNotMatch(h.html('erp-0'), /data-google-card-approve/);
  await h.click('erp-0', 'send'); assert.equal(h.calls('publish_reply').length, 0);
  await h.click('erp-0', 'save');
  assert.equal(h.calls('save_draft')[0].reply_text, 'My revised draft'); assert.equal(h.calls('save_draft')[0].expected_version, 1);
  await h.click('erp-0', 'send'); assert.equal(h.calls('publish_reply').length, 0);
  h.approve('erp-0'); await h.click('erp-0', 'send'); assert.equal(h.calls('publish_reply')[0].expected_version, 2);
});

test('double-clicking send starts one publication request and keeps controls locked until it settles', async () => {
  const h = fixture(); h.server.items.push(h.item(h.reviews[0])); h.server.publishHold = true; await h.load(); h.approve('erp-0');
  await h.click('erp-0', 'send'); await h.click('erp-0', 'send');
  assert.equal(h.calls('publish_reply').length, 1); assert.equal(h.api.getRefreshState().busy, true);
  h.release('publish'); await settle(); assert.equal(h.api.getRefreshState().busy, false);
  assert.match(h.html('erp-0'), /Yayımlanan yanıt/); assert.doesNotMatch(h.html('erp-0'), /data-google-card-approve/);
});

test('a remote version change preserves an edited draft and blocks saving it over the newer version', async () => {
  const h = fixture(); const saved = h.item(h.reviews[0]); h.server.items.push(saved); await h.load();
  await h.click('erp-0', 'edit'); h.input('erp-0', 'My unsaved text must survive');
  saved.version = 2; saved.reply_text = 'Remote newer text'; await h.load();
  assert.match(h.html('erp-0'), /My unsaved text must survive/); assert.match(h.html('erp-0'), /Yazdığınız metin korundu/);
  await h.click('erp-0', 'save'); assert.equal(h.calls('save_draft').length, 0);
  await h.click('erp-0', 'cancel'); assert.match(h.html('erp-0'), /Remote newer text/);
});

test('another preparation completing preserves active textarea focus, text, caret and scroll', async () => {
  const h = fixture(2); h.server.items.push(h.item(h.reviews[0])); h.server.prepareHold = true; await h.load(); await h.pump();
  await h.click('erp-0', 'edit'); const previous = h.input('erp-0', 'Unsaved multi-line text\nSecond line');
  previous.selectionStart = 4; previous.selectionEnd = 12; previous.scrollTop = 39;
  h.release(); await settle();
  const next = h.field('erp-0'); assert.notStrictEqual(next, previous); assert.strictEqual(h.document.activeElement, next);
  assert.equal(next.value, 'Unsaved multi-line text\nSecond line'); assert.equal(next.selectionStart, 4); assert.equal(next.selectionEnd, 12); assert.equal(next.scrollTop, 39);
});

test('card reply, analysis and error HTML are escaped; textarea contents cannot inject markup', async () => {
  const h = fixture(); h.server.items.push(h.item(h.reviews[0], 'approval_pending', { reply_text: '</textarea><script>attack()</script>', last_error: '<img src=x onerror=attack()>', review_snapshot: { ai_analysis: { risk_reason: '<iframe>risk</iframe>' } } }));
  await h.load(); const html = h.html('erp-0');
  assert.doesNotMatch(html, /<script>|<img src=x|<iframe>/); assert.match(html, /&lt;script&gt;/);
  await h.click('erp-0', 'edit'); assert.doesNotMatch(h.html('erp-0'), /<script>/); assert.match(h.html('erp-0'), /&lt;\/textarea&gt;/);
});

for (const [key, blocked] of [['hash', '#dealer'], ['visible', 'hidden'], ['online', false], ['locked', true], ['modal', true], ['syncBusy', true]]) {
  test(`automatic preparation waits while ${key} is blocked`, async () => {
    const h = fixture(); await h.load(); h.state[key] = blocked; await h.pump(); assert.equal(h.calls('prepare_draft').length, 0);
  });
}

test('scheduler hook prepares only after workflow is loaded and never publishes', async () => {
  const h = fixture(); await h.pump(); assert.equal(h.calls('prepare_draft').length, 0);
  vm.runInContext(scheduler, h.context); await h.window.OTOTRGoogleReviewRefresh.check(); await settle();
  assert.equal(h.calls('prepare_draft').length, 1); assert.equal(h.calls('publish_reply').length, 0);
});

test('answered review with a reply conflict keeps Google text read-only and opens the saved draft plus current answer', async () => {
  const h = fixture(); h.reviews[0].isReplied = true; h.reviews[0].replyText = 'Current external Google answer';
  h.server.items.push(h.item(h.reviews[0], 'publish_failed', { reply_text: 'My preserved saved draft',
    review_snapshot: { reply_conflict: true, current_reply: 'Current external Google answer' } }));
  await h.load(); const html = h.html('erp-0');
  assert.match(html, /Current external Google answer/); assert.match(html, /Kayıtlı taslağı ve mevcut yanıtı incele/);
  assert.doesNotMatch(html, /data-google-card-approve|data-google-card-action="send"/);
  await h.click('erp-0', 'details');
  assert.equal(h.modal().classList.contains('open'), true);
  assert.equal(h.modalField('#googleAiReply').value, 'My preserved saved draft');
  assert.equal(h.modalField('#googleAiExisting').hidden, false);
  assert.match(h.modalField('#googleAiExisting').textContent, /Current external Google answer/);
  assert.equal(h.modalField('#googleAiApprove').checked, false);
  assert.equal(h.modalField('[data-google-ai-publish]').disabled, true);
  assert.equal(h.calls('publish_reply').length, 0); assert.equal(h.calls('save_draft').length, 0);
});

test('answered publish_failed review without a conflict snapshot still shows its known live answer in details', async () => {
  const h = fixture(); h.reviews[0].isReplied = true; h.reviews[0].replyText = 'Actual Google answer from the latest sync';
  h.server.items.push(h.item(h.reviews[0], 'publish_failed', { reply_text: 'Saved draft preserved after rejection', expected_reply: '', review_snapshot: {} }));
  await h.load(); assert.match(h.html('erp-0'), /data-google-card-action="details"/);
  await h.click('erp-0', 'details');
  assert.equal(h.modalField('#googleAiReply').value, 'Saved draft preserved after rejection');
  assert.equal(h.modalField('#googleAiExisting').hidden, false);
  assert.match(h.modalField('#googleAiExisting').textContent, /Actual Google answer from the latest sync/);
  assert.equal(h.api.getApprovalQueue()[0].expected_reply, '', 'opening details must not change the stored overwrite expectation');
  assert.equal(h.calls('publish_reply').length, 0); assert.equal(h.calls('save_draft').length, 0);
});

test('conflicted edit and regenerate actions open the comparison modal without generating or saving', async () => {
  for (const action of ['edit', 'regenerate']) {
    const h = fixture();
    h.server.items.push(h.item(h.reviews[0], 'publish_failed', { review_snapshot: { reply_conflict: true, current_reply: 'Different external answer' } }));
    await h.load(); h.approve('erp-0'); await h.click('erp-0', 'send');
    assert.equal(h.calls('publish_reply').length, 0);
    await h.click('erp-0', action);
    assert.equal(h.modal().classList.contains('open'), true);
    assert.match(h.modalField('#googleAiExisting').textContent, /Different external answer/);
    assert.doesNotMatch(h.html('erp-0'), /data-google-card-text=/);
    assert.equal(h.calls('generate').length, 0); assert.equal(h.calls('save_draft').length, 0);
  }
});

for (const status of ['publishing', 'publish_unknown', 'publish_failed']) {
  test(`an answered ${status} reply remains visible for read-only publication verification`, async () => {
    const h = fixture(); h.reviews[0].isReplied = true; h.reviews[0].replyText = 'Reply already visible on Google';
    const saved = h.item(h.reviews[0], status, { approved_by: 'synthetic-user', approved_at: '2026-10-27T00:00:00Z' });
    h.server.items.push(saved); await h.load();
    assert.match(h.html('erp-0'), status === 'publish_failed' ? /Yayın kaydı doğrulama bekliyor/ : /Gönderim sonucu kontrol ediliyor/);
    assert.match(h.html('erp-0'), /data-google-card-action="verify"/);
    assert.match(h.html('erp-0'), /data-google-card-action="details"/);
    assert.doesNotMatch(h.html('erp-0'), /data-google-card-action="send"|data-google-card-approve/);
    assert.match(h.api.renderAutoDraftSummary(BRANCH.id), /1 yayın kontrolü/);
    await h.click('erp-0', 'verify');
    assert.equal(h.calls('verify_reply').length, 1);
    assert.deepEqual(h.calls('verify_reply')[0], { action: 'verify_reply', item_id: saved.id, expected_version: 1 });
    assert.equal(h.calls('publish_reply').length, 0); assert.equal(h.calls('save_draft').length, 0);
    assert.match(h.html('erp-0'), /Yayımlandığı doğrulandı/);
    assert.doesNotMatch(h.html('erp-0'), /data-google-card-action="verify"/);
    assert.doesNotMatch(h.api.renderAutoDraftSummary(BRANCH.id), /1 yayın kontrolü/);
  });
}

test('failed replies require both original approval fields for read-only recovery, even on synthetic clicks', async () => {
  for (const approval of [{}, { approved_by: 'synthetic-user' }, { approved_at: '2026-10-27T00:00:00Z' }]) {
    const h = fixture(); h.reviews[0].isReplied = true;
    h.server.items.push(h.item(h.reviews[0], 'publish_failed', approval)); await h.load();
    assert.doesNotMatch(h.html('erp-0'), /data-google-card-action="verify"/);
    await h.click('erp-0', 'verify'); assert.equal(h.calls('verify_reply').length, 0);
    assert.equal(h.calls('publish_reply').length, 0);
  }
});

test('a lost publication response followed by authoritative published status clears the card error without sending again', async () => {
  const h = fixture(); h.server.items.push(h.item(h.reviews[0])); h.server.publishResponseLost = true;
  await h.load(); h.approve('erp-0'); await h.click('erp-0', 'send');
  assert.equal(h.calls('publish_reply').length, 1);
  assert.equal(h.api.getApprovalQueue()[0].status, 'published');
  assert.match(h.html('erp-0'), /Google’da yayımlandı/);
  assert.doesNotMatch(h.html('erp-0'), /Synthetic lost response|data-google-card-approve/);
});

test('verification cannot discard an unsaved inline edit of a previously approved failed reply', async () => {
  const h = fixture();
  h.server.items.push(h.item(h.reviews[0], 'publish_failed', { approved_by: 'synthetic-user', approved_at: '2026-10-27T00:00:00Z' }));
  await h.load(); await h.click('erp-0', 'edit'); h.input('erp-0', 'Unsaved work must remain');
  assert.doesNotMatch(h.html('erp-0'), /data-google-card-action="verify"/);
  await h.click('erp-0', 'verify');
  assert.equal(h.calls('verify_reply').length, 0); assert.match(h.html('erp-0'), /Unsaved work must remain/);
});

test('summary opens each answered pending verification in its branch even when the review list is filtered out', async () => {
  const h = fixture(3);
  h.reviews.forEach(review => { review.isReplied = true; review.replyText = 'Visible Google answer'; });
  h.reviews[0].reviewerName = '<img src=x onerror=attack()>';
  const first = h.item(h.reviews[0], 'publish_unknown'), second = h.item(h.reviews[1], 'publishing');
  h.reviews[2].branchId = 'another-branch';
  const other = h.item(h.reviews[2], 'publish_unknown', { branch_id: 'another-branch' });
  h.server.items.push(first, second, other); await h.load();
  const summary = h.api.renderAutoDraftSummary(BRANCH.id);
  assert.match(summary, /2 yayın kontrolü/); assert.match(summary, /&lt;img src=x onerror=attack\(\)&gt;/);
  assert.doesNotMatch(summary, /<img src=x/);
  assert.ok(summary.includes(`data-google-work-open="${first.id}"`));
  assert.ok(summary.includes(`data-google-work-open="${second.id}"`));
  assert.ok(!summary.includes(`data-google-work-open="${other.id}"`));
  await h.openWorkflow(first.id);
  assert.equal(h.modalField('#googleAiReply').value, first.reply_text);
  assert.equal(h.modalField('[data-google-ai-verify]').hidden, false);
  assert.equal(h.calls('publish_reply').length, 0); assert.equal(h.calls('verify_reply').length, 0);
});

const approvedWaiting = { approved_by: 'synthetic-user', approved_at: '2026-10-27T00:00:00Z' };

test('accepted pending and uncertain submissions use distinct waiting information without error styling', async () => {
  for (const accepted of [true, false]) {
    const h = fixture();
    h.server.items.push(h.item(h.reviews[0], 'publish_unknown', { ...approvedWaiting, last_error: 'Legacy unknown error', review_snapshot: { google_reply_accepted: accepted, google_reply_state: accepted ? 'PENDING' : '' } }));
    await h.load();
    assert.match(h.html('erp-0'), accepted ? /Yanıt gönderildi, kontrol ediliyor/ : /Gönderim sonucu kontrol ediliyor/);
    assert.doesNotMatch(h.html('erp-0'), /google-reply-error|Legacy unknown error|data-google-card-action="send"/);
    await h.pump(); assert.equal(h.calls('publish_reply').length, 0);
  }
});

test('automatic verification rotates approved pending items once per minute and only performs read-only requests', async () => {
  const h = fixture(3); h.server.verifyOutcome = 'publish_unknown';
  h.reviews.forEach(review => h.server.items.push(h.item(review, 'publish_unknown', approvedWaiting))); await h.load();
  await h.api.verifyPendingReply(); await h.api.verifyPendingReply();
  assert.equal(h.calls('verify_reply').length, 1);
  h.state.now += 59999; await h.api.verifyPendingReply(); assert.equal(h.calls('verify_reply').length, 1);
  h.state.now++; await h.api.verifyPendingReply(); h.state.now += 60000; await h.api.verifyPendingReply();
  assert.deepEqual(h.calls('verify_reply').map(call => call.item_id), h.server.items.map(item => item.id));
  assert.ok(h.calls('verify_reply').every(call => !('approved' in call)));
  assert.equal(h.calls('publish_reply').length, 0); assert.equal(h.toasts.length, 0); assert.equal(h.syncs.length, 0);
  assert.match(h.html('erp-0'), /Son kontrol:/);
});

test('automatic verification excludes unapproved, fresh publishing, published, rejected and conflicted records', async () => {
  const h = fixture(7);
  const statuses = ['publish_unknown', 'publishing', 'published', 'publish_unknown', 'publish_failed', 'publish_unknown', 'publishing'];
  h.reviews.forEach((review, index) => h.server.items.push(h.item(review, statuses[index], {
    ...(index === 0 ? {} : approvedWaiting), updated_at: new Date(h.state.now - (index === 6 ? 90001 : 90000)).toISOString(),
    review_snapshot: index === 3 ? { google_reply_state: 'REJECTED' } : index === 5 ? { reply_conflict: true } : {},
  })));
  await h.load(); await h.api.verifyPendingReply();
  assert.equal(h.calls('verify_reply').length, 1); assert.equal(h.calls('verify_reply')[0].item_id, h.server.items[6].id);
  h.state.now += 1; await h.api.verifyPendingReply(); assert.equal(h.calls('verify_reply').length, 1);
  assert.equal(h.calls('publish_reply').length, 0);
});

for (const [key, blocked] of [['hash', '#dealer'], ['visible', 'hidden'], ['online', false], ['locked', true], ['modal', true], ['syncBusy', true]]) {
  test(`automatic verification pauses while ${key} is blocked`, async () => {
    const h = fixture(); h.server.items.push(h.item(h.reviews[0], 'publish_unknown', approvedWaiting)); await h.load();
    h.state[key] = blocked; await h.api.verifyPendingReply(); assert.equal(h.calls('verify_reply').length, 0);
  });
}

test('automatic verification waits for inline edits and never overwrites the draft', async () => {
  const h = fixture(2); h.server.items.push(h.item(h.reviews[0], 'publish_unknown', approvedWaiting), h.item(h.reviews[1])); await h.load();
  await h.click('erp-1', 'edit'); h.input('erp-1', 'My unsaved draft');
  await h.api.verifyPendingReply(); assert.equal(h.calls('verify_reply').length, 0); assert.match(h.html('erp-1'), /My unsaved draft/);
});

test('in-flight automatic verification and manual controls share one lock, and published completion is quiet', async () => {
  const h = fixture(); h.server.items.push(h.item(h.reviews[0], 'publish_unknown', approvedWaiting)); h.server.verifyHold = true; await h.load();
  const pending = h.api.verifyPendingReply(); await settle();
  await h.api.verifyPendingReply(); await h.click('erp-0', 'verify');
  assert.equal(h.calls('verify_reply').length, 1); assert.equal(h.api.getRefreshState().busy, true);
  await h.click('erp-0', 'details'); assert.equal(h.modalField('[data-google-ai-verify]').disabled, true);
  h.release('verify'); await pending;
  assert.equal(h.calls('publish_reply').length, 0); assert.equal(h.toasts.length, 0);
  assert.equal(h.syncs.length, 0, 'opening the modal defers the background review refresh');
  assert.equal(h.api.getApprovalQueue()[0].status, 'published');
  assert.match(h.modalField('#googleAiWarning').textContent, /yayımlandığı doğrulandı/);
  h.modal().classList.remove('open'); await h.api.verifyPendingReply();
  assert.equal(h.syncs.length, 1); assert.equal(h.syncs[0].options.quiet, true);
});

test('verification network errors back off to five minutes; rejected results stop polling', async () => {
  const h = fixture(); h.server.items.push(h.item(h.reviews[0], 'publish_unknown', approvedWaiting)); h.server.verifyError = true; await h.load();
  for (const wait of [60000, 120000, 240000, 300000]) {
    await h.api.verifyPendingReply(); const count = h.calls('verify_reply').length;
    h.state.now += wait - 1; await h.api.verifyPendingReply(); assert.equal(h.calls('verify_reply').length, count);
    h.state.now++;
  }
  h.server.verifyError = false; h.server.verifyOutcome = 'publish_failed';
  await h.api.verifyPendingReply(); const count = h.calls('verify_reply').length;
  h.state.now += 600000; await h.api.verifyPendingReply(); assert.equal(h.calls('verify_reply').length, count);
  assert.equal(h.calls('publish_reply').length, 0); assert.equal(h.toasts.length, 0);
});

test('automatic verification never reopens a modal the user already closed', async () => {
  const h = fixture(); h.server.items.push(h.item(h.reviews[0], 'publish_unknown', approvedWaiting)); await h.load();
  await h.click('erp-0', 'details'); h.modal().classList.remove('open');
  await h.api.verifyPendingReply();
  assert.equal(h.modal().classList.contains('open'), false); assert.equal(h.syncs.length, 1); assert.equal(h.toasts.length, 0);
});

test('an edit begun while verification is in flight keeps its text and focus and defers the review refresh', async () => {
  const h = fixture(2); h.server.items.push(h.item(h.reviews[0], 'publish_unknown', approvedWaiting), h.item(h.reviews[1]));
  h.server.verifyHold = true; await h.load(); const pending = h.api.verifyPendingReply(); await settle();
  await h.click('erp-1', 'edit'); const field = h.input('erp-1', 'Draft typed during verification'); field.selectionStart = 3; field.selectionEnd = 8;
  h.release('verify'); await pending;
  assert.equal(h.syncs.length, 0); assert.match(h.html('erp-1'), /Draft typed during verification/);
  assert.strictEqual(h.document.activeElement, h.field('erp-1')); assert.equal(h.field('erp-1').selectionStart, 3); assert.equal(h.field('erp-1').selectionEnd, 8);
  await h.click('erp-1', 'cancel'); await h.api.verifyPendingReply(); assert.equal(h.syncs.length, 1);
  assert.equal(h.calls('publish_reply').length, 0);
});
