import { createHandoffService } from './features/handoff-service.js';
import { createDeliveryService } from './features/delivery-service.js';
import { createAssignmentReceiptService } from './features/assignment-receipt.js';
import { createClient } from '../../../task-merkezi-v2/js/vendor/supabase.js';
import { requireSession, signOut as erpSignOut } from '../../../task-merkezi-v2/js/auth.js';
import { seed } from './data/seed.js';
import { S } from './core/store.js';
import { sanitizeHtml } from './core/utils.js';

const cfg = window.OTOTR_SUPABASE_CONFIG;
const client = createClient(cfg.url, cfg.publishableKey);
const endpoint = cfg.islerApi || `${cfg.url}/functions/v1/isler-api/api`;
let session = null;
let version = 0;
let chain = Promise.resolve();
let saving = false;
let dirty = false;
let lastSnapshot = '';

function currentSnapshot() {
  return JSON.stringify({ data: S.data, prefs: S.prefs, views: S.views, collapsed: S.ui.collapsed });
}

function freshWorkspace(identity, users) {
  const base = seed();
  const project = { ...base.projects[0], id: 'p1', key: 'OTR', name: 'Genel Görevler', desc: 'OTOTR ortak görev alanı', team: '', lead: identity.id, due: '', start: '', fav: true, members: users.map(u => u.id), milestones: [], last: Date.now() };
  const members = users.map(u => ({ id: u.id, name: u.name, email: '', role: u.id === identity.id ? (identity.role === 'yonetici' ? 'Owner' : identity.role === 'izleyici' ? 'Guest' : 'Member') : 'Member', team: '', title: 'OTOTR', c: '#5A67D8', status: 'active', last: 0, tz: 'Europe/Istanbul' }));
  return { ws: { name: 'OTOTR Görevler', url: 'ototr-gorevler', c: '#1D1C1A', brand: true }, workspaces: [{ id: 'w1', name: 'OTOTR Görevler', c: '#1D1C1A', plan: 'Team', brand: true }], me: identity.id, members, projects: [project], teams: [], tasks: [], comments: [], activity: [], notifs: [], files: [], events: [], projOrder: ['p1'], savedViews: [], recentSearches: [], sessions: [], invoices: [], tfa: false, notifPrefs: { email_mention: false, email_assign: false, email_digest: false, email_comment: false, push_mention: true, push_assign: true, push_comment: true, push_due: true, mention_all: true, assign_self: true } };
}

