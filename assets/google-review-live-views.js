(function (root) {
  'use strict';
  const monthFormatter = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'Europe/Istanbul' });

  // Aggregates describe the records actually loaded into the ERP, never a made-up
  // population, trend, target history or AI confidence score.
  function timestamp(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : Date.parse(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  function monthKey(value) {
    const t = timestamp(value);
    if (t === null) return null;
    const parts = monthFormatter.formatToParts(new Date(t));
    return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`;
  }
  function aggregateReviews(rows, options = {}) {
    const now = options.now ?? Date.now();
    const hours = Number(options.slaHours);
    const slaHours = Number.isFinite(hours) && hours > 0 ? hours : null;
    const rated = rows.filter(r => Number.isInteger(Number(r.stars)) && Number(r.stars) >= 1 && Number(r.stars) <= 5);
    const answered = rows.filter(r => r.status === 'gonderildi' || r.isReplied === true);
    const durations = answered.map(r => {
      const start = timestamp(r.createdAt), end = timestamp(r.replyDate);
      return start !== null && end !== null && end >= start && end <= now ? (end - start) / 3600000 : null;
    }).filter(n => n !== null);
    const pending = rows.filter(r => r.status !== 'gonderildi' && r.isReplied !== true);
    const datedPending = pending.filter(r => { const t = timestamp(r.createdAt); return t !== null && t <= now; });
    const overdue = slaHours === null ? null : datedPending.filter(r => now - timestamp(r.createdAt) > slaHours * 3600000).length;
    const currentMonth = monthKey(now);
    const monthCount = rows.filter(r => {
      const t = timestamp(r.createdAt); if (t === null || t > now) return false;
      return monthKey(t) === currentMonth;
    }).length;
    return {
      count: rows.length, answered: answered.length, pending: pending.length,
      average: rated.length ? rated.reduce((s, r) => s + Number(r.stars), 0) / rated.length : null,
      responseRate: rows.length ? 100 * answered.length / rows.length : null,
      lowRating: rated.filter(r => Number(r.stars) <= 2).length,
      criticalPending: pending.filter(r => Number(r.stars) >= 1 && Number(r.stars) <= 2).length,
      ratingCounts: [5, 4, 3, 2, 1].map(star => rated.filter(r => Number(r.stars) === star).length),
      durationBuckets: [durations.filter(h => h < 2).length, durations.filter(h => h >= 2 && h < 6).length, durations.filter(h => h >= 6 && h < 24).length, durations.filter(h => h >= 24 && h < 48).length, durations.filter(h => h >= 48).length],
      slaHours, timedAnswers: durations.length, datedPending: datedPending.length,
      slaRate: slaHours !== null && durations.length ? 100 * durations.filter(h => h <= slaHours).length / durations.length : null,
      overdue, monthCount, undatedCount: rows.filter(r => timestamp(r.createdAt) === null).length,
    };
  }
  function monthlySeries(rows, now = Date.now(), count = 12) {
    const [year, month] = monthKey(now).split('-').map(Number);
    const months = Array.from({ length: count }, (_, i) => new Date(Date.UTC(year, month - count + i, 1, 12)));
    const totals = new Map();
    rows.forEach(r => { const t = timestamp(r.createdAt); if (t !== null && t <= now) { const key = monthKey(t); totals.set(key, (totals.get(key) || 0) + 1); } });
    return months.map(month => ({
      key: month.toISOString().slice(0, 7),
      label: month.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      count: totals.get(month.toISOString().slice(0, 7)) || 0,
    }));
  }
  function commentTrendSeries(values) {
    const numbers = values.map(value => Number(value) || 0);
    if (!numbers.length) return [];
    const n = numbers.length;
    const meanX = (n - 1) / 2;
    const meanY = numbers.reduce((sum, value) => sum + value, 0) / n;
    const denominator = numbers.reduce((sum, _, index) => sum + (index - meanX) ** 2, 0);
    const slope = denominator ? numbers.reduce((sum, value, index) => sum + (index - meanX) * (value - meanY), 0) / denominator : 0;
    const intercept = meanY - slope * meanX;
    return numbers.map((_, index) => Math.max(0, Number((intercept + slope * index).toFixed(2))));
  }
  const scopeAliases = { live: 'branch-google-nilufer', gebze: 'branch-google-gebze', inegol: 'branch-google-inegol' };
  function branchIdForScope(value) { return scopeAliases[value] || value; }
  function branchIndexForId(id) { return id === 'branch-google-gebze' ? 1 : id === 'branch-google-inegol' ? 2 : id === 'branch-google-nilufer' ? 0 : -1; }
  function scopeRows(rows, scope, branches) {
    const branchId = branchIdForScope(scope), index = branchIndexForId(branchId);
    const branch = (branches || []).find(item => item.id === branchId || item.erpBranchId === branchId) || (index >= 0 ? branches?.[index] : null);
    if (!branch) return [];
    const name = `${branch.city || ''} ${branch.name || ''}`.trim();
    const custom = index < 0;
    return rows.filter(r => {
      const sameBranch = r.branchId === branchId || r.branch_id === branchId || r.store === name || (!custom && Number(r.branchIdx) === index);
      return sameBranch && (branch.demo || scope === 'gebze' || scope === 'inegol' ? r.demo === true : r.demo === false && (!!r.erpReviewId || custom));
    });
  }
  function scopeRecords(rows, scope) {
    const branchId = branchIdForScope(scope), index = branchIndexForId(branchId), custom = index < 0;
    return rows.filter(r => (r.branch_id === branchId || (!custom && Number(r.branchIdx) === index)) && (branchId === 'branch-google-nilufer' || custom ? !!r.erpItemId : !r.erpItemId));
  }
  function registryName(row, known={}) {
    const original=String(row.name||known.name||row.id).trim(), city=String(row.city||known.city||'').trim();
    const raw=String(row.id).startsWith('branch-custom-')?original:original.replace(/^OTOTR(?: Oto Ekspertiz)?\s+/i,'').replace(/\s+Şube(?:si)?$/i,'').trim();
    return String(row.id).startsWith('branch-custom-')?raw:raw.startsWith(city+' ')?raw.slice(city.length+1):raw;
  }
  const pure = { timestamp, monthKey, aggregateReviews, monthlySeries, commentTrendSeries, scopeRows, scopeRecords, registryName };
  if (typeof module === 'object' && module.exports) module.exports = pure;
  if (!root || !root.document) return;

  const document = root.document;
  let scope = 'live';
  let branchRegistry = [];
  const registryBranch = id => branchRegistry.find(branch => branch.id === id) || null;
  const branchObject = id => {
    if (typeof BRANCHES !== 'undefined' && Array.isArray(BRANCHES)) {
      const mapped = BRANCHES.find(branch => branch.id === id || branch.erpBranchId === id);
      if (mapped) return mapped;
    }
    const fromRegistry = registryBranch(id);
    if (fromRegistry) return fromRegistry;
    return null;
  };
  const currentBranch = () => branchObject(branchIdForScope(scope)) || (typeof BRANCHES !== 'undefined' ? BRANCHES[0] : null);
  const branchIsLive = branch => Boolean(branch && (branch.id === 'branch-google-nilufer' || branch.live === true || ['active', 'live'].includes(branch.lifecycle) || branch.mode === 'live'));
  const label = () => { const branch = currentBranch(); if (!branch) return 'Şube kapsamı'; return `${branch.city || ''} ${branch.name || ''} · ${branchIsLive(branch) ? 'canlı' : branch.lifecycle === 'onboarding' ? 'onboarding' : 'demo'}`.trim(); };
  const live = () => branchIsLive(currentBranch()) && !['branch-google-gebze', 'branch-google-inegol'].includes(branchIdForScope(scope));
  const management = () => root.OTOTRReviewManagement?.state || {};
  const policy = () => management().policy || {};
  let parentApi = null, ai = null;
  try {
    if (root.parent !== root && root.parent.location.origin === root.location.origin) {
      parentApi = root.parent.OTOTRGoogleReputation;
      ai = root.parent.OTOTRGoogleReviewAI;
    }
  } catch (_) { /* A standalone preview has no ERP session. */ }
  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plain = value => { const node = document.createElement('textarea'); node.innerHTML = String(value ?? ''); return node.value; };
  const mapped = value => esc(plain(value));
  const set = (id, html) => { const element = byId(id); if (element) element.innerHTML = html; };
  const empty = message => `<div class="empty"><p>${esc(message)}</p></div>`;
  const readEmpty = message => management().error ? 'Canlı yönetim kayıtları alınamadı. Bağlantıyı yenileyin.' : management().loading ? 'Canlı yönetim kayıtları yükleniyor…' : !management().loaded ? 'Canlı yönetim bağlantısı henüz doğrulanmadı.' : message;
  const tableEmpty = (cols, message) => `<tr><td colspan="${cols}">${empty(message)}</td></tr>`;
  const percent = value => value === null || !Number.isFinite(value) ? '—' : `${Math.round(value)}%`;
  const number = value => value === null || !Number.isFinite(value) ? '—' : value.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  const dateText = value => { const t = timestamp(value); return t === null ? 'Tarih sağlanmadı' : new Date(t).toLocaleString('tr-TR'); };
  const metric = (title, value, note = '', kind = 'metric') => kind === 'kpi'
    ? `<div class="kpi"><div class="kl">${esc(title)}</div><div class="kv">${esc(value)}</div><div class="kd">${esc(note)}</div></div>`
    : `<div class="metric"><div class="ml">${esc(title)}</div><div class="mv">${esc(value)}</div><div class="md">${esc(note)}</div></div>`;
  const records = name => {
    const collections = { legalCases: LEGAL_CASES, complaints: COMPLAINTS, approvals: APPROVALS };
    return scopeRecords(collections[name] || [], scope);
  };
  const rows = () => scopeRows(REVIEWS, scope, BRANCHES);
  const stats = () => aggregateReviews(rows(), { slaHours: live() ? (Number(policy().default_sla_hours) || Number(currentBranch()?.slaH) || 24) : Number(currentBranch()?.slaH) });
  function normalizeRegistryBranch(row) {
    if (!row?.id) return null;
    const known = (typeof BRANCHES !== 'undefined' && Array.isArray(BRANCHES)) ? BRANCHES.find(branch => branch.id === row.id || branch.erpBranchId === row.id) : null;
    const city = String(row.city || known?.city || '').trim();
    const branchName = registryName(row,known||{});
    const branch = { ...(known || {}), ...row, id: row.id, name: branchName, city, region: row.region || known?.region || 'Diğer' };
    const lifecycle = row.lifecycle || row.mode || known?.lifecycle || (row.id === 'branch-google-nilufer' ? 'live' : 'demo');
    branch.lifecycle = lifecycle;
    branch.mode = row.mode || lifecycle;
    branch.live = row.id === 'branch-google-nilufer' || lifecycle === 'live' || lifecycle === 'active';
    branch.demo = !branch.live;
    branch.target = Number(row.target ?? known?.target ?? 0) || 0;
    branch.slaH = Number(row.sla_hours ?? known?.slaH ?? 24) || 24;
    branch.gbp = row.location_id || row.googleBusinessLocationId || known?.gbp || '';
    branch.lastSync = row.last_sync_at || row.lastSyncedAt || known?.lastSync || '';
    branch.googleBusinessGroupId = row.account_id || row.googleBusinessGroupId || known?.googleBusinessGroupId || '';
    branch.storeCode = row.store_code || row.storeCode || known?.storeCode || '';
    branch.googleBusinessLocationId = row.location_id || row.googleBusinessLocationId || known?.googleBusinessLocationId || '';
    branch.custom = String(row.id).startsWith('branch-custom-');
    return branch;
  }
  function setBranchRegistry(items) {
    if (!Array.isArray(items)) return [];
    branchRegistry = items.map(normalizeRegistryBranch).filter(Boolean);
    if (typeof BRANCHES !== 'undefined' && Array.isArray(BRANCHES)) {
      for (const incoming of branchRegistry) {
        const index = branchIndexForId(incoming.id);
        const existing = BRANCHES.find(branch => branch.id === incoming.id) || (index >= 0 ? BRANCHES[index] : null);
        if (existing) Object.assign(existing, incoming, { id: existing.id, erpBranchId: incoming.id });
        else BRANCHES.push(incoming);
      }
    }
    root.dispatchEvent?.(new CustomEvent('ototr-branch-registry-ready'));
    if (byId('erpGlobalScope')) scopeNotice();
    return branchRegistry;
  }
  const currentTarget = () => {
    const month = `${monthKey(Date.now())}-01`;
    return (management().targets || []).find(t => t.branch_id === branchIdForScope(scope) && t.month === month);
  };
  function livePolicyEditor() {
    const available = management().loaded && !management().error;
    return `<div class="frow"><label for="erpLiveSla">${esc(currentBranch()?.name || 'Şube')} yanıt SLA (saat)</label><div class="pacts"><input id="erpLiveSla" type="number" min="1" max="168" step="1" value="${Number(policy().default_sla_hours) || Number(currentBranch()?.slaH) || ''}" ${available ? '' : 'disabled'} style="width:100px"><button class="btn sm p" id="erpSaveLiveSla" ${available ? '' : 'disabled'}>SLA kaydet</button></div><small>Mevcut ERP politikasına kaydedilir; 1–168 saat.</small></div>`;
  }
  function wirePolicyEditor() {
    const button = byId('erpSaveLiveSla');
    if (button) button.onclick = async () => {
      button.disabled = true;
      try { await root.OTOTRReviewManagement.savePolicy(byId('erpLiveSla').value); root.toast(`${currentBranch()?.name || 'Şube'} SLA ayarı kaydedildi.`, 'ok'); }
      catch (error) { root.toast(error.message || 'Ayar kaydedilemedi.', 'warn'); }
      finally { if (button.isConnected) button.disabled = false; }
    };
  }
  const snapshot = new Map();
  function preserve(id) { if (!snapshot.has(id) && byId(id)) snapshot.set(id, byId(id).innerHTML); }
  function restore(id) { if (snapshot.has(id) && byId(id)) byId(id).innerHTML = snapshot.get(id); }
  function unsupported(id, message) { preserve(id); set(id, empty(message)); }
  function disable(selector, message = 'Bu işlem canlı ERP servisi tarafından desteklenmiyor.') {
    document.querySelectorAll(selector).forEach(node => { if (!node.disabled) { node.disabled = true; node.dataset.liveUnavailable = '1'; node.title = message; } });
  }
  function restoreControls() {
    document.querySelectorAll('[data-live-unavailable]').forEach(node => { node.disabled = false; node.removeAttribute('data-live-unavailable'); node.removeAttribute('title'); });
    snapshot.forEach((_, id) => restore(id));
  }
  function scopeCall(fn, args) {
    const saved = { LEGAL_CASES, COMPLAINTS, APPROVALS, DELEGATIONS, AUDIT_LOG };
    LEGAL_CASES = records('legalCases'); COMPLAINTS = records('complaints'); APPROVALS = records('approvals');
    DELEGATIONS = live() ? [] : DELEGATIONS;
    if (live()) AUDIT_LOG = [];
    try { return fn.apply(root, args); }
    finally { LEGAL_CASES = saved.LEGAL_CASES; COMPLAINTS = saved.COMPLAINTS; APPROVALS = saved.APPROVALS; DELEGATIONS = saved.DELEGATIONS; AUDIT_LOG = saved.AUDIT_LOG; }
  }
  function wrap(name, after, useOriginal = true) {
    const original = root[name];
    if (typeof original !== 'function') return;
    root[name] = function (...args) {
      const result = (!live() || useOriginal) ? scopeCall(original, args) : undefined;
      if (live()) after(...args);
      return result;
    };
  }

  const originalBranches = root.filteredBranches;
  root.filteredBranches = function () { const chosen = currentBranch(); return chosen ? originalBranches().filter(b => b === chosen || b.id === chosen.id) : originalBranches(); };
  const originalRoleReviews = root.roleReviews;
  root.roleReviews = function () { const allowed = new Set(rows().map(r => r.id)); return originalRoleReviews().filter(r => allowed.has(r.id)); };

  function scopeNotice() {
    let select = byId('erpGlobalScope');
    if (!select) {
      const host = byId('erpGoogleSync')?.parentElement || document.querySelector('main');
      const group = document.createElement('label'); group.className = 'pacts'; group.style.marginBottom = '8px';
      const caption = document.createElement('span'); caption.className = 'chip'; caption.textContent = 'Veri kapsamı';
      select = document.createElement('select'); select.id = 'erpGlobalScope'; select.setAttribute('aria-label', 'Tüm menüler için şube ve veri kapsamı');
      select.className = 'btn sm';
      group.append(caption, select); host?.prepend(group);
      select.addEventListener('change', () => setScope(select.value));
    }
    const options = [{ value: 'live', branch: branchObject('branch-google-nilufer') }, { value: 'gebze', branch: branchObject('branch-google-gebze') }, { value: 'inegol', branch: branchObject('branch-google-inegol') }, ...branchRegistry.filter(branch => !['branch-google-nilufer', 'branch-google-gebze', 'branch-google-inegol'].includes(branch.id)).map(branch => ({ value: branch.id, branch }))].filter(item => item.branch);
    select.innerHTML = '';
    options.forEach(({ value, branch }) => { const option = document.createElement('option'); option.value = value; option.textContent = `${branch.city || ''} ${branch.name || ''} · ${branchIsLive(branch) ? 'Canlı' : branch.lifecycle === 'onboarding' ? 'Onboarding' : 'Demo'}`.trim(); select.append(option); });
    select.value = scope;
    const note = byId('erpDataScope');
    if (note) { note.className = `chip ${live() && !management().error ? 'info' : 'warn'}`; note.textContent = live() ? `${label()} ERP yorumları. Hesaplamalar alınan kayıtlarla sınırlıdır. ${management().loaded && !management().error ? 'Yönetim kayıtları alındı; eksik ölçümler “—”.' : readEmpty('')}` : `${label()} · Örnek/onboarding veriler; canlı Google hesabına işlem gönderilmez.`; }
    const localFilter = byId('erpBranchFilter');
    if (localFilter) {
      const selectedBranch = currentBranch();
      if (selectedBranch && !Array.from(localFilter.options).some(option => option.value === selectedBranch.id)) {
        const option = document.createElement('option'); option.value = selectedBranch.id; option.textContent = `${selectedBranch.city || ''} ${selectedBranch.name || ''} · ${branchIsLive(selectedBranch) ? 'Canlı' : 'Demo'}`.trim(); localFilter.append(option);
      }
      localFilter.value = scope === 'live' ? 'live' : scope === 'gebze' ? 'Kocaeli Gebze' : scope === 'inegol' ? 'Bursa İnegöl' : currentBranch()?.id || scope;
      if (!localFilter.dataset.globalScopeBound) {
        localFilter.dataset.globalScopeBound = '1';
        Array.from(localFilter.options).filter(option => option.value === 'all').forEach(option => option.remove());
        localFilter.addEventListener('change', () => setScope(localFilter.value === 'Kocaeli Gebze' ? 'gebze' : localFilter.value === 'Bursa İnegöl' ? 'inegol' : localFilter.value === 'live' ? 'live' : localFilter.value));
      }
    }
  }
  function setScope(value) {
    if (!['live', 'gebze', 'inegol'].includes(value) && !branchRegistry.some(branch => branch.id === value)) value = 'live';
    if (root.OTOTRReviewBridge?.isEditing?.()) { root.toast?.('Önce açık taslağı kaydedin.', 'warn'); scopeNotice(); return; }
    scope = value; restoreControls();
    FILTER_REGION = ''; FILTER_CITY = '';
    if (typeof SEL !== 'undefined') SEL = null;
    if (typeof SELECTED !== 'undefined') SELECTED.clear();
    if (STATE.view === 'store') STATE.currentStore = currentBranch()?.id;
    if (scope !== 'live') root.OTOTRReviewManagement?.refresh?.().catch?.(() => {});
    ai?.refreshWorkflow?.().catch?.(() => {});
    scopeNotice(); rerender();
  }
  function rerender() { root.switchView(STATE.view || 'overview'); }
  const originalSwitch = root.switchView;
  root.switchView = function (...args) { const result = originalSwitch.apply(root, args); scopeNotice(); root.renderNotifications(); return result; };

  wrap('renderReviews', () => {
    const selected = rows().find(r => r.id === SEL);
    document.querySelectorAll('#rvDetail .chip').forEach(chip => {
      if (/^Risk \d+/.test(chip.textContent) && selected) { chip.textContent = `Puan ${selected.stars}/5 · kural tabanlı`; chip.title = 'Yıldız puanına göre öncelik; AI risk ölçümü değildir.'; }
    });
    const critical = byId('rvFilter')?.querySelector('option[value="kritik"]');
    if (critical) critical.textContent = '1–2 yıldız';
    const riskSort = byId('rvSort')?.querySelector('option[value="risk"]');
    if (riskSort) riskSort.textContent = 'Düşük puan önceliği';
  });
  const originalHistory = root.renderHistory;
  root.renderHistory = function (review) {
    if (review.demo) return originalHistory(review);
    const itemIds = new Set((ai?.getWorkflowItems?.() || []).filter(item => item.branch_id === branchIdForScope(scope) && item.review_id === review.googleReviewId).map(item => item.id));
    const entries = (management().audit || []).filter(entry => itemIds.has(entry.entity_id));
    return entries.map(entry => `<div style="padding:10px 0;border-bottom:1px solid var(--l2)"><b style="font-size:12.5px">${esc(entry.action)}${entry.detail ? ` · ${esc(entry.detail)}` : ''}</b><div style="font-size:11px;color:var(--mute)">${esc(entry.actor_role || 'ERP')} · ${esc(dateText(entry.created_at))}</div></div>`).join('') || empty(readEmpty('Alınan işlem kayıtlarında bu yoruma bağlı kayıt bulunmuyor.'));
  };

  wrap('renderNotifications', () => {
    const list = management().notifications || [];
    const count = byId('notifCount');
    if (count) { count.style.display = 'none'; count.textContent = '0'; }
    set('notifList', `<div class="notif-item"><div class="n-body"><b>Genel merkez / Google bağlantısı kayıtları</b><p>Bunlar gönderim kayıtlarıdır; okunmamış mesaj sayısı sağlanmıyor.</p></div></div>` + (list.map(n => `<div class="notif-item"><div class="n-icon info">•</div><div class="n-body"><b>${esc(n.template_key)}</b><p>${esc(n.status)}</p><span class="n-time">${esc(dateText(n.sent_at || n.created_at))}</span></div></div>`).join('') || empty(readEmpty('Bildirim gönderim kaydı bulunmuyor.'))));
    disable('#notifPanel [onclick="markAllRead()"]', 'Gönderim kayıtları için okundu işareti sağlanmıyor.');
  }, false);

  function overview() {
    const a = stats();
    set('ovAlerts', `<div class="alert ${live() && parentApi ? 'info' : 'warn'}">${live() ? (parentApi ? 'Google kayıtları ve ERP iş kuyruğu gösterilir. Demo şubeler hesaplamaya dahil edilmez.' : 'Canlı kayıtlar için bu sayfayı ERP oturumu içinden açın.') : `${label()} · Bu şubenin örnek kayıtları gösterilir; canlı istatistiklere dahil edilmez.`}</div>`);
    set('ovKpis', [metric('Alınan yorum', a.count, 'ERP’ye yüklenen kayıt', 'kpi'), metric('Ort. puan', number(a.average), 'Alınan yorumlar', 'kpi'), metric('Yanıt oranı', percent(a.responseRate), 'Google’da yanıtı bulunan', 'kpi'), metric('SLA', percent(a.slaRate), a.slaHours ? `${a.slaHours} saat · ${a.timedAnswers} tarihli yanıt` : 'ERP SLA ayarı bekleniyor', 'kpi'), metric('Yanıtsız', a.pending, 'Google yanıtı olmayan', 'kpi'), metric('SLA aşımı', a.overdue ?? '—', `${a.datedPending} tarihli yanıtsız kayıt`, 'kpi')].join(''));
    set('ovWatchlist', rows().filter(r => r.stars <= 2 && r.status !== 'gonderildi').slice(0, 5).map(r => `<div class="watch-row"><div class="info"><b>${mapped(r.author)}</b><small>${r.stars} yıldız · ${esc(dateText(r.createdAt))}</small></div><button class="btn sm ghost" onclick="openReviewFromStore(${Number(r.id)})">Detay →</button></div>`).join('') || empty('Alınan kayıtlarda yanıtsız 1–2 yıldız yorum yok.'));
    set('ovSla', `<div class="watch-row"><div class="info"><b>${label()}</b><small>${a.slaHours ? `${a.slaHours} saat · yanıt tarihi bilinen kayıtlar` : 'SLA politikası alınamadı'}</small></div><span class="chip">${percent(a.slaRate)}</span></div>`);
  }
  root.renderOverview = overview;

  function chart(id, type, labels, datasets) {
    if (typeof charts === 'undefined' || typeof Chart === 'undefined' || !byId(id)) return;
    root.destroyChart(id);
    charts[id] = new Chart(byId(id), { type, data: { labels, datasets }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: datasets.length > 1 } }, scales: type === 'doughnut' ? {} : { y: { beginAtZero: true }, x: { grid: { display: false } } } } });
  }
  function realCharts(store = false) {
    const a = stats(), series = monthlySeries(rows()), target = currentTarget(), targetValue = Number(target?.monthly_target ?? target?.target ?? currentBranch()?.target ?? 0);
    const counts = series.map(m => m.count);
    const trendDatasets = [
      { label: 'Alınan yorumlar', data: counts, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.1)', fill: true, tension: .3 },
      { label: 'Yorum trendi', data: commentTrendSeries(counts), borderColor: '#7c3aed', backgroundColor: 'transparent', borderDash: [5, 4], pointRadius: 0, fill: false, tension: 0, order: 1 },
    ];
    if (live() && Number.isFinite(targetValue) && targetValue > 0) trendDatasets.push({ label: `${currentBranch()?.name || 'Şube'} · hedef`, data: series.map(() => targetValue), borderColor: '#e11d48', borderDash: [8, 5], pointRadius: 2, fill: false, tension: 0 });
    chart(store ? 'storeTrendChart' : 'chartTrend', 'line', series.map(m => m.label), trendDatasets);
    chart(store ? 'storeRatingChart' : 'chartRating', 'bar', ['5★', '4★', '3★', '2★', '1★'], [{ label: 'Alınan yorumlar', data: a.ratingCounts, backgroundColor: ['#12805c', '#6bbf9b', '#fbbf24', '#fb923c', '#b42318'] }]);
    if (!store) {
      chart('chartRegion', 'bar', [label()], [{ label: 'Alınan yorumlar', data: [a.count], backgroundColor: '#2563eb' }]);
      chart('chartResponse', 'bar', ['<2 sa', '2–6 sa', '6–24 sa', '24–48 sa', '48+ sa'], [{ label: 'Yanıt tarihi bilinen kayıtlar', data: a.durationBuckets, backgroundColor: '#12805c' }]);
    }
  }
  root.initCharts = () => realCharts(false);

  wrap('renderPerformance', () => {
    const a = stats(), b = currentBranch() || BRANCHES[0];
    const target = currentTarget();
    const rawTarget = target?.monthly_target ?? target?.target ?? null;
    const targetValue = Number.isFinite(Number(rawTarget)) && rawTarget !== null ? Number(rawTarget) : null;
    const progress = targetValue && targetValue > 0
      ? Math.min(100, Math.max(0, a.monthCount / targetValue * 100))
      : null;
    const progressText = progress === null ? '—' : `${Math.round(progress)}%`;
    const progressBar = progress === null
      ? '<span style="color:var(--mute)">Hedef girilmedi</span>'
      : `<div style="display:flex;align-items:center;gap:7px;min-width:150px"><div style="height:8px;flex:1;background:var(--l2);border-radius:999px;overflow:hidden" role="progressbar" aria-label="${esc(b.name || 'Şube')} hedef ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress)}"><div style="height:100%;width:${progress}%;background:${progress >= 100 ? 'var(--ok)' : progress >= 50 ? 'var(--warn)' : 'var(--bad)'};border-radius:999px"></div></div><b style="font-size:11px;min-width:32px;text-align:right">${progressText}</b></div>`;
    const branchLabel = `${b.city || ''} ${b.name || ''}`.trim();
    const statusLabel = branchIsLive(b) ? 'Canlı' : b.lifecycle === 'onboarding' ? 'Onboarding' : 'Demo';
    set('perfTable', `<thead><tr><th>Birim</th><th class="n">Aylık hedef</th><th class="n">Bu ay alınan</th><th style="min-width:190px">İlerleme</th><th class="n">Puan</th><th class="n">Yanıt</th><th class="n">SLA</th><th class="n">1–2 yıldız</th><th>Durum</th></tr></thead><tbody><tr><td><a href="#" onclick="openStore('${esc(b.id)}');return false">${esc(branchLabel || 'Şube')}</a></td><td class="n"><input aria-label="${esc(branchLabel)} aylık hedef" type="number" min="1" max="10000" value="${targetValue === null ? '' : targetValue}" placeholder="—" style="width:85px" onchange="setTarget('${esc(b.id)}',this.value)" ${live() && management().loaded && !management().error && !management().targetError ? '' : 'disabled'}></td><td class="n">${a.monthCount}</td><td>${progressBar}</td><td class="n">${number(a.average)}</td><td class="n">${percent(a.responseRate)}</td><td class="n">${percent(a.slaRate)}</td><td class="n">${a.lowRating}</td><td><span class="chip ${branchIsLive(b) ? 'ok' : 'warn'}">${statusLabel}</span></td></tr><tr><td colspan="9" style="color:var(--mute)">İlerleme bu ay alınan ${esc(branchLabel || 'şube')} yorumlarının kayıtlı aylık hedefe oranıdır. Puan ve oranlar alınan kayıtları kapsar.</td></tr></tbody>`);
    if (typeof root.renderTargetBreakdown === 'function') root.renderTargetBreakdown();
  }, false);

  wrap('renderRisk', () => {
    const critical = rows().filter(r => r.stars <= 2 && r.status !== 'gonderildi');
    const legal = records('legalCases').filter(r => r.status !== 'closed');
    const a = stats();
    set('riskMetrics', metric('Yanıtsız 1–2 yıldız', critical.length, 'Puan kuralı; AI risk skoru değildir') + metric('Hukuki görev', legal.length, 'ERP iş kuyruğu') + metric('SLA aşımı', a.overdue ?? '—', a.slaHours ? `${a.slaHours} saat` : 'SLA ayarı alınamadı'));
    if (byId('riskCritical')) byId('riskCritical').textContent = `${critical.length} yorum`;
    if (byId('riskLegal')) byId('riskLegal').textContent = `${legal.length} görev`;
    set('riskCriticalList', critical.map(r => `<div class="risk-card" style="margin-bottom:10px"><div class="rc-head"><b>${mapped(r.author)}</b><span class="chip bad">${r.stars}★</span></div><div class="rc-body">${mapped(r.text)}</div><div class="rc-foot"><span>${esc(dateText(r.createdAt))}</span><button class="btn sm" onclick="openReviewFromStore(${Number(r.id)})">İncele</button></div></div>`).join('') || empty('Alınan kayıtlarda yanıtsız 1–2 yıldız yorum yok.'));
    set('riskLegalList', legal.map(c => `<div class="risk-card"><div class="rc-head"><b>${mapped(c.customer)}</b><span class="chip purple">Hukuk</span></div><div class="rc-body">${mapped(c.review)}</div><div class="rc-foot"><button class="btn sm" onclick="openCase('${esc(c.id)}')">Görevi aç</button></div></div>`).join('') || empty('Açık hukuki görev bulunmuyor.'));
    set('riskSuspicious', empty('Şüpheli yorum tespiti için doğrulanmış veri bulunmuyor. Düşük puan tek başına rakip veya sahte yorum kanıtı değildir.'));
  }, false);

  wrap('renderLegal', () => {
    const list = records('legalCases');
    set('legalMetrics', metric('Açık görev', list.filter(c => c.status !== 'closed').length, 'ERP hukuk kuyruğu') + metric('Yayın engeli', list.filter(c => c.hold).length, 'Kayıtlı hold durumu') + metric('Tamamlanan', list.filter(c => c.status === 'closed').length, 'ERP kaydı') + metric('Ort. çözüm', '—', 'Çözüm süresi ölçümü sağlanmıyor'));
    document.querySelectorAll('#legalTable tbody tr').forEach((tr, index) => { const c = list[index]; if (tr.cells.length >= 7) tr.cells[6].textContent = '—'; });
    const legalIds = new Set(list.map(c => c.erpItemId));
    const audit = (management().audit || []).filter(a => a.entity_type === 'review_work_item' && legalIds.has(a.entity_id));
    set('accessLogTable', `<caption style="text-align:left;padding:8px">Genel merkez / Google bağlantısı işlem kayıtları; görüntüleme erişimi ölçümü değildir.</caption><thead><tr><th>Tarih</th><th>Rol</th><th>İşlem</th><th>Kaynak</th><th>IP</th><th>Açıklama</th></tr></thead><tbody>${audit.map(a => `<tr><td>${esc(dateText(a.created_at))}</td><td>${esc(a.actor_role || '—')}</td><td>${esc(a.action)}</td><td>${esc(a.entity_type)}</td><td>Sağlanmıyor</td><td>${esc(a.detail || '')}</td></tr>`).join('') || tableEmpty(6, 'Bu görünüm için kaydedilmiş işlem bulunmuyor. Görüntüleme erişimi ayrıca ölçülmüyor.')}</tbody>`);
    unsupported('legal-kvkk', 'Canlı veri saklama ve otomatik silme politikası bu servisten sağlanmıyor. Burada varsayılan süre veya aktif silme beyanı yapılmaz.');
    disable('#view-legal [onclick="openNewCase()"]', 'Canlı hukuk görevi ilgili yorum üzerinden oluşturulur.');
  });

  wrap('renderComplaint', () => {
    const list = records('complaints');
    set('compMetrics', metric('Açık görev', list.filter(c => c.status !== 'resolved').length, 'ERP şikayet kuyruğu') + metric('SLA', '—', 'Görev SLA verisi sağlanmıyor') + metric('Tamamlanan', list.filter(c => c.status === 'resolved').length, 'ERP kaydı') + metric('Tekrarlayan kişi', '—', 'Kimlik eşleştirmesi sağlanmıyor'));
    document.querySelectorAll('#compTable tbody tr').forEach(tr => { if (tr.cells.length >= 6) tr.cells[5].textContent = '—'; });
    const categories = new Map(); list.forEach(c => categories.set(plain(c.category), (categories.get(plain(c.category)) || 0) + 1));
    set('reasonBody', Array.from(categories, ([category, count]) => `<tr><td>${esc(category)}</td><td>${count} kayıt</td><td>—</td><td>—</td><td>Geçmiş karşılaştırma yok</td></tr>`).join('') || tableEmpty(5, 'Şikayet kategorisi bulunmuyor.'));
    // A public display name is not a customer identifier; no deduplication claim.
    set('repeatBody', tableEmpty(4, 'Doğrulanmış müşteri kimliği bulunmadığından tekrarlayan kişi sayısı hesaplanmaz.'));
    set('compensationBody', tableEmpty(5, 'Bu servise bağlı bir tazminat veya ödeme kaydı bulunmuyor.'));
  });

  wrap('renderApproval', () => {
    const list = records('approvals');
    set('appMetrics', metric('Bekleyen yanıt görevi', list.length, 'ERP yayın kuyruğu') + metric('Delegasyon', '—', 'Sunucu desteği yok') + metric('Bugün onaylanan', '—', 'Onay metriği sağlanmıyor') + metric('Ort. süre', '—', 'Ölçüm sağlanmıyor'));
    document.querySelectorAll('#approvalQueue span').forEach(span => { if (/^Seviye \d/.test(span.textContent)) span.parentElement.innerHTML = '<span style="font-size:11px;color:var(--mute)">Yetkili insan onayı gerekiyor.</span>'; });
    preserve('approval-matrix');
    set('approval-matrix', `<div class="card"><div class="head"><h3>Canlı onay politikası</h3></div><p>${policy().auto_reply_enabled ? 'Doğrulanmış risksiz 4–5 yıldızlı yanıtlar otomatik yayımlanabilir. Diğer yanıtlar insan onayı bekler.' : 'Canlı Google yanıtları yetkili insan onayı bekler.'}</p><p>Yetkili roller: ${esc((policy().approver_roles || []).join(', ') || 'ERP ayarı bekleniyor')}</p><p>SLA: ${policy().default_sla_hours ? `${Number(policy().default_sla_hours)} saat` : 'ERP ayarı bekleniyor'}</p></div>`);
    set('delegBody', tableEmpty(6, 'Canlı delegasyon servisi bulunmuyor.'));
    disable('#approval-delegation button');
  });

  wrap('renderCompare', () => {
    const a = stats();
    ['cmp1', 'cmp2', 'cmp3'].forEach((id, i) => { if (byId(id)) { byId(id).innerHTML = i === 0 ? '<option value="0">Bursa Nilüfer · Canlı</option>' : '<option value="">Başka canlı şube yok</option>'; byId(id).disabled = true; byId(id).dataset.liveUnavailable = '1'; } });
    set('cmpGrid', `<div class="cmp-card"><div class="cc-name">Bursa Nilüfer · Canlı</div>${[['Puan', number(a.average)], ['Yanıt', percent(a.responseRate)], ['SLA', percent(a.slaRate)], ['Alınan kayıt', a.count]].map(([key, value]) => `<div class="cc-metric"><span class="cc-l">${key}</span><span class="cc-v">${value}</span></div>`).join('')}<p style="color:var(--mute)">Gebze ve İnegöl demo verisi canlı kıyaslamaya dahil edilmez.</p></div>`);
    set('leagueBody', `<tr><td>—</td><td>Bursa Nilüfer</td><td>Marmara</td><td>${number(a.average)}</td><td>${percent(a.responseRate)}</td><td>${percent(a.slaRate)}</td><td>${a.monthCount} bu ay alınan</td></tr>`);
  }, false);

  wrap('renderAI', () => {
    ['aiPersona', 'aiBanned', 'aiLock'].forEach(id => { const field = byId(id); if (field) { field.value = ''; field.placeholder = 'Canlı sistem ayarı sunucuda korunuyor; bu servisten sağlanmıyor.'; } });
    ['tgAutoReply', 'tgDraftLow', 'tgLegalFreeze', 'tgSentiment', 'tgMultiDraft', 'tgLearn'].forEach(id => { if (byId(id)) byId(id).checked = false; });
    if (byId('tgAutoReply')) byId('tgAutoReply').checked = policy().auto_reply_enabled === true;
    set('aiqMetrics', ['Kabul', 'Düzenleme', 'Ret', 'Maliyet'].map(title => metric(title, '—', 'Ölçüm sağlanmıyor')).join(''));
    set('abTests', empty('Canlı A/B testi veya kalite ölçümü kaydı sağlanmıyor.'));
    disable('#ai-config input, #ai-config textarea, #ai-config button', 'Canlı politika kontrolü ERP yönetim ayarlarından yapılır.');
    unsupported('ai-playground', 'Canlı OpenAI taslağı, gerçek yorumun detayındaki “Taslak hazırla” işlemiyle mevcut ERP servisi üzerinden üretilir.');
    const status = byId('aiStatus');
    if (status) status.textContent = management().settings?.openai_configured === true ? `Mevcut ERP OpenAI yapılandırması · ${management().settings.openai_model || 'Model sunucuda korunuyor'}` : 'OpenAI yapılandırma durumu bu servisten alınamadı; gerçek taslak kaynağı yorum detayında gösterilir.';
  });

  wrap('renderSettings', () => {
    const m = management(), settings = m.settings || {};
    set('intGrid', [['Google Business Profile', settings.google_connected === true ? 'ERP bağlantısı kayıtlı' : settings.google_connected === false ? 'Bağlı değil' : 'Durum alınamadı'], ['OpenAI', 'Mevcut ERP taslak servisi · anahtar tarayıcıya aktarılmaz'], ['WhatsApp / Slack / E-posta', 'Bu ekrana bağlı canlı kanal durumu sağlanmıyor']].map(([name, status]) => `<div class="card"><b>${esc(name)}</b><p>${esc(status)}</p></div>`).join(''));
    set('usersList', (m.users || []).map(u => `<div class="watch-row"><div class="info"><b>${esc(u.full_name || 'ERP kullanıcısı')}</b><small>${esc(u.role)} · ${u.is_active === false ? 'Pasif' : 'Aktif'}</small></div></div>`).join('') || empty(readEmpty('Yetkili kullanıcı kaydı bulunmuyor.')));
    set('permTable', `<thead><tr><th>İzin</th><th>Canlı kapsam</th></tr></thead><tbody><tr><td>Google yayını</td><td>ERP sunucu rolü + şube kapsamı + insan onayı</td></tr><tr><td>Yayın yetkilileri</td><td>${esc((policy().approver_roles || []).join(', ') || 'Politika alınamadı')}</td></tr></tbody>`);
    set('tplGrid', empty('Bu servisten canlı şablon listesi sağlanmıyor. Taslak kaynağı ilgili ERP görevinde gösterilir.'));
    set('rulesList', `<div class="card"><b>ERP canlı yayın politikası</b><p>Risksiz 4–5 yıldızlı yorumların doğrulanmış AI yanıtları, otomatik yanıt açıkken yayımlanabilir. Diğer yanıtlar yetkili insan onayı gerektirir.</p>${livePolicyEditor()}<p>Sunucu otomasyonu tarayıcı kapalıyken de çalışır. Son çalışma ve bağlantı durumu Sistem ekranında izlenir.</p><p>Otomatik yanıt: ${policy().auto_reply_enabled === false ? 'Kapalı' : policy().auto_reply_enabled === true ? 'Açık · yalnızca risksiz 4–5 yıldız' : 'Alınamadı'}</p></div>`);
    wirePolicyEditor();
    disable('#settings-users button, #settings-templates button, #storeGrid input, #settings-stores [onclick="openNewStore()"]');
    document.querySelectorAll('#storeGrid .sc-meta').forEach(node => { node.textContent = `Bursa Nilüfer · Canlı · SLA ${policy().default_sla_hours ? `${policy().default_sla_hours} saat` : 'alınamadı'}`; });
  });

  function auditRows() {
    return (management().audit || []).map(a => ({ ts: dateText(a.created_at), user: a.actor_role || 'ERP', entity: a.entity_type || '', action: a.action || '', detail: typeof a.detail === 'string' ? a.detail : '' }));
  }
  wrap('renderAudit', () => {
    const select = byId('auditActionF');
    const actions = Array.from(new Set(auditRows().map(a => a.action))).filter(Boolean).sort();
    if (select) {
      preserve('auditActionF');
      const selected = select.value;
      select.innerHTML = '<option value="">Tüm işlemler</option>' + actions.map(action => `<option value="${esc(action)}">${esc(action)}</option>`).join('');
      select.value = actions.includes(selected) ? selected : '';
    }
    const action = select?.value || '';
    const list = auditRows().filter(a => !action || a.action === action);
    set('auditBody', list.map(a => `<tr><td class="mono">${esc(a.ts)}</td><td>${esc(a.user)}</td><td>${esc(a.entity)}</td><td><span class="chip info">${esc(a.action)}</span></td><td>${esc(a.detail)}</td></tr>`).join('') || tableEmpty(5, readEmpty('Bu filtrede canlı işlem kaydı bulunmuyor.')));
    const table = byId('auditBody')?.closest('table');
    if (table && !table.querySelector('caption')) { const caption = document.createElement('caption'); caption.textContent = 'Genel merkez / Google bağlantısı kayıtları'; caption.style.textAlign = 'left'; table.prepend(caption); }
  }, false);
  wrap('renderSystem', () => {
    const m = management();
    const workflow = ai?.getWorkflowState?.();
    set('healthMetrics', metric('ERP kayıtları', workflow?.loaded && !workflow.error ? 'Alındı' : 'Doğrulanmadı', 'Mevcut yetkili ERP oturumu') + metric('Google', m.settings?.google_connected === true ? 'Bağlı' : m.settings?.google_connected === false ? 'Bağlı değil' : '—', 'Sunucu bağlantı kaydı') + metric('Yanıt kuyruğu', records('approvals').length, 'Yüklenen ERP görevleri') + metric('Ölçüm kapsamı', '—', 'Uptime / gecikme telemetrisi yok'));
    set('svcGrid', `<div class="card"><b>Google Business Profile</b><p>${m.settings?.google_connected === true ? 'ERP bağlantısı kayıtlı' : 'Bağlantı durumu alınamadı veya bağlı değil'}</p></div><div class="card"><b>OpenAI</b><p>Mevcut ERP taslak servisinden çağrılır. Taslağın kaynağı yorum detayında gösterilir.</p></div>`);
    set('quotaList', empty('API kota, harcama ve servis gecikmesi ölçümleri bu servisten sağlanmıyor.'));
    set('escGrid', empty('Canlı yükseltme matrisi servisi bulunmuyor.'));
    set('notifMatrix', `<p>Genel merkez / Google bağlantısı bildirim kayıtları</p>` + ((m.notifications || []).map(n => `<div class="watch-row"><div class="info"><b>${esc(n.template_key)}</b><small>${esc(dateText(n.created_at))}</small></div><span class="chip">${esc(n.status)}</span></div>`).join('') || empty(readEmpty('Bu kapsamda bildirim kaydı bulunmuyor.'))));
    set('groupList', empty('Canlı şube grubu kaydı bu servisten sağlanmıyor.'));
    set('lifecycleGrid', `<div class="lc-col"><div class="lc-head">Canlı kapsam <span>1</span></div><div class="lc-item">Bursa Nilüfer</div><p>Şube yaşam döngüsü bu servisten sağlanmıyor.</p></div>`);
    disable('#system-escalation button, #system-notifmatrix button, #system-groups button, #system-lifecycle button');
    root.renderAudit();
  }, false);

  wrap('renderStoreDetail', () => {
    const a = stats();
    if (byId('storeSub')) byId('storeSub').textContent = 'Bursa Nilüfer · Canlı ERP kayıtları';
    set('storeAlerts', a.slaHours === null ? empty('SLA ayarı henüz alınmadı.') : a.overdue ? `<div class="alert warn">${a.overdue} tarihli yanıtsız kayıt ${a.slaHours} saatlik SLA süresini aştı.</div>` : '');
    set('storeKpis', [metric('Alınan yorum', a.count, 'ERP kayıtları', 'kpi'), metric('Puan', number(a.average), 'Alınan yorumlar', 'kpi'), metric('Yanıt', percent(a.responseRate), 'Google yanıtı bulunan', 'kpi'), metric('SLA', percent(a.slaRate), a.slaHours ? `${a.slaHours} saat` : 'Ayar bekleniyor', 'kpi'), metric('Yanıtsız', a.pending, 'Alınan kayıtlar', 'kpi'), metric('SLA aşımı', a.overdue ?? '—', 'Tarih bilgisi bulunanlar', 'kpi')].join(''));
    set('storeQuickSettings', `<div class="watch-row"><div class="info"><b>Canlı ERP ayarları</b><small>Google ve OpenAI bağlantıları sunucuda korunur.</small></div></div><div class="watch-row"><div class="info"><b>Yanıt SLA</b><small>${policy().default_sla_hours ? `${policy().default_sla_hours} saat` : 'Ayar alınamadı'}</small></div></div><div class="watch-row"><div class="info"><b>Yayın</b><small>Yetkili insan onayı zorunlu</small></div></div>`);
    document.querySelectorAll('#storeRecentReviews .chip').forEach(chip => { if (/Risk/.test(chip.textContent)) chip.textContent = 'Puan kuralı'; });
  });
  wrap('renderStoreCharts', () => realCharts(true), false);

  wrap('renderGolive', () => {
    if (byId('ghScore')) byId('ghScore').textContent = '—';
    const intro = document.querySelector('#view-golive p');
    if (intro) intro.textContent = 'Bursa canlı · Gebze ve İnegöl demo. Bağlantı ve kayıt durumları aşağıda.';
    set('checklistGrid', [['Google bağlantısı', management().settings?.google_connected === true ? 'ERP bağlantısı kayıtlı' : 'Bağlantı doğrulanmadı'], ['Bursa canlı', 'Mevcut ERP verisi ve yetkileri kullanılır'], ['Gebze ve İnegöl', 'Demo kapsamı korunur'], ['Yayın onayı', 'Canlı yanıtlar insan onayına bağlıdır'], ['Dağıtım', 'Bu sayfa kod dağıtımı çalıştırmaz; GitHub dağıtımı ayrı doğrulanır'], ['Ek servisler', 'Yedekleme, güvenlik taraması ve yük testi sonucu bu servisten sağlanmıyor']].map(([title, detail]) => `<div class="check-item"><div class="ci-body"><div class="ci-title">${esc(title)}</div><div class="ci-desc">${esc(detail)}</div></div></div>`).join(''));
    disable('#view-golive [onclick="startGolive()"]', 'Dağıtım bu sayfadan çalıştırılmaz.');
  }, false);

  // Exports respect the same live/demo separation as the visible tables.
  const originalExportAudit = root.exportAudit;
  root.exportAudit = () => live() ? root.downloadCSV('bursa-canli-islemler.csv', [['Tarih', 'Rol', 'Varlık', 'İşlem', 'Detay'], ...auditRows().map(a => [a.ts, a.user, a.entity, a.action, a.detail])]) : originalExportAudit();
  const originalExportPerformance = root.exportPerformance;
  root.exportPerformance = () => {
    if (!live()) return originalExportPerformance();
    const a = stats();
    const branch = currentBranch();
    root.downloadCSV(`${(branch?.name || 'sube').toLocaleLowerCase('tr-TR').replace(/\s+/g, '-')}-canli-performans.csv`, [['Şube', 'Alınan yorumlar', 'Bu ay alınan', 'Puan', 'Yanıt%', 'SLA%', 'SLA saati'], [`${branch?.city || ''} ${branch?.name || ''}`.trim(), a.count, a.monthCount, number(a.average), percent(a.responseRate), percent(a.slaRate), a.slaHours ?? 'Sağlanmadı']]);
  };

  root.OTOTRReviewLiveViews = { ...pure, getScope: () => scope, getBranchId: () => branchIdForScope(scope), isLive: () => live(), setScope, setBranchRegistry, getBranchRegistry: () => branchRegistry.slice(), rerender, scopedReviews: rows, scopedCollection: records, auditRows };
  if (byId('erpGoogleQueue')) byId('erpGoogleQueue').onclick = () => { setScope('live'); root.switchView('reviews'); };
  if (byId('erpGoogleConnect')) byId('erpGoogleConnect').onclick = () => { setScope('live'); root.switchView('system'); };
  // Disabled controls also have command-palette/keyboard entry points. Guard the
  // callbacks so these demo-only forms can never claim a successful live save.
  ['openNewStore', 'saveNewStore', 'openAddUser', 'saveNewUser', 'openTpl', 'openTplEditor', 'saveTpl', 'openDeleg', 'saveDeleg', 'openGroup', 'saveGroup', 'deleteGroup', 'saveEscalation', 'runPlayground', 'markAllRead', 'startGolive'].forEach(name => {
    const original = root[name];
    if (typeof original === 'function') root[name] = (...args) => live() ? root.toast('Bu işlem için bağlı bir canlı ERP servisi yok. Demo şube kapsamını seçebilirsiniz.', 'info') : original(...args);
  });
  scopeNotice();
  rerender();
})(typeof window === 'undefined' ? null : window);
