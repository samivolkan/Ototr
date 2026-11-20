/* The alternative is a presentation layer over the existing ERP bridge.
   It has no credentials, independent live cache, publisher or background jobs. */
(function (root) {
  'use strict';
  const BRANCH_IDS = ['branch-google-nilufer', 'branch-google-gebze', 'branch-google-inegol'];
  const BRANCH_NAMES = ['Bursa Nilüfer', 'Kocaeli Gebze', 'Bursa İnegöl'];
  const PERIODS = { month: 'Bu ay', quarter: 'Son 3 ay', ytd: 'Yıl başından bugüne', year: 'Son 12 ay' };
  const monthFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit' });
  function monthKey(value) {
    if (value == null || value === '') return null;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return null;
    const parts = monthFormat.formatToParts(date);
    return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`;
  }
  function monthsFor(period, now = Date.now()) {
    const [year, month] = monthKey(now).split('-').map(Number);
    const count = period === 'month' ? 1 : period === 'quarter' ? 3 : period === 'ytd' ? month : 12;
    return Array.from({ length: count }, (_, i) => new Date(Date.UTC(year, month - count + i, 1, 12)).toISOString().slice(0, 7));
  }
  function periodRows(rows, period, now = Date.now()) {
    const keys = new Set(monthsFor(period, now));
    return rows.filter(row => keys.has(monthKey(row.createdAt)) && new Date(row.createdAt).getTime() <= now);
  }
  const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit' });
  function dayKey(value) {
    return dayFormat.format(new Date(value));
  }
  function recentDays(now) {
    const today = Date.parse(dayKey(now) + 'T12:00:00Z');
    return Array.from({ length: 30 }, (_, index) => new Date(today - (29 - index) * 86400000).toISOString().slice(0, 10));
  }
  function scopedRows(rows, branchId) {
    if (!BRANCH_IDS.includes(branchId) && !/^branch-custom-[A-Za-z0-9-]{8,80}$/.test(branchId)) return [];
    const demo = BRANCH_IDS.slice(1).includes(branchId);
    const name = BRANCH_NAMES[BRANCH_IDS.indexOf(branchId)];
    return rows.filter(row => {
      const identity = row.branchId || row.branch_id;
      return row.demo === demo && (identity ? identity === branchId : Boolean(name) && row.store === name);
    });
  }
  function targetSeries(months, targets, branchId, demoTarget) {
    if (!BRANCH_IDS.includes(branchId) && !/^branch-custom-[A-Za-z0-9-]{8,80}$/.test(branchId)) return months.map(() => null);
    return months.map(month => {
      const record = targets.find(row => row.branch_id === branchId && String(row.month).slice(0, 7) === month);
      const raw = !BRANCH_IDS.slice(1).includes(branchId) ? record?.monthly_target ?? record?.target : demoTarget;
      const value = Number(raw);
      return raw != null && Number.isFinite(value) && value > 0 ? value : null;
    });
  }
  function progress(actual, target) { return target > 0 ? Math.round(actual / target * 100) : null; }
  function cumulativeProgress(counts, targets) {
    let actual = 0, target = 0;
    const achieved = [], planned = [];
    targets.forEach((value, index) => {
      if (value == null || !Number.isFinite(Number(value))) { achieved.push(null); planned.push(null); return; }
      actual += Number(counts[index]) || 0; target += Number(value);
      achieved.push(actual); planned.push(target);
    });
    return { achieved, planned };
  }
  const pure = { recentDays, cumulativeProgress, BRANCH_IDS, monthsFor, monthKey, periodRows, scopedRows, targetSeries, progress };
  if (typeof module === 'object' && module.exports) module.exports = pure;
  if (!root?.document) return;

  const doc = root.document;
  doc.documentElement.dataset.reviewVariant = '2';
  const byId = id => doc.getElementById(id);
  const node = (tag, text, className) => { const n = doc.createElement(tag); if (text != null) n.textContent = text; if (className) n.className = className; return n; };
  const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  doc.title = 'OTOTR · Yorum Yönetimi';
  try {
    if (root.parent !== root && root.parent.location.origin === location.origin) {
      doc.documentElement.classList.add('review-embedded');
      const parentDoc = root.parent.document;
      if (!parentDoc.getElementById('reviewPage2ShellStyle')) {
        const style = parentDoc.createElement('style'); style.id = 'reviewPage2ShellStyle';
        // Active only while this alternative iframe is mounted. The ERP's
        // profile control returns normally when navigating to another module.
        style.textContent = 'body:has(.google-management-frame[src*="variant=2"]) #ototr-profile-actions{display:none!important}';
        parentDoc.head.append(style);
      }
    }
  } catch (_) { /* A standalone preview has its own header controls. */ }
  const subtitle = doc.querySelector('.bsub'); if (subtitle) subtitle.textContent = 'Yorum Yönetimi';
  const live = () => root.OTOTRReviewLiveViews;
  const branchId = () => live()?.getBranchId?.() || BRANCH_IDS[0];
  const isLive = () => live()?.isLive?.() ?? branchId() === BRANCH_IDS[0];
  const branchName = () => BRANCH_NAMES[BRANCH_IDS.indexOf(branchId())] || branch()?.name || 'Şube seçin';
  const branch = () => BRANCHES.find(b => (b.erpBranchId || b.id) === branchId()) || BRANCHES[BRANCH_IDS.indexOf(branchId())];
  const management = () => root.OTOTRReviewManagement?.state || {};
  const regionalDemos = [
    ['Marmara','Kocaeli','Gebze'], ['Ege','İzmir','Bornova'], ['Akdeniz','Antalya','Muratpaşa'],
    ['İç Anadolu','Ankara','Çankaya'], ['Karadeniz','Samsun','Atakum'],
    ['Doğu Anadolu','Erzurum','Yakutiye'], ['Güneydoğu Anadolu','Gaziantep','Şahinbey']
  ].map(([region,city,name], index) => ({id:'regional-demo-'+index, region, city, name:city+' '+name, target:100+index*15}));
  const analyticsScope = {mode:'live', region:'', city:'', branch:''};
  const analyticsActive = () => ['overview','performance'].includes(STATE.view);
  const liveRegistry = () => {
    const items = (live()?.getBranchRegistry?.() || []).filter(b => b.active !== false && !b.onboarding?.test &&
      (b.id === BRANCH_IDS[0] || (['live','active'].includes(b.lifecycle) && b.google_verified_at)));
    return items.length ? items : [{id:BRANCH_IDS[0],region:'Marmara',city:'Bursa',name:'Bursa Nilüfer'}];
  };
  const matchingBranches = () => (analyticsScope.mode === 'demo' ? regionalDemos : liveRegistry()).filter(b =>
    (!analyticsScope.region || b.region === analyticsScope.region) &&
    (!analyticsScope.city || b.city === analyticsScope.city) &&
    (!analyticsScope.branch || b.id === analyticsScope.branch));
  const analyticsName = () => analyticsActive() ? matchingBranches().find(b => b.id === analyticsScope.branch)?.name ||
    analyticsScope.city || analyticsScope.region || 'Genel Merkez' : branchName();
  const analyticsDemo = () => analyticsActive() && analyticsScope.mode === 'demo';
  const analyticsLive = () => analyticsActive() ? !analyticsDemo() : isLive();
  const missingScopeData = () => analyticsActive() && !analyticsDemo() && matchingBranches().some(b =>
    b.id !== branchId() && !parentReviews?.getBranchById?.(b.id)?.lastSyncedAt);
  const demoTargets = new Map();
  try {
    for (const b of regionalDemos) {
      const value = Number(localStorage.getItem('ototr.regional-demo.target.'+b.id));
      if (Number.isInteger(value) && value > 0 && value <= 10000) demoTargets.set(b.id,value);
    }
  } catch (_) {}
  function regionalDemoRows(b) {
    const index = regionalDemos.indexOf(b);
    const days = recentDays(Date.now());
    return Array.from({length:44+index*5}, (_, n) => {
      const createdAt = days[n % 29]+'T08:00:00Z';
      const answered = n % 9 !== 0;
      return {branchId:b.id,demo:true,createdAt,stars:n%8===0?3:5,status:answered?'gonderildi':'bekliyor',
        replyDate:answered?new Date(Date.parse(createdAt)+(n%16+1)*3600000).toISOString():null};
    });
  }
  let parentReviews;
  try { if (root.parent !== root && root.parent.location.origin === root.location.origin) parentReviews = root.parent.OTOTRGoogleReputation; } catch (_) {}
  function cachedReviews(b) {
    if (b.id === branchId() && isLive()) return scopedRows(REVIEWS,b.id);
    return (parentReviews?.fetchGoogleReviews?.(b.id) || []).map(r => ({
      branchId:b.id,createdAt:r.reviewDate,stars:r.rating,isReplied:r.isReplied,replyDate:r.replyDate || r.replyUpdatedAt
    }));
  }
  const scopedTargetCache = new Map();
  function analyticsTargets(months) {
    if (!analyticsActive()) return targetSeries(months,management().targets || [],branchId(),branch()?.target);
    const branches = matchingBranches();
    return months.map(month => {
      const values = branches.map(b => analyticsDemo() ? (demoTargets.get(b.id) || b.target) :
        targetSeries([month], b.id === branchId() ? management().targets || [] : scopedTargetCache.get(b.id) || [],b.id)[0]);
      return values.length && values.every(value => value != null) ? values.reduce((sum,value) => sum+value,0) : null;
    });
  }
  const operationalRows = () => scopedRows(typeof REVIEWS === 'undefined' ? [] : REVIEWS, branchId());
  const allRows = () => analyticsActive() ? matchingBranches().flatMap(analyticsDemo() ? regionalDemoRows : cachedReviews) : operationalRows();
  let period = 'month';
  const rows = () => periodRows(allRows(), period);
  const sla = () => analyticsDemo() ? 24 : Number(isLive() ? management().policy?.default_sla_hours : branch()?.slaH) || 24;
  const stats = list => {
    const summary = live().aggregateReviews(list, { slaHours: sla() });
    if (!analyticsActive() || matchingBranches().length < 2) return summary;
    const buckets = matchingBranches().map(b => live().aggregateReviews(list.filter(r => (r.branchId || r.branch_id) === b.id),
      { slaHours: b.id === branchId() ? sla() : Number(b.sla_hours) || 24 }));
    const totalTimed = buckets.reduce((n,b) => n+b.timedAnswers,0);
    return {...summary,slaRate:totalTimed ? buckets.reduce((n,b)=>n+(b.slaRate||0)*b.timedAnswers,0)/totalTimed : null};
  };
  const fmt = value => value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  const pct = value => value == null ? '—' : `${Math.round(value)}%`;
  const recordedReviews = (now = Date.now()) => allRows().filter(row =>
    monthKey(row.createdAt) && new Date(row.createdAt).getTime() <= now);
  const currentReviewTotal = () => recordedReviews().length;
  const currentTarget = () => analyticsTargets([monthKey(Date.now())])[0];
  const demoKey = 'ototr.review-page2.demo-targets.v1';
  try {
    const saved = JSON.parse(localStorage.getItem(demoKey) || '{}');
    BRANCHES.forEach((b, i) => { const value = Number(saved[BRANCH_IDS[i]]); if (i > 0 && i < 3 && Number.isInteger(value) && value >= 1 && value <= 10000) b.target = value; });
  } catch (_) { /* A damaged demo preference must not affect live data. */ }

  const oldControls = byId('erpGoogleSync')?.parentElement;
  const scopeBar = node('div', null, 'v2-scope'); scopeBar.setAttribute('aria-label', 'Şube ve dönem filtreleri');
  doc.querySelector('main')?.prepend(scopeBar);
  const chartScope = node('div', null, 'v2-chart-scope');
  byId('chartTrend')?.closest('.chart-card')?.prepend(chartScope);
  const branchSelect = byId('erpGlobalScope');
  const branchLabel = node('label', 'Şube');
  if (branchSelect) {
    branchLabel.htmlFor = branchSelect.id;
    branchLabel.append(branchSelect);
    scopeBar.append(branchLabel);
  }
  const managementApi = root.OTOTRReviewManagement;
  if (managementApi) {
    const sharedRefresh = managementApi.refresh;
    // Demo menus do not need live management requests. A failed demo read
    // must not leave the live target editor disabled when returning to Bursa.
    managementApi.refresh = function (...args) {
      return isLive() ? sharedRefresh.apply(this, args) : Promise.resolve(managementApi.state);
    };
    let liveRefreshPending = false;
    const refreshSelectedLiveBranch = () => {
      if (!liveRefreshPending || !isLive() || management().loading) return;
      liveRefreshPending = false;
      managementApi.refresh().catch(() => root.toast('Canlı yönetim verisi yenilenemedi.', 'warn'));
    };
    branchSelect?.addEventListener('change', () => { liveRefreshPending = isLive(); refreshSelectedLiveBranch(); });
    root.addEventListener('ototr-management-ready', refreshSelectedLiveBranch);
  }
  const periodLabel = node('label', 'Dönem'); periodLabel.htmlFor = 'v2Period';
  const periodSelect = node('select'); periodSelect.id = 'v2Period'; periodSelect.setAttribute('aria-label', 'Analiz dönemi');
  for (const [value, label] of Object.entries(PERIODS)) { const option = node('option', label); option.value = value; periodSelect.append(option); }
  periodSelect.value = period; periodLabel.append(periodSelect); scopeBar.append(periodLabel);
  const environment = node('span', 'Canlı çalışma alanı', 'chip ok'); scopeBar.append(environment);
  const nav = byId('topnav');
  const navRow = node('div', null, 'v2-nav-row');
  const navActions = node('div', null, 'v2-nav-actions');
  if (nav) {
    nav.before(navRow);
    navRow.append(nav, navActions);
    const release = byId('releaseFooterBadge');
    if (release) navActions.prepend(release);
    for (const id of ['erpGoogleSync', 'erpGoogleQueue']) {
      const button = byId(id);
      if (button) navActions.append(button);
    }
  }
  const refreshButtons = node('div', null, 'v2-nav-status');
  const connectionButton = byId('erpGoogleConnect');
  if (connectionButton) refreshButtons.append(connectionButton);
  const freshness = node('span', '', 'v2-freshness');
  freshness.setAttribute('aria-live', 'polite');
  refreshButtons.append(freshness);
  navActions.prepend(refreshButtons);
  if (oldControls) oldControls.hidden = true;
  const meta = node('div', null, 'v2-period-note'); meta.id = 'v2PeriodNote'; meta.setAttribute('aria-live', 'polite');
  doc.querySelector('.ph')?.after(meta);
  const reviewToolbar = doc.querySelector('#view-reviews .review-toolbar');
  const reviewStatus = node('div', null, 'v2-review-status');
  doc.querySelector('.ph')?.append(reviewStatus);

  const hierarchy = node('div', null, 'v2-chart-scope v2-hierarchy');
  const levelSelects = {};
  for (const [key,label] of [['mode','Veri'],['region','Bölge'],['city','İl'],['branch','Şube']]) {
    const field = node('label', label);
    const select = node('select');
    select.setAttribute('aria-label',label);
    levelSelects[key] = select;
    field.append(select);
    hierarchy.append(field);
    select.onchange = () => {
      analyticsScope[key] = select.value;
      if (key === 'mode' || key === 'region') analyticsScope.city = '';
      if (key !== 'branch') analyticsScope.branch = '';
      if (key === 'mode') analyticsScope.region = '';
      if (key === 'branch' && select.value && !analyticsDemo()) {
        live().setScope(select.value === BRANCH_IDS[0] ? 'live' : select.value);
        managementApi?.refresh().catch(() => {});
      }
      root.switchView(STATE.view);
    };
  }
  const targetReads = new Set();
  function loadScopeTargets() {
    if (analyticsDemo() || !managementApi) return;
    for (const b of matchingBranches()) {
      if (b.id === branchId() || targetReads.has(b.id) || scopedTargetCache.has(b.id)) continue;
      targetReads.add(b.id);
      managementApi.request('targets_list',{branch_id:b.id}).then(data => {
        scopedTargetCache.set(b.id,(data.items || []).filter(row=>row.branch_id===b.id));
        if (analyticsActive()) root.switchView(STATE.view);
      }).catch(() => {}).finally(() => targetReads.delete(b.id));
    }
  }
  function updateHierarchy() {
    const candidates = analyticsDemo() ? regionalDemos : liveRegistry();
    const regions = [...new Set(candidates.map(b=>b.region))].sort();
    const inRegion = candidates.filter(b=>!analyticsScope.region || b.region===analyticsScope.region);
    const cities = [...new Set(inRegion.map(b=>b.city))].sort();
    const branches = inRegion.filter(b=>!analyticsScope.city || b.city===analyticsScope.city);
    const choices = {
      mode:[['live','Canlı'],['demo','Demo']],
      region:[['','Genel Merkez'],...regions.map(x=>[x,x])],
      city:[['','Tüm iller'],...cities.map(x=>[x,x])],
      branch:[['','Tüm şubeler'],...branches.map(b=>[b.id,b.name])]
    };
    for (const [key,select] of Object.entries(levelSelects)) {
      select.replaceChildren(...choices[key].map(([id,label])=>{const option=node('option',label);option.value=id;return option;}));
      select.value=analyticsScope[key];
    }
  }

  function placeReviewControls() {
    const reviewView = STATE.view === 'reviews' && Boolean(reviewToolbar);
    scopeBar.hidden = reviewView || STATE.view === 'overview';
    hierarchy.hidden = !analyticsActive();
    branchLabel.hidden = analyticsActive();
    if (analyticsActive()) {
      const destination = STATE.view === 'overview' ? chartScope : scopeBar;
      if (hierarchy.parentElement !== destination) destination.prepend(hierarchy);
      updateHierarchy();
      loadScopeTargets();
    }
    reviewStatus.hidden = !reviewView;
    if (reviewView) {
      if (branchSelect && branchSelect.parentElement !== reviewToolbar) reviewToolbar.prepend(branchSelect);
      if (environment.parentElement !== reviewStatus) reviewStatus.append(environment);
    } else {
      if (branchSelect && branchSelect.parentElement !== branchLabel) branchLabel.append(branchSelect);
      if (STATE.view === 'overview' && chartScope.isConnected) {
        if (branchLabel.parentElement !== chartScope) chartScope.append(branchLabel, periodLabel, environment);
      } else if (branchLabel.parentElement !== scopeBar) {
        scopeBar.append(branchLabel, periodLabel, environment);
      } else if (environment.parentElement !== scopeBar) {
        scopeBar.append(environment);
      }
    }
  }

  function normalizeScope() {
    placeReviewControls();
    if (branchSelect) {
      const labels = { live: 'Bursa Nilüfer' };
      for (const row of live()?.getBranchRegistry?.() || []) {
        if (row.id.startsWith('branch-custom-') && row.live && row.active !== false && row.google_verified_at && !row.onboarding?.test) labels[row.id] = row.name;
      }
      for (const option of [...branchSelect.options]) { if (labels[option.value]) option.textContent = labels[option.value]; else option.remove(); }
      branchSelect.setAttribute('aria-label', 'Şube seçimi');
    }
    const sync = byId('erpGoogleSync');
    if (sync) { sync.hidden = !isLive(); sync.textContent = 'Veriyi yenile'; }
    const current = byId('erpDataScope');
    if (current) current.textContent = `${branchName()} · ${isLive() ? 'Canlı ERP / Google kayıtları' : 'Demo · dış gönderim kapalı'}`;
    const currentMonth = monthKey(Date.now());
    meta.innerHTML = `<strong>${html(PERIODS[period])}</strong><span>${monthsFor(period)[0]} — ${currentMonth}</span><span>· ${isLive() ? 'Alınan canlı kayıtlar' : 'Örnek kayıtlar'}</span>`;
    const source = branch();
    freshness.textContent = isLive() && source?.lastSync ? `Son veri: ${source.lastSync}` : 'Son veri: —';
    doc.querySelectorAll('#topnav a').forEach(link => { link.setAttribute('role', 'button'); link.tabIndex = 0; });
  }
  doc.addEventListener('keydown', event => {
    if (event.target.matches('#topnav a') && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.target.click(); }
  });
  periodSelect.addEventListener('change', () => {
    if (root.OTOTRReviewBridge?.isEditing?.()) { periodSelect.value = period; root.toast('Önce açık taslağı kaydedin.', 'warn'); return; }
    period = periodSelect.value; SELECTED.clear(); SEL = null; root.switchView(STATE.view);
  });
  root.roleReviews = () => rows().filter(row => STATE.role === 'legal' ? row.pipeline?.routedTo === 'legal' || row.status === 'hukuk' : STATE.role === 'complaint' ? row.pipeline?.routedTo === 'complaint' : true);
  const originalSwitch = root.switchView;
  root.switchView = function (...args) { const result = originalSwitch.apply(this, args); normalizeScope(); return result; };

  const hiddenTrendSeries = new Set();
  const chartSnapshots = new WeakMap();
  function chart(id, type, labels, datasets, extra = {}, chartPlugins = []) {
    const canvas = byId(id);
    if (!canvas || typeof Chart === 'undefined') return;
    const color = getComputedStyle(doc.documentElement).getPropertyValue('--mute').trim();
    const line = getComputedStyle(doc.documentElement).getPropertyValue('--line').trim();
    const snapshot = JSON.stringify({ type, labels, datasets, color, line });
    const existing = charts[id];
    if (existing?.canvas === canvas && chartSnapshots.get(existing) === snapshot) return;
    root.destroyChart(id);
    const reducedMotion = root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${labels.join(', ')}. ${datasets.map(d => `${d.label}: ${d.data.map(v => v == null ? 'kayıt yok' : v).join(', ')}`).join('. ')}`);
    const plugins = { legend: { display: type === 'doughnut', position: 'right', labels: { color, boxWidth: 9, padding: 12 } } };
    charts[id] = new Chart(canvas, { type, plugins: id === 'chartRating' ? [{ id:'reviewTotal', afterDraw(c) {
      const arc=c.getDatasetMeta(0)?.data?.[0]; if(!arc)return;
      const total=datasets[0].data.reduce((sum,value)=>sum+Number(value||0),0),ctx=c.ctx;
      ctx.save();ctx.textAlign='center';ctx.fillStyle=getComputedStyle(doc.documentElement).getPropertyValue('--ink').trim()||'#0f172a';ctx.font='700 28px system-ui';ctx.fillText(String(total),arc.x,arc.y);ctx.fillStyle=color;ctx.font='12px system-ui';ctx.fillText('yorum',arc.x,arc.y+22);ctx.restore();
    }}] : chartPlugins, data: { labels, datasets }, options: {
      responsive: true, maintainAspectRatio: false,
      animation: reducedMotion || id.startsWith('v2Mini') ? false : { duration: 550, easing: 'easeOutQuart' },
      plugins, ...(type === 'doughnut' ? { cutout: '68%' } : { scales: { x: { grid: { display: false }, ticks: { color } }, y: { beginAtZero: true, grid: { color: line }, ticks: { color, precision: 0 } } } }), ...extra
    } });
    chartSnapshots.set(charts[id], snapshot);
  }
  function emptyChart(id, hasData, message) {
    const host = byId(id)?.parentElement; if (!host) return;
    host.querySelector('.v2-chart-empty')?.remove();
    if (!hasData) host.append(node('div', message, 'v2-chart-empty'));
  }
  function chartNote(id, message) {
    const host = byId(id)?.closest('.chart-card'); if (!host) return;
    let note = host.querySelector('.v2-chart-note');
    if (!note) { note = node('p', null, 'v2-chart-note'); host.append(note); }
    note.textContent = message;
  }
  const watchTitle = byId('ovWatchlist')?.closest('.chart-card')?.querySelector('h3');
  if (watchTitle) watchTitle.textContent = 'Dikkat gerektiren şubeler';
  const dismissedTargets = new Set();
  root.renderOverview = function () {
    const a = stats(rows());
    const connection = management().error ? 'Canlı yönetim bağlantısı alınamadı; Bağlantı durumu ekranını kontrol edin.' : !management().loaded ? 'Canlı kayıtlar için ERP oturumu bekleniyor.' : `${html(analyticsName())} · Google kayıtları ve ERP onay akışı. Kurulum ve test şubeleri hesaplamaya dahil edilmez.`;
    byId('ovAlerts').innerHTML = `<div class="alert ${analyticsLive() && management().loaded && !management().error ? 'info' : 'warn'}">${analyticsLive() ? connection : `${html(analyticsName())} · Demo çalışma alanı. Yapılan denemeler Google’a gönderilmez.`}</div>`;
    const total = currentReviewTotal(), target = currentTarget();
    const ratio = missingScopeData() ? null : progress(total, target);
    if (analyticsLive() && management().loaded && !management().error) {
      const headline = ratio == null ? 'Toplam yorum hedefi' : ratio >= 100 ? 'Toplam yorum hedefine ulaşıldı' : 'Toplam yorum hedefinde ilerleme';
      const insightKey = branchId() + ':' + monthKey(Date.now()) + ':' + target;
      byId('ovAlerts').innerHTML = dismissedTargets.has(insightKey) ? '' : `<div class="v2-insight"><button class="v2-insight-close" type="button" aria-label="Hedef özetini kapat">×</button><strong>${headline}</strong><p>${`Mevcut toplam: ${fmt(total)} yorum · Hedef: ${target == null ? 'Girilmedi' : fmt(target)}`} ${target == null ? '' : `· ${pct(ratio)} gerçekleşme · Kalan ${fmt(Math.max(0, target - total))} yorum.`} ${a.count ? `Ortalama puan ${fmt(a.average)}, yanıt oranı ${pct(a.responseRate)}. ${a.timedAnswers ? `${sla()} saatlik SLA içinde yanıtlananların oranı ${pct(a.slaRate)}.` : 'Yanıt süresi için ölçülebilir kayıt bekleniyor.'}` : ''}</p></div>`;
    }
      const dismiss = byId('ovAlerts').querySelector('.v2-insight-close');
      if (dismiss) dismiss.onclick = () => {
        dismissedTargets.add(branchId() + ':' + monthKey(Date.now()) + ':' + target);
        byId('ovAlerts').replaceChildren();
      };
    if (missingScopeData()) byId('ovAlerts').insertAdjacentHTML('beforeend',
      '<div class="alert warn">Bu kapsamda henüz senkronize edilmemiş canlı şubeler var. Yorum göstergeleri alınmış kayıtları kapsar.</div>');
    const responseGoal = 95;
    const slaGoal = 90;
    const ratingCount = a.ratingCounts.reduce((sum, count) => sum + count, 0);
    const metrics = [
      ['Yorum hacmi', fmt(a.count), PERIODS[period]],
      ['Ortalama puan', a.average == null ? '—' : `${a.average.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ★`, `${fmt(ratingCount)} puanlı yorum`, a.average == null ? '' : 'ok'],
      ['Yanıt oranı', a.responseRate == null ? '—' : `%${Math.round(a.responseRate)}`, `Hedef %${responseGoal} · ${fmt(a.answered)}/${fmt(a.count)}`,
        a.responseRate == null ? '' : a.responseRate >= responseGoal ? 'ok' : 'warn', a.responseRate == null ? '' : a.responseRate >= responseGoal ? 'Hedefte' : 'Altında'],
      [matchingBranches().length > 1 ? 'SLA (şube bazlı)' : `SLA (${sla()} sa)`, a.slaRate == null ? '—' : `%${Math.round(a.slaRate)}`, `Hedef %${slaGoal} · ${fmt(a.timedAnswers)} ölçüm`,
        a.slaRate == null ? '' : a.slaRate >= slaGoal ? 'ok' : 'bad', a.slaRate == null ? '' : a.slaRate >= slaGoal ? 'Hedefte' : 'Riskli'],
      ['Yanıtsız', fmt(a.pending), 'Açık yorum', a.pending > 0 ? 'warn' : ''],
      ['Hedef gerçekleşme', ratio == null ? '—' : `%${ratio}`, missingScopeData() ? 'Şube verisi eksik' : target == null ? 'Hedef girilmedi' : `${fmt(total)} / ${fmt(target)} toplam yorum`, ratio == null ? '' : ratio >= 100 ? 'ok' : 'warn']
    ];
    byId('ovKpis').innerHTML = metrics.map(([label, value, note, tone = '', badge = '']) =>
      `<div class="kpi v2-reference-kpi" data-tone="${tone}"><div class="kl">${html(label)}</div><div class="kv">${html(value)}</div><div class="kd"><span>${html(note)}</span>${badge ? `<span class="chip ${tone}">${html(badge)}</span>` : ''}</div></div>`
    ).join('');
    const needsAttention = a.pending > 0 || (a.slaRate != null && a.slaRate < slaGoal);
    byId('ovWatchlist').innerHTML = needsAttention
      ? `<div class="watch-row"><div class="info"><b>${html(analyticsName())}</b><small>SLA ${pct(a.slaRate)} · ${fmt(a.pending)} yanıtsız</small></div><button class="btn sm" onclick="switchView('reviews')">İncele →</button></div>`
      : '<div class="empty">Seçili şube ve dönemde inceleme gerektiren durum yok.</div>';
    byId('ovSla').innerHTML = `<div class="watch-row"><div class="info"><b>${html(analyticsName())}</b><small>Yorum tarihi → Google yanıt tarihi</small></div><span class="chip">${pct(a.slaRate)}</span></div><p class="v2-chart-note">${a.timedAnswers} kayıt ölçülebildi. Eksik veya geçersiz tarihler ortalamaya dahil edilmez.</p>`;
    normalizeScope();
  };
  root.initCharts = function () {
    const scoped = rows(), a = stats(scoped), keys = monthsFor(period);
    const daily = period === 'month';
    const now = Date.now();
    const points = daily ? recentDays(now) : keys;
    const targets = analyticsTargets(points.map(key => key.slice(0, 7)));
    const reviewDates = recordedReviews(now)
      .map(row => daily ? dayKey(row.createdAt) : monthKey(row.createdAt));
    const firstPoint = daily ? 0 : Math.max(0, points.findIndex((key, index) =>
      targets[index] != null || reviewDates.some(date => date <= key)));
    const comparisonKeys = points.slice(firstPoint);
    const cumulative = {
      achieved: comparisonKeys.map(key => reviewDates.filter(date => date <= key).length),
      planned: targets.slice(firstPoint)
    };
    const series = [
      { label: 'Mevcut yorum toplamı', data: cumulative.achieved, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.08)', fill: true, tension: 0, pointRadius: 5, spanGaps: false },
      { label: 'Kayıtlı hedef', data: cumulative.planned, borderColor: '#e11d48', borderDash: [7, 4], pointRadius: daily ? 0 : 5, spanGaps: false, fill: false, stepped: daily },
      { label: 'Yorum trendi', data: live().commentTrendSeries(cumulative.achieved), borderColor: '#7c3aed', borderDash: [3, 4], pointRadius: 0, fill: false }
    ];
    const observedEnd = comparisonKeys.length - 1;
    const today = dayKey(now);
    const [year, month, day] = today.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const currentMonthCount = recordedReviews(now).filter(row => monthKey(row.createdAt) === today.slice(0, 7)).length;
    const actualTotal = cumulative.achieved[observedEnd];
    const forecast = !missingScopeData() && day >= 2 && day < lastDay && actualTotal > 0
      ? actualTotal + Math.round(currentMonthCount / day * (lastDay - day)) : null;
    const forecastEnd = today.slice(0, 8) + lastDay;
    const futureDates = forecast == null ? [] : daily
      ? Array.from({ length: lastDay - day }, (_, i) => today.slice(0, 8) + String(day + i + 1).padStart(2, '0'))
      : [forecastEnd];
    const anchor = Array(observedEnd).fill(null).concat(actualTotal);
    const projected = futureDates.map((_, i) =>
      Math.round(actualTotal + (forecast - actualTotal) * (i + 1) / futureDates.length));
    if (futureDates.length) {
      series[1].data = series[1].data.concat(futureDates.map(() => currentTarget()));
    }
    series.push({ label: 'Tahmin', data: forecast == null ? [] : anchor.concat(projected),
      borderColor: '#0284c7', borderDash: [2, 4], pointRadius: 0, fill: false });
    const dailyCounts = daily ? comparisonKeys.map(key => reviewDates.filter(date => date === key).length) : [];
    const dailyLabels = {
      id: 'reviewDailyCounts',
      afterDatasetsDraw(chart) {
        if (!chart.isDatasetVisible(0)) return;
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = '10px system-ui';
        ctx.fillStyle = getComputedStyle(doc.documentElement).getPropertyValue('--ink').trim() || '#0f172a';
        ctx.textAlign = 'center';
        chart.getDatasetMeta(0).data.forEach((point, index) => {
          if (!point.skip && dailyCounts[index] != null) ctx.fillText(String(dailyCounts[index]), point.x, point.y - 8);
        });
        ctx.restore();
      }
    };
    const endpointLabels = {
      id: 'reviewTargetGap',
      afterDatasetsDraw(chart) {
        const lastIndex = observedEnd;
        const endpoints = ['Ulaşılan', 'Hedef'].map((label, index) => {
          const value = series[index].data[lastIndex];
          const point = chart.getDatasetMeta(index).data[lastIndex];
          return chart.isDatasetVisible(index) && value != null && point && !point.skip
            ? { label, value, point, color: series[index].borderColor } : null;
        });
        const [actual, target] = endpoints;
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = '600 11px system-ui';
        if (actual && target) {
          const { x, y } = actual.point;
          const difference = actual.value - target.value;
          ctx.strokeStyle = '#94a3b8';
          if (difference !== 0) {
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, target.point.y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.textAlign = 'left';
          ctx.fillStyle = difference < 0 ? target.color : '#12805c';
          ctx.fillText(difference > 0 ? '+' + fmt(difference) : fmt(difference), x + 8, (y + target.point.y) / 2 + 4);
        }
        endpoints.forEach((endpoint, index) => {
          if (!endpoint) return;
          const { x, y } = endpoint.point;
          ctx.fillStyle = endpoint.color;
          ctx.textAlign = 'right';
          const close = actual && target && Math.abs(actual.point.y - target.point.y) < 24;
          const labelY = close && index === 1 ? Math.min(chart.height - 8, y + 15) : y - 9;
          ctx.fillText(endpoint.label + ' ' + fmt(endpoint.value), x - 9, labelY);
        });
        ctx.restore();
      }
    };
    const title = byId('chartTrend')?.closest('.chart-card')?.querySelector('h3');
    if (title) title.textContent = 'Toplam yorum sayısının değişimi ve hedef';
    const legend = byId('chartTrend')?.closest('.chart-card')?.querySelector('.chart-legend');
    const seriesKeys = ['Ulaşılan', 'Hedef', 'Trend', 'Tahmin'];
    if (legend) {
      const forecastLabel = node('span', '', 'chip');
      const updateForecastLabel = () => {
        forecastLabel.textContent = forecast == null ? 'Tahmin için veri bekleniyor' : `Ay sonu tahmini ≈ ${fmt(forecast)} yorum`;
        forecastLabel.hidden = hiddenTrendSeries.has('Tahmin');
      };
      updateForecastLabel();
      legend.replaceChildren(...seriesKeys.map((label, index) => {
        const button = node('button', null, 'v2-series-toggle');
        button.type = 'button';
        const swatch = node('i');
        swatch.style.backgroundColor = series[index].borderColor;
        swatch.setAttribute('aria-hidden', 'true');
        button.append(swatch, doc.createTextNode(label));
        button.setAttribute('aria-controls', 'chartTrend');
        button.setAttribute('aria-pressed', String(!hiddenTrendSeries.has(label)));
        button.onclick = () => {
          const trendChart = charts.chartTrend;
          if (!trendChart) return;
          const visible = !trendChart.isDatasetVisible(index);
          if (visible) hiddenTrendSeries.delete(label);
          else hiddenTrendSeries.add(label);
          button.setAttribute('aria-pressed', String(visible));
          trendChart.setDatasetVisibility(index, visible);
          trendChart.update();
          updateForecastLabel();
        };
        series[index].hidden = hiddenTrendSeries.has(label);
        return button;
      }), forecastLabel);
    }
    const chartLabels = comparisonKeys.map(key => new Date(`${daily ? key : key + '-01'}T12:00:00Z`)
      .toLocaleDateString('tr-TR', daily ? { day: 'numeric', month: 'short' } : { month: 'short', year: '2-digit' }));
    chartLabels.push(...futureDates.map(key => new Date(key + 'T12:00:00Z')
      .toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })));
    chart('chartTrend', 'line', chartLabels, series, {
      layout: { padding: { top: 20, right: 54 } },
      ...(daily ? { plugins: { legend: { display: false }, tooltip: { callbacks: {
        afterBody: items => items.length ? `O gün eklenen: ${dailyCounts[items[0].dataIndex]}` : ''
      } } } } : {})
    }, daily ? [dailyLabels, endpointLabels] : [endpointLabels]);
    chartNote('chartTrend', !analyticsDemo() && (management().error || !management().loaded) ? 'Hedef kayıtları doğrulanamadı.' : targets.some(v => v != null) ? (daily ? 'Son 30 gün · Noktaların üstündeki rakamlar o gün eklenen yorum adedini gösterir.' : 'Ay sonu yorum toplamı, kayıtlı aylık hedef ve doğrusal trend.') : 'Kayıtlı hedef yok. Performans ekranından hedef girin.');
    if (forecast != null) {
      const note = byId('chartTrend')?.closest('.chart-card')?.querySelector('.v2-chart-note');
      if (note) note.textContent += ' Noktalı tahmin, bu ayın günlük ortalama yorum hızını ay sonuna taşır.';
    }
    chart('chartRating', 'doughnut', ['5★', '4★', '3★', '2★', '1★'], [{ label: 'Yıldız dağılımı', data: a.ratingCounts, backgroundColor: ['#12805c', '#6bbf9b', '#fbbf24', '#fb923c', '#b42318'], borderWidth: 2 }]);
    emptyChart('chartRating', a.count > 0, 'Seçili dönemde yorum bulunmuyor.');
    const total = currentReviewTotal(), target = currentTarget();
    const regionTitle = byId('chartRegion')?.closest('.chart-card')?.querySelector('h3'); if (regionTitle) regionTitle.textContent = 'Toplam yorum · hedef ve gerçekleşen';
    function summaryCard(canvasId, content) {
      const canvas = byId(canvasId), host = canvas?.closest('.chart-card'); if (!host) return;
      root.destroyChart(canvasId); canvas.parentElement.hidden = true;
      let block = host.querySelector('.v2-summary-card');
      if (!block) { block = node('div', null, 'v2-summary-card'); host.append(block); }
      block.innerHTML = content;
      host.querySelector('.v2-chart-note')?.remove();
    }
    const ratio = missingScopeData() ? null : progress(total, target);
    summaryCard('chartRegion', `<div class="v2-summary-line"><strong>${html(analyticsName())}</strong><span>${total} / ${target ?? '—'}</span></div><progress class="v2-goal-meter" aria-label="Toplam yorum hedefi gerçekleşmesi" max="100" value="${Math.min(100,ratio || 0)}"></progress><div class="v2-summary-line"><span>${ratio == null ? (missingScopeData() ? 'Şube verisi eksik' : 'Hedef girilmedi') : `${pct(ratio)} gerçekleşti`}</span><span>${target == null ? '—' : `Kalan ${Math.max(0,target-total)} yorum`}</span></div><p>Şube hedefi · ${html(branch()?.region || '—')} / ${html(analyticsName())}</p><button class="btn sm" onclick="switchView('performance')">Hedefi düzenle →</button>`);
    const responseTitle = byId('chartResponse')?.closest('.chart-card')?.querySelector('h3'); if (responseTitle) responseTitle.textContent = matchingBranches().length > 1 ? 'Yanıt süresi · Şube SLA’ları' : `Yanıt süresi · SLA ${sla()} sa`;
    const within = a.slaRate == null ? null : Math.round(a.slaRate*a.timedAnswers/100);
    summaryCard('chartResponse', within == null ? '<p>Yanıt süresi ölçülebilen kayıt bulunmuyor.</p>' : `<div class="v2-sla-meter" role="img" aria-label="${within} yanıt SLA içinde, ${a.timedAnswers-within} yanıt SLA dışında"><span style="flex:${within};background:#0f9d75">${within} içinde</span><span style="flex:${a.timedAnswers-within};background:#d92d20">${a.timedAnswers-within} dışında</span></div><div class="v2-summary-line"><span>${a.timedAnswers} tarihli yanıt üzerinden</span><strong>${pct(a.slaRate)} SLA içinde</strong></div><p>Süre: yorum tarihi → Google yanıt tarihi. Tarihi eksik kayıtlar dahil edilmez.</p><button class="btn sm" onclick="switchView('reviews')">Yorumları incele →</button>`);
  };

  root.renderPerformance = function () {
    const a = stats(rows()), total = currentReviewTotal(), target = currentTarget();
    const ratio = missingScopeData() ? null : progress(total, target), canSave = Boolean(analyticsScope.branch) && (!analyticsLive() || (analyticsScope.branch === branchId() && management().loaded && !management().loading && !management().error && !management().targetError));
    const head = byId('perfTable')?.closest('.card2')?.querySelector('.head'); if (head) head.classList.add('v2-performance-head');
    byId('perfTable').innerHTML = `<thead><tr><th>Şube</th><th class="n">Varılacak toplam</th><th class="n">Mevcut toplam</th><th>Hedef ilerlemesi</th><th class="n">Dönem yorumları</th><th class="n">Puan</th><th class="n">Yanıt</th><th>Ortam</th></tr></thead><tbody><tr><td>${html(analyticsName())}</td><td><div class="v2-target-editor"><input id="v2Target" aria-label="${html(analyticsName())} toplam yorum hedefi" type="number" min="1" max="10000" step="1" value="${target ?? ''}" placeholder="Şube seçin" ${canSave ? '' : 'disabled'}><button id="v2SaveTarget" class="btn sm p" ${canSave ? '' : 'disabled'}>Kaydet</button></div></td><td class="n">${total}</td><td>${ratio == null ? (missingScopeData() ? 'Şube verisi eksik' : 'Hedef girilmedi') : `<div class="v2-progress"><progress aria-label="Hedef ilerlemesi" max="100" value="${Math.min(100, ratio)}"></progress><b>${ratio}%</b></div>`}</td><td class="n">${a.count}</td><td class="n">${fmt(a.average)}</td><td class="n">${pct(a.responseRate)}</td><td><span class="chip ${analyticsLive() ? 'ok' : 'warn'}">${analyticsLive() ? 'Canlı' : 'Demo'}</span></td></tr></tbody>`;
    byId('v2SaveTarget').onclick = saveTarget;
    if (ratio == null && analyticsLive() && (management().error || !management().loaded)) {
      byId('perfTable').querySelector('tbody tr td:nth-child(4)').textContent = 'Hedef doğrulanamadı';
    }
    root.renderTargetBreakdown(); normalizeScope();
  };
  root.renderTargetBreakdown = function () {
    const host = byId('targetBreakdown'); if (!host) return;
    const target = currentTarget(), actual = currentReviewTotal(), ratio = missingScopeData() ? null : progress(actual, target);
    host.innerHTML = `<div class="v2-period-note">Toplam yorum hedefi · ${analyticsLive() ? 'Seçili şubenin canlı verisi' : 'Yalnız seçili demo şube'} · ${monthKey(Date.now())}</div><div class="v2-breakdown">${[['Bölge', branch()?.region || '—'], ['İl', branch()?.city || '—'], ['Şube', analyticsName()]].map(([label, value]) => `<div class="card"><h4>${label}</h4><b>${html(value)}</b><span class="v2-big">${ratio == null ? '—' : `${ratio}%`}</span><progress aria-label="${label} hedef ilerlemesi" max="100" value="${Math.min(100, ratio || 0)}"></progress><p>${actual} yorum / ${target ?? '—'} hedef · ${analyticsLive() ? 'Canlı' : 'Demo'}</p></div>`).join('')}</div>`;
  };
  async function saveTarget() {
    const value = Number(byId('v2Target')?.value), button = byId('v2SaveTarget');
    if (!Number.isInteger(value) || value < 1 || value > 10000) return root.toast('Hedef 1–10000 arasında tam sayı olmalı.', 'warn');
    button.disabled = true;
    if (branchSelect) branchSelect.disabled = true;
    periodSelect.disabled = true;
    try {
      if (!analyticsScope.branch) throw new Error('Hedef kaydetmek için şube seçin.');
      if (analyticsLive()) {
        if (analyticsScope.branch !== branchId()) throw new Error('Şube verisi henüz yüklenmedi.');
        await root.OTOTRReviewManagement.saveTarget(value);
        if (currentTarget() !== value) throw new Error('Hedef kaydı doğrulanamadı; bağlantıyı yenileyin.');
      } else {
        demoTargets.set(analyticsScope.branch,value);
        localStorage.setItem('ototr.regional-demo.target.'+analyticsScope.branch,String(value));
      }
      root.renderPerformance(); root.toast(`${analyticsName()} ${analyticsLive() ? 'ERP' : 'demo'} hedefi kaydedildi.`, 'ok');
    } catch (error) { root.toast(error.message || 'Hedef kaydedilemedi.', 'warn'); }
    finally {
      if (button.isConnected) button.disabled = false;
      if (branchSelect) branchSelect.disabled = false;
      periodSelect.disabled = false;
    }
  }
  root.exportPerformance = function () {
    const a = stats(rows());
    root.downloadCSV('ototr-yorum-sayfasi-2-performans.csv', [
      ['Şube', 'Ortam', 'Dönem', 'Dönem yorumları', 'Mevcut toplam', 'Varılacak toplam', 'Puan', 'Yanıt %', 'SLA %'],
      [analyticsName(), analyticsLive() ? 'Canlı' : 'Demo', PERIODS[period], a.count, currentReviewTotal(), currentTarget() ?? '', a.average ?? '', a.responseRate ?? '', a.slaRate ?? '']
    ]);
  };
  function openRegionalDemo(id) {
    const b = regionalDemos.find(item => item.id === id);
    if (!b) return;
    Object.assign(analyticsScope,{mode:'demo',region:b.region,city:b.city,branch:b.id});
    root.switchView('performance');
  }
  root.OTOTRReviewAlternative = { ...pure, regionalDemos: () => regionalDemos.map(b=>({...b})), openRegionalDemo, getPeriod: () => period, scopedRows: operationalRows, filteredRows: rows };
  STATE.view = 'overview';
  root.switchView('overview');
})(typeof window === 'undefined' ? null : window);
