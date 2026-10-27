import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const source = await readFile(new URL('../assets/google-review-ai.js', import.meta.url), 'utf8');
const BRANCH = { id: 'branch-google-nilufer', name: 'OTOTR Oto Ekspertiz Bursa Nilüfer', replySignatureName: 'OTOTR Bursa Nilüfer Şube', googleBusinessAccountId: '123', googleBusinessLocationId: '13476693615171033693' };
const REVIEW = { id: 'erp-review-one', googleReviewId: 'google-review-one', branchId: BRANCH.id, rating: 5, comment: 'Özenli hizmet için teşekkürler.', recommendedAction: 'Yanıtı değerlendirin.' };

class Element {
  constructor() { this.children = new Map(); this.listeners = new Map(); this.value = ''; this.checked = false; this.disabled = false; this.hidden = false; this.innerHTML = ''; this.textContent = ''; this.dataset = {}; this.attributes = {}; const classes = new Set(); this.classList = { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) }; }
  querySelector(selector) { if (!this.children.has(selector)) this.children.set(selector, new Element()); return this.children.get(selector); }
  addEventListener(type, handler) { if (!this.listeners.has(type)) this.listeners.set(type, []); this.listeners.get(type).push(handler); }
  setAttribute(name, value) { this.attributes[name] = value; }
  closest() { return null; }
  async dispatch(type) { for (const handler of this.listeners.get(type) || []) await handler({ target: this }); }
}

function server() {
  const state = { items: [], calls: [], aiFails: false, publishFails: false, saveFails: false, listFails: false };
  return {
    state,
    async fetch(url, options) {
      const body = JSON.parse(options.body); state.calls.push(body);
      if (String(url).endsWith('/google-review-ai')) return state.aiFails ? Response.json({ error: 'Fixture OpenAI unavailable' }, { status: 502 }) : Response.json({ reply: 'Özenli hizmetimizi değerlendirmeniz bizi mutlu etti.\n\nOTOTR Bursa Nilüfer Şube ekibi', tone: 'samimi', risk_reason: '' });
      if (body.action === 'workflow_list') return state.listFails ? Response.json({ error: 'Fixture storage unavailable' }, { status: 503 }) : Response.json({ items: state.items, next_offset: null });
      if (body.action === 'save_draft' || body.action === 'create_task') {
        if (state.saveFails) return Response.json({ error: 'Fixture save rejected' }, { status: 503 });
        let item = body.item_id ? state.items.find(item => item.id === body.item_id) : null;
        if (!item) {
          item = { id: `00000000-0000-4000-8000-${String(state.items.length + 1).padStart(12, '0')}`, branch_id: body.branch_id, branch_name: BRANCH.name, account_id: body.account_id, location_id: body.location_id, review_id: body.review_id, kind: body.action === 'save_draft' ? 'reply' : body.kind, version: 0, expected_reply: '', review_snapshot: { rating: REVIEW.rating, comment: REVIEW.comment } };
          state.items.push(item);
        }
        Object.assign(item, { reply_text: body.reply_text || '', draft_source: body.draft_source || 'manual', status: body.action === 'save_draft' ? 'approval_pending' : 'open', note: body.note || '', version: item.version + 1 });
        return Response.json({ item });
      }
      if (body.action === 'publish_reply') {
        const item = state.items.find(item => item.id === body.item_id);
        if (state.publishFails) { item.status = 'publish_unknown'; item.last_error = 'Fixture publication outcome unknown'; return Response.json({ error: item.last_error }, { status: 502 }); }
        item.status = 'published'; return Response.json({ item });
      }
      if (body.action === 'update_task') {
        const item = state.items.find(item => item.id === body.item_id);
        Object.assign(item, { status: body.status, note: body.note, version: item.version + 1 });
        return Response.json({ item });
      }
      throw new Error(`Unexpected fixture action ${body.action}`);
    },
  };
}