async function request(method, body, resource = 'workspace') {
  const active = await client.auth.getSession();
  session = active.data.session || session;
  if (!session?.access_token) throw new Error('ERP oturumu bulunamadı. ERP’ye yeniden giriş yapın.');
  const target = `${endpoint}/${resource}`;
  const response = await fetch(target, { method, credentials: 'omit', cache: 'no-store', headers: { Authorization: `Bearer ${session.access_token}`, apikey: cfg.publishableKey, 'Content-Type': 'application/json', 'X-Kokpit-Request': '1' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Görev alanı kaydedilemedi.');
  return result;
}

function importLegacyTasks(rows, identity, users) {
  const data = freshWorkspace(identity, users);
  const projectIds = new Map();
  for (const row of rows) {
    const name = String(row.proj || 'Genel Görevler').trim() || 'Genel Görevler';
    if (name === 'Genel Görevler') continue;
    if (!projectIds.has(name)) {
      const id = `legacy-project-${projectIds.size + 1}`;
      projectIds.set(name, id);
      data.projects.push({ ...data.projects[0], id, key: `OTR${projectIds.size}`, name, fav: false, last: Number(row.created || Date.now()) });
      data.projOrder.push(id);
    }
  }
  const validUsers = new Set(users.map(user => user.id));
  const person = value => validUsers.has(value) ? value : null;
  const status = { yapilacak: 'todo', devam: 'progress', bitti: 'done' };
  const priority = { yuksek: 'high', orta: 'medium', dusuk: 'low' };
  const importedIds = new Map(rows.map(row => [row.id, `legacy-${row.id}`]));
  data.tasks = rows.map((row, index) => {
    const project = String(row.proj || 'Genel Görevler').trim() || 'Genel Görevler';
    const id = importedIds.get(row.id);
    const timestamp = Number(row.created || Date.now());
    return {
      id, key: `OTR-${index + 1}`, project: projectIds.get(project) || 'p1', title: String(row.title || 'İsimsiz görev'),
      creator: person(row.creator) || identity.id, desc: sanitizeHtml(row.desc || ''), status: status[row.status] || 'todo', assignee: person(row.who), priority: priority[row.pri] || 'none',
      start: row.start || null, due: row.due || null, labels: Array.isArray(row.tags) ? row.tags.map(String) : [],
      subtasks: (Array.isArray(row.subs) ? row.subs : []).map((sub, i) => ({ id: `legacy-sub-${row.id}-${i + 1}`, title: String(sub.t || ''), done: Boolean(sub.d) })),
      attachments: [], deps: [], estimate: null, created: timestamp, updated: timestamp, order: index + 1, fav: false,
      recur: ({ gunluk: 'Daily', haftalik: 'Weekly', aylik: 'Monthly' })[String(row.rec || '').toLowerCase()] || null,
      helpers: (Array.isArray(row.helpers) ? row.helpers : []).map(person).filter(Boolean), elapsed: Number(row.time || 0),
    };
  });
  data.comments = [];
  data.activity = [];
  for (const row of rows) {
    const taskId = importedIds.get(row.id);
    for (const [index, comment] of (Array.isArray(row.comments) ? row.comments : []).entries()) {
      const [author, ...message] = String(comment.a || '').split(' · ');
      const by = users.find(user => user.name === author)?.id || person(author) || identity.id;
      data.comments.push({ id: `legacy-comment-${row.id}-${index + 1}`, task: taskId, by, at: Number(comment.d || row.created || Date.now()), text: message.join(' · ') || String(comment.m || ''), re: {} });
    }
    for (const [index, entry] of (Array.isArray(row.log) ? row.log : []).entries()) {
      data.activity.push({ id: `legacy-activity-${row.id}-${index + 1}`, by: identity.id, verb: 'Güncelleme', task: taskId, project: data.tasks.find(task => task.id === taskId)?.project || 'p1', at: Number(entry.d || row.created || Date.now()), extra: String(entry.m || '') });
    }
  }
  return data;
}

export async function startWorkspace() {
  if (new URLSearchParams(location.search).has('demo')) return { demo: true };
  session = await requireSession(client);
  if (!session) return { authenticated: false };
  const [workspace, userResult] = await Promise.all([request('GET'), request('GET', undefined, 'users')]);
  const identity = workspace.identity;
  const users = Array.isArray(userResult) ? userResult : [{ id: identity.id, name: identity.name }];
  const hasWorkspace = Number(workspace.version || 0) > 0 && workspace.data?.tasks && workspace.data?.projects && workspace.data?.members;
  let stored = hasWorkspace ? workspace.data : freshWorkspace(identity, users);
  if (!hasWorkspace && Number(workspace.version || 0) === 0) {
    try {
      const legacy = await request('GET', undefined, 'isler');
      if (Array.isArray(legacy) && legacy.length) stored = importLegacyTasks(legacy, identity, users);
    } catch (error) {
      console.warn('Önceki görevler alınamadı; boş görev alanı açılıyor.', error);
    }
  }
  const privatePrefs = stored._task2 || {};
  delete stored._task2;
  S.data = stored;
  S.data.me = identity.id;
  S.data.members = users.map(u => ({ id: u.id, name: u.name, email: '', role: u.id === identity.id ? (identity.role === 'yonetici' ? 'Owner' : identity.role === 'izleyici' ? 'Guest' : 'Member') : 'Member', team: '', title: 'OTOTR', c: '#5A67D8', status: 'active', last: 0, tz: 'Europe/Istanbul' }));
  if (!S.data.projects.some(p => p.id === 'p1')) S.data.projects.unshift(freshWorkspace(identity, users).projects[0]);
  Object.assign(S.prefs, privatePrefs.prefs || {});
  S.prefs.name = identity.name;
  S.prefs.lang = 'Turkish';
  S.views = privatePrefs.views || {};
  S.ui.collapsed = Boolean(privatePrefs.collapsed);
  S.ui.auth = null;
  version = Number(workspace.version || 0);
  lastSnapshot = JSON.stringify({ data: S.data, prefs: S.prefs, views: S.views, collapsed: S.ui.collapsed });
  window.__TASK2_PERSIST__ = persist;
  window.setInterval(refresh, 15000);
  window.addEventListener('focus', () => refresh(true));
  window.addEventListener('online', () => refresh(true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(true); });
  return { authenticated: true, identity };
}

export function markWorkspaceClean() {
  lastSnapshot = currentSnapshot();
}

function persist() {
  if (!session || new URLSearchParams(location.search).has('demo')) return;
  const snapshot = currentSnapshot();
  if (snapshot === lastSnapshot) return;
  dirty = true;
  chain = chain.then(async () => {
    saving = true;
    const values = JSON.parse(snapshot);
    values.data.tasks.forEach(task => { task.desc = sanitizeHtml(task.desc); });
    values.data._task2 = { prefs: values.prefs, views: values.views, collapsed: values.collapsed };
    const result = await request('PUT', { data: values.data, version });
    version = Number(result.version);
    lastSnapshot = snapshot;
    if (currentSnapshot() === snapshot) dirty = false;
    else persist();
  }).catch(error => window.dispatchEvent(new CustomEvent('task2-save-error', { detail: error.message }))).finally(() => { saving = false; });
}

async function refresh(force = false) {
  if (!session || (!force && document.hidden) || saving || dirty) return;
  try {
    const result = await request('GET');
    if (Number(result.version) > version && !dirty) {
      const updated = { ...result.data };
      const privatePrefs = updated._task2 || {};
      delete updated._task2;
      updated.tasks?.forEach(task => { task.desc = sanitizeHtml(task.desc); });
      Object.assign(S.data, updated);
      if (privatePrefs.prefs) Object.assign(S.prefs, privatePrefs.prefs);
      if (privatePrefs.views) S.views = privatePrefs.views;
      if (privatePrefs.collapsed !== undefined) S.ui.collapsed = Boolean(privatePrefs.collapsed);
      version = Number(result.version);
      lastSnapshot = currentSnapshot();
      const { render } = await import('./shell/render.js');
      render();
    }
  } catch (error) { window.dispatchEvent(new CustomEvent('task2-save-error', { detail: error.message })); }
}

export function renderErpLogin() {
  document.documentElement.lang = 'tr';
  document.title = 'OTOTR · Görevler';
  document.querySelector('#app').innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;background:#f5f4f1;padding:24px"><section style="max-width:420px;text-align:center;background:white;border:1px solid #e8e6e1;border-radius:20px;padding:36px"><h1>OTOTR · Görevler</h1><p>Görev alanını kullanmak için ERP hesabınızla giriş yapın.</p><a class="btn btn-primary" href="../../task-merkezi-v2/">ERP’ye giriş</a></section></main>`;
}

export async function leaveWorkspace() {
  await erpSignOut(client);
  location.replace('../../task-merkezi-v2/');
}

const assignmentReceipts = createAssignmentReceiptService({
  rpc: async (name, args) => {
    const { data, error } = await client.rpc(name, args);
    if (error) throw Error(error.message || 'Kabul kaydı alınamadı.');
    return data;
  },
  getVersion: () => version,
  getSnapshot: currentSnapshot,
  isReady: () => !!session && !saving && !dirty && version > 0 && currentSnapshot() === lastSnapshot && !new URLSearchParams(location.search).has('demo'),
  newId: () => crypto.randomUUID(),
});
export const readAssignmentReceipt = id => assignmentReceipts.read(id);
export const acceptAssignment = id => assignmentReceipts.accept(id);

const deliveries = createDeliveryService({
  rpc: async args => {
    const { data, error } = await client.rpc('task2_delivery_action', args);
    if (error) throw Error(error.message || 'Teslim işlemi doğrulanamadı.');
    return data;
  },
  getVersion: () => version,
  getSnapshot: currentSnapshot,
  isReady: () => !!session && !saving && !dirty && version > 0 && currentSnapshot() === lastSnapshot && !new URLSearchParams(location.search).has('demo'),
  sync: () => refresh(true),
  newId: () => crypto.randomUUID(),
});
export const readTaskDelivery = id => deliveries.read(id);
export const advanceTaskDelivery = (id, action, payload) => deliveries.act(id, action, payload);
export const taskDeliveryCurrent = id => deliveries.current(id);

const handoffs = createHandoffService({
  rpc: async args => {
    const { data, error } = await client.rpc('task2_handoff_action', args);
    if (error) throw Error(error.message || 'Devir işlemi doğrulanamadı.');
    return data;
  },
  getVersion: () => version,
  getSnapshot: currentSnapshot,
  isReady: () => !!session && !saving && !dirty && version > 0 && currentSnapshot() === lastSnapshot && !new URLSearchParams(location.search).has('demo'),
  sync: () => refresh(true),
  newId: () => crypto.randomUUID(),
});
export const readTaskHandoff = id => handoffs.read(id);
export const advanceTaskHandoff = (id, action, payload) => handoffs.act(id, action, payload);
export const taskHandoffCurrent = id => handoffs.current(id);