function ui(shared = server()) {
  const elements = new Map(), toasts = [], storageWrites = [], syncs = [];
  const document = {
    getElementById: id => elements.get(id) || null,
    createElement: () => new Element(),
    head: { appendChild() {} },
    body: { appendChild(element) { if (element.id) elements.set(element.id, element); } },
    addEventListener() {},
  };
  const window = {
    OTOTRGetLiveSession: async () => ({ access_token: 'fixture-session' }),
    OTOTRGetSupabaseKey: () => 'fixture-public',
    toast: value => toasts.push(value),
    OTOTRGoogleReputation: { getReviewById: id => id === REVIEW.id ? REVIEW : null, getBranchById: id => id === BRANCH.id ? BRANCH : null, render() {}, setError() {}, syncGoogleReviewsForBranch: async id => syncs.push(id) },
  };
  vm.runInNewContext(source, { window, document, localStorage: { getItem: () => null, setItem: (...args) => storageWrites.push(args) }, fetch: shared.fetch, Response, URL, AbortController, setTimeout: () => 1, clearTimeout() {}, console });
  const api = window.OTOTRGoogleReviewAI;
  return { api, window, shared, toasts, storageWrites, syncs, modal: () => elements.get('googleReviewAiModal'), element: selector => elements.get('googleReviewAiModal').querySelector(selector) };
}

test('Google publication is disabled until saved text receives explicit user approval', async () => {
  const h = ui();
  await h.api.generate(REVIEW.id);
  assert.equal(h.element('[data-google-ai-publish]').disabled, true);
  await h.element('[data-google-ai-publish]').dispatch('click');
  assert.equal(h.shared.state.calls.some(call => call.action === 'publish_reply'), false);
  await h.element('[data-google-ai-queue]').dispatch('click');
  assert.equal(h.shared.state.items.length, 1);
  assert.equal(h.element('#googleAiApprove').checked, false);
  assert.equal(h.element('[data-google-ai-publish]').disabled, true);
  h.element('#googleAiApprove').checked = true;
  await h.element('#googleAiApprove').dispatch('change');
  assert.equal(h.element('[data-google-ai-publish]').disabled, false);
  await h.element('[data-google-ai-publish]').dispatch('click');
  const publish = h.shared.state.calls.find(call => call.action === 'publish_reply');
  assert.deepEqual(publish, { action: 'publish_reply', item_id: h.shared.state.items[0].id, expected_version: 1, approved: true });
  assert.equal(h.element('[data-google-ai-publish]').hidden, true);
  assert.equal(h.element('#googleAiApproval').hidden, true);
  assert.equal(h.element('#googleAiReply').readOnly, true);
  assert.match(h.element('#googleAiWarning').textContent, /yayımlandığı doğrulandı/);
  assert.doesNotMatch(h.element('#googleAiWarning').textContent, /Önce taslağı kaydedin/);
  assert.match(source, /\.google-ai-dialog \[hidden\]\{display:none!important\}/);
  assert.equal(h.toasts.length, 1);
  assert.deepEqual(h.syncs, [BRANCH.id]);
  assert.equal(h.storageWrites.length, 0);
});

test('editing after approval clears approval and cannot publish unsaved text', async () => {
  const h = ui();
  await h.api.generate(REVIEW.id);
  await h.element('[data-google-ai-queue]').dispatch('click');
  h.element('#googleAiApprove').checked = true;
  await h.element('#googleAiApprove').dispatch('change');
  h.element('#googleAiReply').value += '\nManuel düzenleme.';
  await h.element('#googleAiReply').dispatch('input');
  assert.equal(h.element('#googleAiApprove').checked, false);
  assert.equal(h.element('[data-google-ai-publish]').disabled, true);
  await h.element('[data-google-ai-publish]').dispatch('click');
  assert.equal(h.shared.state.calls.some(call => call.action === 'publish_reply'), false);
});

test('OpenAI failure remains identified as a local template after saving', async () => {
  const shared = server(); shared.state.aiFails = true;
  const h = ui(shared);
  await h.api.generate(REVIEW.id);
  assert.match(h.element('#googleAiMeta').innerHTML, /Yerel şablon/);
  assert.match(h.element('#googleAiWarning').textContent, /yerel şablondur/);
  await h.element('[data-google-ai-queue]').dispatch('click');
  assert.equal(shared.state.items[0].draft_source, 'local_template');
  assert.match(h.api.renderWorkflow(BRANCH.id), /Yerel şablon/);
  assert.doesNotMatch(h.api.renderWorkflow(BRANCH.id), /OpenAI taslağı/);
});

test('a failed publication refreshes its actual status without success toast or review sync', async () => {
  const h = ui();
  await h.api.generate(REVIEW.id);
  await h.element('[data-google-ai-queue]').dispatch('click');
  h.shared.state.publishFails = true;
  h.element('#googleAiApprove').checked = true;
  await h.element('#googleAiApprove').dispatch('change');
  await h.element('[data-google-ai-publish]').dispatch('click');
  assert.equal(h.toasts.length, 0);
  assert.equal(h.syncs.length, 0);
  assert.match(h.element('#googleAiWarning').textContent, /Başarı bildirimi alınmadı/);
  assert.equal(h.element('[data-google-ai-verify]').hidden, false);
  assert.equal(h.element('#googleAiReply').readOnly, true);
  assert.match(h.api.renderWorkflow(BRANCH.id), /Yayın sonucu belirsiz/);
});

test('a failed save leaves draft unpublished and visibly reports the error', async () => {
  const h = ui();
  await h.api.generate(REVIEW.id);
  h.shared.state.saveFails = true;
  await h.element('[data-google-ai-queue]').dispatch('click');
  assert.equal(h.shared.state.items.length, 0);
  assert.equal(h.element('[data-google-ai-publish]').disabled, true);
  assert.match(h.element('#googleAiWarning').textContent, /save rejected/);
  assert.equal(h.toasts.length, 0);
});

test('verified external reply is visible and requires saving again before approval', async () => {
  const h = ui();
  await h.api.generate(REVIEW.id);
  await h.element('[data-google-ai-queue]').dispatch('click');
  const item = h.shared.state.items[0];
  item.status = 'publish_failed';
  item.review_snapshot.reply_conflict = true;
  item.review_snapshot.current_reply = 'Google manager external reply.';
  item.last_error = 'Mevcut yanıtı inceleyip taslağı yeniden kaydedin.';
  await h.api.refreshWorkflow();
  h.api.openItem(item.id);
  assert.equal(h.element('#googleAiReply').readOnly, false);
  assert.equal(h.element('[data-google-ai-queue]').hidden, false);
  assert.match(h.element('#googleAiExisting').textContent, /Google manager external reply/);
  assert.equal(h.element('#googleAiApprove').disabled, true);
  h.element('#googleAiApprove').checked = true;
  await h.element('[data-google-ai-publish]').dispatch('click');
  assert.equal(h.shared.state.calls.some(call => call.action === 'publish_reply'), false);
});

test('another browser session sees a saved branch task and can update its state', async () => {
  const shared = server(), first = ui(shared), second = ui(shared);
  await first.api.createTask(REVIEW.id, 'branch');
  assert.equal(shared.state.items.length, 1);
  await second.api.refreshWorkflow();
  assert.match(second.api.renderWorkflow(BRANCH.id), /Şube yanıt görevi/);
  second.api.openItem(shared.state.items[0].id);
  second.element('#googleAiReply').value = 'Şube yönetimi yorumla ilgili inceleme yaptı.';
  second.element('#googleTaskState').value = 'done';
  await second.element('[data-google-ai-queue]').dispatch('click');
  await first.api.refreshWorkflow();
  assert.match(first.api.renderWorkflow(BRANCH.id), /Tamamlandı/);
  assert.match(first.api.renderWorkflow(BRANCH.id), /Şube yönetimi yorumla ilgili inceleme yaptı/);
  assert.equal(shared.state.calls.some(call => call.action === 'publish_reply'), false);
});

test('workflow customer text and drafts are escaped in the HTML view', async () => {
  const shared = server();
  shared.state.items.push({ id: '00000000-0000-4000-8000-000000000001', branch_id: BRANCH.id, kind: 'reply', status: 'approval_pending', draft_source: 'manual', reply_text: '<script>attack()</script>', review_snapshot: { rating: 5, comment: '<img src=x onerror=attack()>' } });
  const h = ui(shared); await h.api.refreshWorkflow();
  const html = h.api.renderWorkflow(BRANCH.id);
  assert.doesNotMatch(html, /<script>|<img src=x/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&lt;img src=x/);
});

test('workflow load failure is shown as unavailable instead of an empty successful list', async () => {
  const shared = server(); shared.state.listFails = true;
  const h = ui(shared); await h.api.refreshWorkflow();
  const html = h.api.renderWorkflow(BRANCH.id);
  assert.match(html, /Görevler henüz alınamadı/);
  assert.match(html, /Fixture storage unavailable/);
  assert.doesNotMatch(html, /Bu şubeye ait kayıtlı yanıt veya görev yok/);
});
