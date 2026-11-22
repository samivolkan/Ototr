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
      return {branchId:b.id,store:b.name,author:'Demo müşteri '+(n+1),demo:true,createdAt,stars:n%8===0?3:5,status:answered?'gonderildi':'bekliyor',
        replyDate:answered?new Date(Date.parse(createdAt)+(n%16+1)*3600000).toISOString():null};
    });
  }
  let parentReviews;
  try { if (root.parent !== root && root.parent.location.origin === root.location.origin) parentReviews = root.parent.OTOTRGoogleReputation; } catch (_) {}
  function cachedReviews(b) {
    if (b.id === branchId() && isLive()) return scopedRows(REVIEWS,b.id);
    return (parentReviews?.fetchGoogleReviews?.(b.id) || []).map(r => ({
      branchId:b.id,store:b.name,author:r.reviewerName,text:r.comment,createdAt:r.reviewDate,stars:r.rating,status:r.isReplied?'gonderildi':'bekliyor',isReplied:r.isReplied,replyDate:r.replyDate || r.replyUpdatedAt
    }));
  }
  const scopedTargetCache = new Map();
  const demoRatingTargets = new Map();
  const liveGoalRecords = new Map();
  const liveApprovedGoals = new Map();
  let approvedGoalsRequest;
  function syncApprovedGoals() {
    if (!approvedGoalsRequest) {
      approvedGoalsRequest = managementApi.request('goal_plan_list',{path:[],month:monthKey(Date.now())}).then(list=>{
        liveApprovedGoals.clear();
        for (const row of list.items || []) liveApprovedGoals.set(liveGoalKey(row.month.slice(0,7),JSON.parse(row.scope_key)),row.approved);
      });
    }
    return approvedGoalsRequest;
  }
  const liveGoalKey = (month,path) => JSON.stringify([month,...path]);
  const liveGoal = (month,path) => liveApprovedGoals.get(liveGoalKey(month,path));
  const goalStorageKey = 'ototr.review.demo-goal-workflow.v1';
  let goalMonth = monthKey(Date.now());
  const goalLevels = ['GM', 'Bölge', 'Şehir', 'Şube'];
  function goalPath() {
    const {region,city,branch} = analyticsScope;
    const unit = matchingBranches()[0];
    if (branch && unit) return [unit.region,unit.city,unit.id];
    if (city && unit) return [unit.region,unit.city];
    return region ? [region] : [];
  }
  const goalKey = (month, path) => JSON.stringify([month, ...path]);
  function demoGoals() {
    try { return JSON.parse(localStorage.getItem(goalStorageKey) || '{}'); }
    catch (_) { return {}; }
  }
  function directDemoGoal(month, path = goalPath()) {
    return demoGoals()[goalKey(month, path)]?.approved;
  }
  function demoGoalTotals(month) {
    const goals = matchingBranches().map(b => directDemoGoal(month, [b.region, b.city, b.id]));
    const complete = goals.every(Boolean) && goals.length > 0;
    const count = goals.filter(Boolean).length;
    const target = goals.reduce((sum,g) => sum + (g?.total || 0), 0);
    return {complete, count, target,
      rating: target ? goals.reduce((sum,g) => sum + (g ? g.total * g.rating : 0), 0) / target : null};
  }
  function currentRatingTarget() {
    const month = monthKey(Date.now());
    if (analyticsDemo()) {
      const direct = directDemoGoal(month);
      if (direct) return direct.rating;
      const totals = demoGoalTotals(month);
      if (totals.complete) return Math.round(totals.rating * 100) / 100;
    }
    const direct = !analyticsDemo() && liveGoal(month,goalPath());
    if (direct) return direct.rating;
    const values = matchingBranches().map(b => {
      if (analyticsDemo()) {
        const approved = directDemoGoal(month,[b.region,b.city,b.id]);
        if (approved) return approved.rating;
        if (demoRatingTargets.has(b.id)) return demoRatingTargets.get(b.id);
        let saved;
        try { saved = localStorage.getItem('ototr.regional-demo.rating.' + b.id); } catch (_) {}
        return saved === 'null' ? null : saved == null ? 4.7 : Number(saved);
      }
      const targets = b.id === branchId() ? management().targets || [] : scopedTargetCache.get(b.id) || [];
      return liveGoal(month,[b.region,b.city,b.id])?.rating ?? targets.find(row => row.branch_id === b.id && String(row.month).slice(0,7) === month)?.rating_target;
    });
    return values.length && values.every(value => value != null && Number(value) >= 1 && Number(value) <= 5)
      ? Math.round(values.reduce((sum,value)=>sum+Number(value),0)/values.length*100)/100 : null;
  }
  function scopedGoalTarget(month, path, branches) {
    const approvedGoal = analyticsDemo() ? directDemoGoal : liveGoal;
    const direct = approvedGoal(month,path);
    if (direct) return direct.total;
    const values = branches.map(b => approvedGoal(month,[b.region,b.city,b.id])?.total ??
      (analyticsDemo() ? (demoTargets.get(b.id) || b.target) :
        targetSeries([month],b.id===branchId() ? management().targets || [] : scopedTargetCache.get(b.id) || [],b.id)[0]));
    return values.length && values.every(value=>value!=null) ? values.reduce((sum,value)=>sum+value,0) : null;
  }
  function analyticsTargets(months) {
    if (!analyticsActive()) return targetSeries(months,management().targets || [],branchId(),branch()?.target);
    return months.map(month=>scopedGoalTarget(month,goalPath(),matchingBranches()));
  }
  const operationalRows = () => scopedRows(typeof REVIEWS === 'undefined' ? [] : REVIEWS, branchId());
  const allRows = () => analyticsActive() ? matchingBranches().flatMap(analyticsDemo() ? regionalDemoRows : cachedReviews) : operationalRows();
  let period = 'month';
  let dateRange = null;
  let reviewDay = null;
  const rows = () => dateRange ? recordedReviews().filter(row => {
    const day = dayKey(row.createdAt);
    return day >= dateRange.start && day <= dateRange.end;
  }) : periodRows(allRows(), period);
  const dateKeys = ({start, end}) => Array.from(
    {length: (Date.parse(end) - Date.parse(start)) / 86400000 + 1},
    (_, index) => new Date(Date.parse(start) + index * 86400000).toISOString().slice(0, 10)
  );
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
  const overviewPeriodButtons = byId('overviewPeriodButtons');
  for (const [value,label] of Object.entries({month:'Bu ay',quarter:'3 ay',ytd:'Yıl başı',year:'12 ay'})) {
    const button = node('button',label);
    button.type = 'button';
    button.dataset.period = value;
    button.setAttribute('aria-label',PERIODS[value]);
    button.setAttribute('aria-controls','chartTrend');
    button.onclick = () => {
      if (period===value) return;
      periodSelect.value = value;
      periodSelect.dispatchEvent(new Event('change',{bubbles:true}));
    };
    overviewPeriodButtons?.append(button);
  }
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
  const reviewDayChip = node('button', null, 'btn sm');
  reviewDayChip.type = 'button';
  reviewDayChip.hidden = true;
  reviewDayChip.onclick = () => {
    reviewDay = null;
    SELECTED.clear();
    SEL = null;
    root.switchView('reviews');
  };
  reviewToolbar?.append(reviewDayChip);
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
  const rangeForm = node('form', null, 'review-date-range');
  rangeForm.innerHTML = '<label>Başlangıç <input name="start" type="date" required></label><label>Bitiş <input name="end" type="date" required></label><button class="btn sm" type="submit">Tarihi uygula</button>';
  const filterChips = node('div', null, 'review-filter-chips');
  const searchField = node('input');
  searchField.type = 'search';
  searchField.placeholder = 'Seçeneklerde ara';
  searchField.setAttribute('aria-label', searchField.placeholder);
  rangeForm.onsubmit = event => {
    event.preventDefault();
    const { start, end } = rangeForm.elements;
    if (start.value > end.value || Date.parse(end.value) - Date.parse(start.value) >= 366 * 86400000 || end.value > dayKey(new Date())) {
      root.toast('Geçmişten bugüne en fazla 366 günlük bir aralık seçin.', 'warn');
      return;
    }
    dateRange = {start: start.value, end: end.value};
    root.switchView(STATE.view);
  };
  searchField.oninput = () => updateHierarchy();
  hierarchy.append(searchField, filterChips);
  function renderFilterChips() {
    filterChips.replaceChildren();
    for (const key of ['region','city','branch','date']) {
      const value = key === 'date' ? dateRange && dateRange.start + ' – ' + dateRange.end :
        analyticsScope[key] && levelSelects[key].selectedOptions[0]?.textContent;
      if (!value) continue;
      const chip = node('button', value + ' ×', 'btn sm');
      chip.type = 'button';
      chip.setAttribute('aria-label', value + ' filtresini kaldır');
      chip.onclick = () => {
        if (key === 'date') { dateRange = null; rangeForm.reset(); }
        else { levelSelects[key].value = ''; levelSelects[key].onchange(); return; }
        root.switchView(STATE.view);
      };
      filterChips.append(chip);
    }
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
    const query = searchField.value.trim().toLocaleLowerCase('tr-TR');
    for (const [key,select] of Object.entries(levelSelects)) {
      const options = choices[key].filter(([id, label]) => key === 'mode' || !id || id === analyticsScope[key] || label.toLocaleLowerCase('tr-TR').includes(query));
      select.replaceChildren(...options.map(([id,label])=>{const option=node('option',label);option.value=id;return option;}));
      select.value=analyticsScope[key];
    }
    renderFilterChips();
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
      environment.textContent = matchingBranches().length + (analyticsDemo() ? ' demo şube' : ' canlı şube');
      loadScopeTargets();
    }
    reviewStatus.hidden = !reviewView;
    reviewDayChip.hidden = !reviewView || !reviewDay;
    if (reviewDay) reviewDayChip.textContent = reviewDay.label + ' · ' + reviewDay.scope + ' ×';
    if (branchSelect) branchSelect.hidden = Boolean(reviewView && reviewDay);
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
    period = periodSelect.value; dateRange = null; rangeForm.reset(); SELECTED.clear(); SEL = null; root.switchView(STATE.view);
  });
  const roleAllows = row => STATE.role === 'legal' ? row.pipeline?.routedTo === 'legal' || row.status === 'hukuk' : STATE.role === 'complaint' ? row.pipeline?.routedTo === 'complaint' : true;
  root.roleReviews = () => {
    if (STATE.view === 'reviews' && reviewDay) {
      const source = reviewDay.operational ? operationalRows() : reviewDay.records;
      return source.filter(row => monthKey(row.createdAt) && dayKey(row.createdAt) === reviewDay.day && roleAllows(row));
    }
    return rows().filter(roleAllows);
  };
  const normalRenderReviews = root.renderReviews;
  root.renderReviews = function (...args) {
    if (!reviewDay || reviewDay.operational) return normalRenderReviews.apply(this,args);
    const rows = searchedReviews();
    renderReviewStatusFilters(rows);
    const filtered = rows.filter(row => matchesReviewStatus(row, RV_FILTER));
    if (RV_SORT === "rating") filtered.sort((a,b) => a.stars - b.stars);
    else if (RV_SORT === "risk") filtered.sort((a,b) => (b.risk || 0) - (a.risk || 0));
    else filtered.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    byId('rvCount').textContent = filtered.length;
    const list = byId('rvList');
    const detail = byId('rvDetail');
    const showDetail = review => {
      detail.replaceChildren(node('h4', review.author || 'Google kullanıcısı'),
        node('p', review.store + ' · ' + review.stars + ' ★'),
        node('p', review.text || (review.demo ? 'Demo kaydı' : 'Yorum metni yok')));
      if (matchMedia('(max-width:700px)').matches) {
        const drawer = byId('reviewMobileDialog');
        drawer.append(detail);
        if (!drawer.open) drawer.showModal();
      }
    };
    list.replaceChildren(...filtered.map(review => {
      const row = node('button', null, 'review-day-row');
      row.type = 'button';
      row.setAttribute('aria-pressed','false');
      const heading = node('span', null, 'review-day-heading');
      heading.append(node('strong', review.author || 'Google kullanıcısı'),
        node('span', review.stars == null ? '—' : review.stars + ' ★', 'review-day-rating'));
      row.append(heading, node('span', review.store, 'review-day-branch'));
      const preview = review.text || (review.demo ? 'Demo kaydı' : '');
      if (preview) row.append(node('span', preview, 'review-day-preview'));
      row.onclick = () => {
        list.querySelector('[aria-pressed="true"]')?.setAttribute('aria-pressed','false');
        row.setAttribute('aria-pressed','true');
        showDetail(review);
      };
      return row;
    }));
    if (!filtered.length) list.append(node('p','Bu gün ve kapsam için yorum bulunamadı.','empty'));
    detail.replaceChildren(node('p','Detay için bir yorum seçin.','empty'));
  };
  const originalSwitch = root.switchView;
  root.switchView = function (...args) {
    if (args[0] !== 'reviews') reviewDay = null;
    const result = originalSwitch.apply(this, args); normalizeScope(); return result;
  };

  const hiddenTrendSeries = new Set();
  const chartSnapshots = new WeakMap();
  function chart(id, type, labels, datasets, extra = {}, chartPlugins = []) {
    const canvas = byId(id);
    if (!canvas || typeof Chart === 'undefined') return;
    const color = getComputedStyle(doc.documentElement).getPropertyValue('--mute').trim();
    const line = getComputedStyle(doc.documentElement).getPropertyValue('--line').trim();
    const newDesign = doc.documentElement.dataset.reviewDesign !== 'classic';
    const snapshot = JSON.stringify({ type, labels, datasets, color, line, newDesign });
    const existing = charts[id];
    if (existing?.canvas === canvas && chartSnapshots.get(existing) === snapshot) return;
    root.destroyChart(id);
    const reducedMotion = root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${labels.join(', ')}. ${datasets.map(d => `${d.label}: ${d.data.map(v => v == null ? 'kayıt yok' : v).join(', ')}`).join('. ')}`);
    const plugins = { legend: { display: type === 'doughnut' && (id !== 'chartRating' || !newDesign), position: 'right', labels: { color, boxWidth: 9, padding: 12 } } };
    charts[id] = new Chart(canvas, { type, plugins: id === 'chartRating' ? [{ id:'reviewTotal', afterDraw(c) {
      const arc=c.getDatasetMeta(0)?.data?.[0]; if(!arc)return;
      const total=datasets[0].data.reduce((sum,value)=>sum+Number(value||0),0),ctx=c.ctx;
      ctx.save();ctx.textAlign='center';ctx.fillStyle=getComputedStyle(doc.documentElement).getPropertyValue('--ink').trim()||'#0f172a';ctx.font='700 28px system-ui';ctx.fillText(String(total),arc.x,arc.y);ctx.fillStyle=color;ctx.font='12px system-ui';ctx.fillText('yorum',arc.x,arc.y+22);ctx.restore();
    }}] : chartPlugins, data: { labels, datasets }, options: {
      responsive: true, maintainAspectRatio: false,
      animation: reducedMotion || id.startsWith('v2Mini') ? false : { duration: 550, easing: 'easeOutQuart' },
      plugins, ...(type === 'doughnut' ? { cutout: '68%', ...(id === 'chartRating' && newDesign ? { rotation: -132, circumference: 264, borderRadius: 6 } : {}) } : { scales: { x: { grid: { display: false }, ticks: { color } }, y: { beginAtZero: true, grid: { color: line }, ticks: { color, precision: 0 } } } }), ...extra
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
  function renderBranchRanking(scoped) {
    const host = byId('ovTopBranches');
    if (!host) return;
    const counts = new Map();
    for (const row of scoped) {
      const id = row.branchId || row.branch_id;
      counts.set(id,(counts.get(id) || 0)+1);
    }
    const ranked = matchingBranches().map(branch => ({branch,count:counts.get(branch.id) || 0}))
      .filter(item => item.count > 0)
      .sort((a,b) => b.count-a.count || a.branch.name.localeCompare(b.branch.name,'tr'))
      .slice(0,5);
    byId('ovTopBranchesNote').textContent = `${analyticsName()} · ${PERIODS[period]} · ${analyticsDemo()?'Demo':'Canlı'} kapsamındaki pay`;
    const demoRanking = byId('ovDemoRanking');
    if (demoRanking) { demoRanking.hidden = analyticsDemo(); demoRanking.onclick = openDemoRanking; }
    host.replaceChildren(...ranked.map(({branch,count}, index) => {
      const share = Math.round(count/scoped.length*100);
      const button = node('button',null,'v2-rank-row');
      button.type = 'button';
      button.setAttribute('aria-label', `${branch.name} · ${count} yorum · %${share} pay. Şubeyi göster`);
      const name = node('strong',branch.id===BRANCH_IDS[0]?'Bursa Nilüfer':branch.name);
      const rank = node('span',String(index+1),'v2-rank-number');
      rank.setAttribute('aria-hidden','true');
      name.prepend(rank);
      const track = node('span',null,'v2-rank-track');
      const fill = node('span');
      fill.style.width = (count/ranked[0].count*100)+'%';
      track.append(fill);
      track.setAttribute('aria-hidden','true');
      button.append(name,track,node('b',fmt(count)),node('small','%'+share));
      button.onclick = () => {
        analyticsScope.region = branch.region;
        analyticsScope.city = branch.city;
        analyticsScope.branch = branch.id;
        if (!analyticsDemo()) {
          live().setScope(branch.id === BRANCH_IDS[0] ? 'live' : branch.id);
          managementApi?.refresh().catch(() => {});
        }
        root.switchView('overview');
      };
      return button;
    }));
    if (!ranked.length) host.append(node('p','Seçili dönemde sıralamaya girecek yorum yok.','empty'));
  }

  function dailyActivity(days, groups) {
    const daily = days.map(day => {
      const counts = [0,0,0,0];
      for (const review of groups.get(day) || []) {
        const rating = Number(review.stars);
        const group = rating === 4 || rating === 5 ? 0 : rating === 3 ? 1 : rating === 1 || rating === 2 ? 2 : 3;
        counts[group]++;
      }
      return counts;
    });
    const dateLabel = day => new Date(day + 'T12:00:00Z').toLocaleDateString('tr-TR', {day:'numeric',month:'short',timeZone:'UTC'});
    const chart = node('div', null, 'review-daily');
    chart.append(node('h4', 'Günlük yorum dağılımı'));
    const labels = ['4–5 yıldız','3 yıldız','1–2 yıldız','Puan yok'];
    const legend = node('div', null, 'review-daily-legend');
    labels.forEach((label, index) => {
      if (index === 3 && !daily.some(counts => counts[index])) return;
      const item = node('span', label);
      item.dataset.ratingGroup = index;
      legend.append(item);
    });
    const plot = node('div', null, 'review-daily-plot');
    const peak = Math.max(1, ...daily.map(counts => counts.reduce((a,b) => a+b,0)));
    plot.style.setProperty('--days', days.length);
    daily.forEach((counts, index) => {
      const day = days[index];
      const column = node('div', null, 'review-daily-column');
      const total = counts.reduce((a,b) => a+b,0);
      column.dataset.date = day;
      const description = dateLabel(day) + ' · ' + total + ' yorum' + counts.map((count,index) =>
        count ? ' · ' + labels[index] + ': ' + count : '').join('');
      column.title = description;
      column.setAttribute('role','img');
      column.setAttribute('aria-label',description);
      const bar = node('div', null, 'review-daily-bar');
      bar.style.height = (100 * total / peak) + '%';
      counts.forEach((count,index) => {
        if (!count) return;
        const segment = node('span');
        segment.dataset.ratingGroup = index;
        segment.style.flexGrow = count;
        bar.append(segment);
      });
      column.append(bar);
      plot.append(column);
    });
    const axis = node('div', null, 'review-daily-axis');
    for (const index of new Set([0, Math.floor(days.length / 2), days.length - 1])) axis.append(node('span',dateLabel(days[index])));
    chart.append(legend,plot,axis,node('p','Türkiye saati · En yoğun günde ' + Math.max(0, ...daily.map(counts => counts.reduce((a,b) => a+b,0))) + ' yorum','v2-chart-note'));
    return chart;
  }
  function renderActivity(scoped) {
    const host = byId('reviewActivity');
    if (!host) return;
    const today = dayKey(Date.now());
    const start = period === 'month' ? today.slice(0,7) + '-01' : monthsFor(period)[0] + '-01';
    const days = dateKeys(dateRange || {start, end:today}).slice(-84);
    const groups = new Map();
    for (const row of scoped) {
      if (!monthKey(row.createdAt)) continue;
      const day = dayKey(row.createdAt);
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(row);
    }
    const summary = node('p', days[0] + ' – ' + days.at(-1) + ' · ' + [...groups.entries()].filter(([day]) => day >= days[0] && day <= days.at(-1)).length + ' etkin gün', 'v2-chart-note');
    const grid = node('div', null, 'review-heat-grid');
    const dailyChart = dailyActivity(days, groups);
    const weekdays = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
    for (const day of weekdays) grid.append(node('span', day, 'review-heat-weekday'));
    const firstWeekday = (new Date(days[0] + 'T12:00:00Z').getUTCDay() + 6) % 7;
    for (let i = 0; i < firstWeekday; i++) grid.append(node('span'));
    for (const day of days) {
      const records = groups.get(day) || [];
      const label = new Date(day + 'T12:00:00Z').toLocaleDateString('tr-TR', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
      const cell = node('button', String(Number(day.slice(-2))), 'review-heat-day');
      cell.type = 'button';
      cell.dataset.level = Math.min(records.length, 4);
      cell.title = label + ' · ' + records.length + ' yorum';
      cell.setAttribute('aria-label', cell.title);
      cell.onclick = () => {
        const branches = matchingBranches();
        reviewDay = {
          day, label, scope: analyticsName(), records,
          operational: !analyticsDemo() && branches.length === 1 && branches[0].id === branchId(),
        };
        RV_SEARCH = '';
        if (byId('rvSearch')) byId('rvSearch').value = '';
        RV_FILTER = 'hepsi';
        byId('rvFilter').value = 'hepsi';
        SELECTED.clear();
        SEL = null;
        root.switchView('reviews');
        reviewDayChip.focus();
      };
      grid.append(cell);
    }
    const layout = node('div', null, 'review-activity-layout');
    const calendar = node('div');
    calendar.append(summary, grid);
    layout.append(calendar, dailyChart);
    host.replaceChildren(layout);
  }
  function renderWeeklyReviews(scoped) {
    const toUtcDay = key => Date.parse(key+'T00:00:00Z');
    const dayMs = 86400000;
    const mondayOf = key => {
      const day = toUtcDay(key);
      return day - ((new Date(day).getUTCDay()+6)%7)*dayMs;
    };
    const thisMonday = mondayOf(dateRange?.end || dayKey(Date.now()));
    const weekCount = dateRange ? Math.round((thisMonday - mondayOf(dateRange.start)) / (7 * dayMs)) + 1 : period === 'month' ? 5 : 12;
    const weeks = Array.from({length:weekCount},(_,i) => ({
      start:thisMonday-(weekCount-1-i)*7*dayMs, answered:0, pending:0
    }));
    const byWeek = new Map(weeks.map(week=>[week.start,week]));
    for (const row of scoped) {
      if (!monthKey(row.createdAt)) continue;
      const week = byWeek.get(mondayOf(dayKey(row.createdAt)));
      if (week) week[row.isReplied === true || row.status === 'gonderildi' ? 'answered' : 'pending']++;
    }
    const color = getComputedStyle(doc.documentElement).getPropertyValue('--mute').trim();
    chart('chartWeeklyReviews','bar',weeks.map(week=>new Date(week.start).toLocaleDateString('tr-TR',{day:'numeric',month:'short',timeZone:'UTC'})),[
      {label:'Yanıtlı',data:weeks.map(week=>week.answered),backgroundColor:'#ee4934',borderRadius:4,maxBarThickness:27},
      {label:'Yanıtsız',data:weeks.map(week=>week.pending),backgroundColor:'#f9a87e',borderRadius:4,maxBarThickness:27}
    ],{interaction:{mode:'index',intersect:false},scales:{
      x:{stacked:true,grid:{display:false},ticks:{color,maxTicksLimit:8}},
      y:{stacked:true,beginAtZero:true,ticks:{color,precision:0}}
    },plugins:{legend:{display:true,align:'start',labels:{color,boxWidth:9}}}});
    emptyChart('chartWeeklyReviews',weeks.some(w=>w.answered || w.pending),'Bu haftalarda yorum bulunmuyor.');
    chartNote('chartWeeklyReviews',`Son ${weeks.length} hafta · Yalnız seçili dönemde alınan yorumlar.`);
  }
  let overviewDemoActive = false;
  let overviewDemoTimer;
  let overviewDemoNotice;
  function showOverviewDemoNotice() {
    const demo = analyticsDemo();
    if (overviewDemoActive!==demo) {
      overviewDemoActive = demo;
      clearTimeout(overviewDemoTimer);
      overviewDemoNotice?.remove();
      overviewDemoNotice = null;
      if (demo) {
        const notice = overviewDemoNotice = node('div','','alert warn overview-demo-notice');
        notice.setAttribute('role','status');
        byId('view-overview').prepend(notice);
        overviewDemoTimer = setTimeout(()=>{
          if (matchMedia('(prefers-reduced-motion: reduce)').matches) notice.remove();
          else notice.animate([{opacity:1},{opacity:0}],{duration:420,easing:'ease-out',fill:'forwards'}).finished.then(()=>notice.remove());
        },5000);
      }
    }
    if (overviewDemoNotice?.isConnected) overviewDemoNotice.textContent = analyticsName()+' · Demo çalışma alanı. Yapılan denemeler Google’a gönderilmez.';
  }
  root.renderOverview = function () {
    showOverviewDemoNotice();
    overviewPeriodButtons?.querySelectorAll('button').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.period===period));
    });
    if (!analyticsDemo() && !approvedGoalsRequest) syncApprovedGoals().then(()=>{
      if (STATE.view==='overview' && !analyticsDemo()) {root.renderOverview();root.initCharts();}
    }).catch(()=>{});
    const scoped = rows();
    const a = stats(scoped);
    renderBranchRanking(scoped);
    const connection = management().error ? 'Canlı yönetim bağlantısı alınamadı; Bağlantı durumu ekranını kontrol edin.' : !management().loaded ? 'Canlı kayıtlar için ERP oturumu bekleniyor.' : `${html(analyticsName())} · Google kayıtları ve ERP onay akışı. Kurulum ve test şubeleri hesaplamaya dahil edilmez.`;
    byId('ovAlerts').innerHTML = `<div class="alert ${analyticsLive() && management().loaded && !management().error ? 'info' : 'warn'}">${connection}</div>`;
    if (!analyticsLive()) byId('ovAlerts').replaceChildren();
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
    const ratingTarget = currentRatingTarget();
    const ratingCount = a.ratingCounts.reduce((sum, count) => sum + count, 0);
    const metrics = [
      ['Yorum hacmi', fmt(a.count), PERIODS[period]],
      ['Ortalama puan', a.average == null ? '—' : `${a.average.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ★`, ratingTarget == null ? `${fmt(ratingCount)} puanlı yorum` : `Hedef ${fmt(ratingTarget)} ★`, a.average == null ? '' : 'ok'],
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
    const goalSlot = byId('overviewGoalSlot');
    if (doc.documentElement.dataset.reviewDesign==='new' && goalSlot) renderGoalCard(goalSlot,total,target,ratio);
    const attention = matchingBranches().map(b => {
      const branchRows = scoped.filter(r => (r.branchId || r.branch_id) === b.id);
      const summary = live().aggregateReviews(branchRows,{slaHours:analyticsDemo()?24:b.id===branchId()?sla():Number(b.sla_hours)||24});
      return {branch:b,...summary};
    }).filter(b=>b.pending>0 || (b.slaRate!=null && b.slaRate<slaGoal))
      .sort((a,b)=>b.overdue-a.overdue || b.pending-a.pending || (a.slaRate??100)-(b.slaRate??100));
    byId('ovWatchlist').innerHTML = attention.slice(0,4).map(b =>
      `<div class="watch-row"><div class="info"><b>${html(b.branch.name)}</b><small>SLA ${pct(b.slaRate)} · ${fmt(b.pending)} yanıtsız</small></div><span class="chip ${b.overdue?'bad':'warn'}">${b.overdue ? 'SLA aşımı' : 'İncele'}</span></div>`
    ).join('') || '<div class="empty">Seçili kapsamda dikkat gerektiren şube yok.</div>';
    byId('ovSla').innerHTML = `<div class="watch-row"><div class="info"><b>${html(analyticsName())}</b><small>Yorum tarihi → Google yanıt tarihi</small></div><span class="chip">${pct(a.slaRate)}</span></div><p class="v2-chart-note">${a.timedAnswers} kayıt ölçülebildi. Eksik veya geçersiz tarihler ortalamaya dahil edilmez.</p>`;
    normalizeScope();
  };
  root.initCharts = function () {
    const scoped = rows(), a = stats(scoped), keys = monthsFor(period);
    renderWeeklyReviews(scoped);
    renderActivity(scoped);
    const daily = Boolean(dateRange) || period === 'month';
    const now = Date.now();
    const points = dateRange ? dateKeys(dateRange) : daily ? recentDays(now) : keys;
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
    const teal = doc.documentElement.dataset.reviewDesign === 'new';
    const series = [
      { label: 'Mevcut yorum toplamı', data: cumulative.achieved, borderColor: teal ? '#087e72' : '#2563eb', backgroundColor: teal ? 'rgba(8,126,114,.10)' : 'rgba(37,99,235,.08)', fill: true, tension: 0, pointRadius: 5, spanGaps: false },
      { label: 'Kayıtlı hedef', data: cumulative.planned, borderColor: '#e11d48', borderDash: [7, 4], pointRadius: daily ? 0 : 5, spanGaps: false, fill: false, stepped: daily },
      { label: 'Yorum trendi', data: live().commentTrendSeries(cumulative.achieved), borderColor: '#7c3aed', borderDash: [3, 4], pointRadius: 0, fill: false }
    ];
    const observedEnd = comparisonKeys.length - 1;
    const today = dayKey(now);
    const [year, month, day] = today.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const currentMonthCount = recordedReviews(now).filter(row => monthKey(row.createdAt) === today.slice(0, 7)).length;
    const actualTotal = cumulative.achieved[observedEnd];
    const forecast = !dateRange && !missingScopeData() && day >= 2 && day < lastDay && actualTotal > 0
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
      borderColor: teal ? '#a85d16' : '#0284c7', borderDash: [2, 4], pointRadius: 0, fill: false });
    const dailyCounts = daily ? comparisonKeys.map(key => reviewDates.filter(date => date === key).length) : [];
    const dailyBarIndex = series.length;
    if (daily) series.push({
      type:'bar', label:'Günlük yorum', data:dailyCounts, yAxisID:'dailyVolume',
      backgroundColor:teal ? 'transparent' : 'rgba(100,116,139,.32)', hoverBackgroundColor:teal ? 'transparent' : '#2563eb',
      borderRadius:4, maxBarThickness:14, order:3
    });
    const dailyDots = {
      id: 'reviewDailyDots',
      beforeDatasetsDraw(chart) {
        if (!teal || !chart.isDatasetVisible(dailyBarIndex)) return;
        const ctx = chart.ctx;
        ctx.save();
        ctx.fillStyle = '#30a596';
        for (const [index, bar] of chart.getDatasetMeta(dailyBarIndex).data.entries()) {
          if (bar.skip || !dailyCounts[index]) continue;
          const height = bar.base - bar.y;
          const radius = Math.min(2.5, bar.width / 3, height / 2);
          if (!(radius > 0)) continue;
          ctx.beginPath();
          for (let y = bar.y + radius; y <= bar.base - radius; y += radius * 3 + 1) {
            ctx.moveTo(bar.x + radius, y);
            ctx.arc(bar.x, y, radius, 0, Math.PI * 2);
          }
          ctx.fill();
        }
        ctx.restore();
      }
    };
    const dailyLabels = {
      id: 'reviewDailyCounts',
      afterDatasetsDraw(chart) {
        if (!chart.isDatasetVisible(dailyBarIndex)) return;
        const ctx = chart.ctx;
        ctx.save();
        ctx.font = '10px system-ui';
        ctx.fillStyle = getComputedStyle(doc.documentElement).getPropertyValue('--ink').trim() || '#0f172a';
        ctx.textAlign = 'center';
        let lastLabelX = -Infinity;
        chart.getDatasetMeta(dailyBarIndex).data.forEach((point, index) => {
          if (point.skip || dailyCounts[index] <= 0 || (teal && point.x - lastLabelX < 15)) return;
          ctx.fillText(String(dailyCounts[index]), point.x, point.y - 8);
          lastLabelX = point.x;
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
          const gapLabel = difference > 0 ? '+' + fmt(difference) : fmt(difference);
          ctx.fillText(gapLabel,Math.min(x+8,chart.width-ctx.measureText(gapLabel).width-3),(y+target.point.y)/2+4);
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
    const seriesKeys = ['Ulaşılan', 'Hedef', 'Trend', 'Tahmin', ...(daily ? ['Günlük yorum'] : [])];
    if (legend) {
      const forecastLabel = node('span', '', 'chip');
      const updateForecastLabel = () => {
        forecastLabel.textContent = dateRange ? 'Özel tarih aralığı' : forecast == null ? 'Tahmin için veri bekleniyor' : `Ay sonu tahmini ≈ ${fmt(forecast)} yorum`;
        forecastLabel.hidden = hiddenTrendSeries.has('Tahmin');
      };
      updateForecastLabel();
      legend.replaceChildren(...seriesKeys.map((label, index) => {
        const button = node('button', null, 'v2-series-toggle');
        button.type = 'button';
        const swatch = node('i');
        swatch.style.backgroundColor = series[index].borderColor || (teal && index === dailyBarIndex ? '#30a596' : series[index].hoverBackgroundColor);
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
          if (daily) trendChart.options.scales.dailyVolume.display = trendChart.isDatasetVisible(dailyBarIndex);
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
    const axisColor = getComputedStyle(doc.documentElement).getPropertyValue('--mute').trim();
    chart('chartTrend', 'line', chartLabels, series, {
      layout:{padding:doc.documentElement.dataset.reviewDesign==='new' ? {top:12,right:3} : {top:20,right:48}},
      interaction:{mode:'index',intersect:false},
      scales:{
        x:{grid:{display:false},ticks:{color:axisColor,maxTicksLimit:12}},
        y:{beginAtZero:true,ticks:{color:axisColor,precision:0}},
        ...(daily ? {dailyVolume:{type:'linear',position:'right',beginAtZero:true,
          display:!hiddenTrendSeries.has('Günlük yorum'),
          suggestedMax:Math.max(4,Math.max(...dailyCounts)*4),
          grid:{drawOnChartArea:false},ticks:{color:axisColor,precision:0,maxTicksLimit:4},
          title:{display:period!=='month',text:'Günlük',color:axisColor}}} : {})
      },
      plugins:{legend:{display:false},tooltip:{callbacks:{
        afterBody(items){
          const index=items[0]?.dataIndex;
          if (index == null || index > observedEnd) return '';
          const goal=cumulative.planned[index];
          return [
            ...(daily ? ['O gün gelen: '+fmt(dailyCounts[index])] : []),
            'Toplam: '+fmt(cumulative.achieved[index]),
            ...(goal != null ? ['Hedefe kalan: '+fmt(Math.max(0,goal-cumulative.achieved[index]))] : [])
          ];
        }
      }}}
    }, daily ? [dailyDots, dailyLabels, endpointLabels] : [endpointLabels]);
    emptyChart('chartTrend', doc.documentElement.dataset.reviewDesign === 'classic' || analyticsDemo() || management().loaded || scoped.length > 0, 'Grafik için ERP verisi bekleniyor.');
    const trendNote = !analyticsDemo() && (management().error || !management().loaded)
      ? 'Hedef kayıtları doğrulanamadı.' : targets.some(v=>v!=null) ? '' : 'Kayıtlı hedef yok. Performans ekranından hedef girin.';
    if (trendNote) chartNote('chartTrend',trendNote);
    else byId('chartTrend')?.closest('.chart-card')?.querySelector('.v2-chart-note')?.remove();
    chart('chartRating', 'doughnut', ['5★', '4★', '3★', '2★', '1★'], [{ label: 'Yıldız dağılımı', data: a.ratingCounts, backgroundColor: ['#12805c', '#6bbf9b', '#fbbf24', '#fb923c', '#b42318'], borderWidth: 2 }]);
    emptyChart('chartRating', a.count > 0, 'Seçili dönemde yorum bulunmuyor.');
    const breakdown = byId('reviewRatingBreakdown');
    if (breakdown) {
      const total = a.ratingCounts.reduce((sum, count) => sum + count, 0);
      breakdown.replaceChildren(...a.ratingCounts.map((count, index) => {
        const row = node('div', null, 'review-rating-row');
        const label = node('dt', (5 - index) + ' ★');
        const value = node('dd', total ? count.toLocaleString('tr-TR') + ' · %' + Math.round(100 * count / total) : '—');
        row.append(label, value);
        return row;
      }));
    }

    const ratingGoal = currentRatingTarget();
    const ratingLabel = value => value == null ? '—' : value.toLocaleString('tr-TR', {minimumFractionDigits:1,maximumFractionDigits:2}) + ' ★';
    const actualRating = a.average == null ? null : Math.round(a.average * 10) / 10;
    const ratingSummary = byId('ratingGoalSummary');
    if (ratingSummary) ratingSummary.innerHTML = `<span>${html(analyticsName())} · ${html(PERIODS[period])}</span><strong>Mevcut ${html(ratingLabel(actualRating))} · Hedef ${html(ratingLabel(ratingGoal))}</strong>`;
    if (ratingSummary && actualRating != null && ratingGoal != null) {
      const delta = Math.round((actualRating-ratingGoal)*100)/100;
      const chip = node('span', (delta>0?'+':'')+delta.toLocaleString('tr-TR',{maximumFractionDigits:2})+' puan', 'chip '+(delta<0?'warn':'ok'));
      ratingSummary.append(chip);
    }
    chart('chartRatingGoal', 'bar', ['Mevcut puan', 'Yıldız hedefi'], [{
      label:'Yıldız puanı', data:[actualRating,ratingGoal],
      backgroundColor:['#12805c','#7c3aed'], borderRadius:6, maxBarThickness:28
    }], {indexAxis:'y',scales:{
      x:{min:0,max:5,ticks:{stepSize:1}},
      y:{grid:{display:false}}
    }});
    emptyChart('chartRatingGoal', actualRating != null || ratingGoal != null, 'Bu kapsamda puan veya hedef kaydı yok.');
    chartNote('chartRatingGoal', (ratingGoal == null ? 'Bu kapsamda yıldız hedefi eksik. ' : '') +
      'Mevcut puan seçili dönemdeki yorumların ortalamasıdır.' +
      (matchingBranches().length > 1 ? ' Hedef, şubelerin yıldız hedeflerinin ortalamasıdır.' : ''));
    const total = currentReviewTotal(), target = currentTarget();
    const regionTitle = byId('chartRegion')?.closest('.chart-card')?.querySelector('h3'); if (regionTitle) regionTitle.textContent = 'Toplam yorum · hedef ve gerçekleşen';
    function summaryCard(canvasId, content) {
      const canvas = byId(canvasId), host = canvas?.closest('.chart-card'); if (!host) return;
      root.destroyChart(canvasId); canvas.parentElement.hidden = true;
      let block = host.querySelector('.v2-summary-card');
      if (!block) { block = node('div', null, 'v2-summary-card'); host.append(block); }
      if (content !== undefined) block.innerHTML = content;
      host.querySelector('.v2-chart-note')?.remove();
      return block;
    }
    const ratio = missingScopeData() ? null : progress(total, target);
    if (doc.documentElement.dataset.reviewDesign!=='new') {
    summaryCard('chartRegion', `<div class="v2-summary-line"><strong>${html(analyticsName())}</strong><span>${total} / ${target ?? '—'}</span></div><progress class="v2-goal-meter" aria-label="Toplam yorum hedefi gerçekleşmesi" max="100" value="${Math.min(100,ratio || 0)}"></progress><div class="v2-summary-line"><span>${ratio == null ? (missingScopeData() ? 'Şube verisi eksik' : 'Hedef girilmedi') : `${pct(ratio)} gerçekleşti`}</span><span>${target == null ? '—' : `Kalan ${Math.max(0,target-total)} yorum`}</span></div><p>Şube hedefi · ${html(branch()?.region || '—')} / ${html(analyticsName())}</p><button class="btn sm" onclick="switchView('performance')">Hedefi düzenle →</button>`);
    }
    const responseTitle = byId('chartResponse')?.closest('.chart-card')?.querySelector('h3'); if (responseTitle) responseTitle.textContent = matchingBranches().length > 1 ? 'Yanıt süresi · Şube SLA’ları' : `Yanıt süresi · SLA ${sla()} sa`;
    const within = a.slaRate == null ? null : Math.round(a.slaRate*a.timedAnswers/100);
    summaryCard('chartResponse', within == null ? '<p>Yanıt süresi ölçülebilen kayıt bulunmuyor.</p>' : `<div class="v2-sla-meter" role="img" aria-label="${within} yanıt SLA içinde, ${a.timedAnswers-within} yanıt SLA dışında"><span style="flex:${within};background:#0f9d75">${within} içinde</span><span style="flex:${a.timedAnswers-within};background:#d92d20">${a.timedAnswers-within} dışında</span></div><div class="v2-summary-line"><span>${a.timedAnswers} tarihli yanıt üzerinden</span><strong>${pct(a.slaRate)} SLA içinde</strong></div><p>Süre: yorum tarihi → Google yanıt tarihi. Tarihi eksik kayıtlar dahil edilmez.</p><button class="btn sm" onclick="switchView('reviews')">Yorumları incele →</button>`);
  };

  let goalCardSignature;
  const goalCardDate = new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',month:'short',year:'2-digit'});
  function goalCardChildren(path, records, month) {
    const depth = path.length;
    if (depth===3) return [];
    const groups = new Map();
    for (const branch of matchingBranches()) {
      const childPath = [branch.region,branch.city,branch.id].slice(0,depth+1);
      const key = JSON.stringify(childPath);
      if (!groups.has(key)) groups.set(key,{path:childPath,name:depth===2?branch.name:childPath.at(-1),branches:[]});
      groups.get(key).branches.push(branch);
    }
    const counts = new Map();
    for (const row of records) {
      const id = row.branchId || row.branch_id;
      counts.set(id,(counts.get(id) || 0)+1);
    }
    return [...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'tr')).map(group=>{
      const total = group.branches.reduce((sum,branch)=>sum+(counts.get(branch.id) || 0),0);
      const target = scopedGoalTarget(month,group.path,group.branches);
      const incomplete = !analyticsDemo() && group.branches.some(b=>b.id!==branchId() && !parentReviews?.getBranchById?.(b.id)?.lastSyncedAt);
      return {...group,total,target,ratio:incomplete?null:progress(total,target),incomplete};
    });
  }
  function renderGoalCard(block, total, target, ratio) {
    const path = goalPath();
    const scope = ['Genel Merkez','Bölge','İl','Şube'][path.length];
    const records = recordedReviews();
    const children = goalCardChildren(path,records,monthKey(Date.now()));
    const months = path.length===3 ? monthsFor('year').slice(-6) : [];
    const additions = new Map();
    for (const review of records) {
      const key = monthKey(review.createdAt);
      additions.set(key,(additions.get(key) || 0)+1);
    }
    let running = [...additions].reduce((sum,[key,count])=>key<months[0] ? sum+count : sum,0);
    const values = months.map(month=>{running+=additions.get(month) || 0; return running;});
    const signature = JSON.stringify([analyticsScope,analyticsName(),total,target,ratio,months,values,children.map(({path,name,total,target,ratio,incomplete})=>[path,name,total,target,ratio,incomplete])]);
    if (signature===goalCardSignature && block.querySelector('.review-goal-card')) return;
    goalCardSignature = signature;
    const open = block.querySelector('details')?.open ?? true;
    const remaining = ratio==null ? null : Math.max(0,target-total);
    const fill = ratio==null ? 0 : Math.max(0,Math.min(100,total/target*100));
    const historyMax = Math.max(1,target || 0,...values);
    block.innerHTML = `<div class="review-goal-card">
      <header class="review-goal-heading"><h3>Yorum hedefi</h3><span class="review-goal-context">${html(scope===analyticsName() ? scope : scope+' · '+analyticsName())} · ${analyticsDemo()?'Demo':'Canlı'}</span><button type="button" class="btn sm" onclick="switchView('performance')">Hedefleri aç →</button></header>
      <div class="review-goal-rate"><strong data-goal-number="${ratio ?? ''}">${ratio==null?'—':pct(ratio)}</strong>
        <span>${ratio==null ? (missingScopeData()?'Şube verisi eksik':'Bu ayın hedefi girilmedi') : `Bu ay · ${fmt(target)} yorum hedefi`}</span></div>
      <div class="review-goal-figures"><span>Ulaşılan <b data-goal-number="${total}">${fmt(total)}</b></span>
        <span>Kalan <b data-goal-number="${remaining ?? ''}">${remaining==null?'—':fmt(remaining)}</b></span></div>
      <div class="review-goal-track" role="img" aria-label="${ratio==null?'Hedef gerçekleşmesi hesaplanamadı':`${pct(ratio)} gerçekleşti`}">
        <i style="--fill:${fill}%"></i>${remaining ? '<i></i>' : ''}</div>
      ${path.length<3 ? `<div class="review-goal-children"><strong>${['Bölgeler','İller','Şubeler'][path.length]}</strong>
        ${children.length ? children.map((child,index)=>`<button type="button" data-goal-child="${index}" class="review-goal-child">
          <span>${html(child.name)}</span><span>${fmt(child.total)} / ${fmt(child.target)} · ${child.ratio==null ? (child.incomplete?'Veri eksik':'Hedef yok') : pct(child.ratio)}</span>
          <i aria-hidden="true"><i style="--fill:${Math.min(100,child.ratio || 0)}%;--delay:${Math.min(index,7)*38}ms"></i></i>
        </button>`).join('') : '<small>Bu kapsamda kayıt yok.</small>'}</div>` : `<details ${open?'open':''}><summary>Son 6 ay</summary><div class="review-goal-days">
        ${months.map((month,index)=>`<div><span>${goalCardDate.format(new Date(month+'-01T12:00:00Z'))}</span>
          <div aria-hidden="true"><i style="--fill:${values[index]/historyMax*100}%;--delay:${index*38}ms"></i></div>
          <b data-goal-number="${values[index]}">${fmt(values[index])}</b></div>`).join('')}</div><small>Ay sonu toplam yorum sayısı · Bu ay bugüne kadar</small></details>`}
      </div>`;
    for (const button of block.querySelectorAll('[data-goal-child]')) button.onclick = () => {
      const [region='',city='',branch=''] = children[Number(button.dataset.goalChild)].path;
      Object.assign(analyticsScope,{region,city,branch});
      if (branch && !analyticsDemo() && branch!==branchId()) {
        live().setScope(branch===BRANCH_IDS[0]?'live':branch);
        managementApi?.refresh().catch(()=>{});
      }
      root.switchView('overview');
      const heading = block.querySelector('h3');
      if (heading) { heading.tabIndex=-1; heading.focus(); }
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const card = block.firstElementChild;
    const numbers = [...card.querySelectorAll('[data-goal-number]')].filter(el=>el.dataset.goalNumber!=='').map(el=>[el,Number(el.dataset.goalNumber)]);
    card.animate([{opacity:.65,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:460,easing:'ease-out'});
    const started = performance.now();
    const tick = now => {
      if (!card.isConnected) return;
      const progress = Math.min(1,Math.max(0,(now-started)/850));
      for (const [el,value] of numbers) {
        const index = Math.round(value*(1-(1-progress)**3));
        el.textContent = el.matches('.review-goal-rate strong') ? pct(index) : fmt(index);
      }
      if (progress<1) requestAnimationFrame(tick);
    };
    tick(started);
  }

  function renderGoalWorkflow() {
    const host = byId('reviewGoalWorkflow');
    if (!host) return;
    const demo = analyticsDemo();
    const path = goalPath();
    const key = goalKey(goalMonth,path);
    const liveState = liveGoalRecords.get(key);
    if (!demo && !liveState?.result) {
      host.innerHTML = '<h3>Hedef planı</h3><p role="status">'+html(liveState?.error || 'ERP hedef planı yükleniyor…')+'</p>';
      if (liveState?.error) {
        const retry = node('button','Yeniden dene','btn sm');
        retry.type = 'button';
        retry.onclick = () => { liveGoalRecords.delete(key); approvedGoalsRequest = null; renderGoalWorkflow(); };
        host.append(retry);
      }
      if (!liveState) {
        const month = goalMonth;
        liveGoalRecords.set(key,{});
        Promise.all([
          managementApi.request('goal_plan_read',{path,month}),
          syncApprovedGoals()
        ]).then(([result])=>{
          liveGoalRecords.set(key,{result});
          if (STATE.view==='performance' && !analyticsDemo() && key===goalKey(goalMonth,goalPath())) root.switchView('performance');
        }).catch(error=>{
          liveGoalRecords.set(key,{error:error.message || 'ERP hedef planı alınamadı.'});
          if (STATE.view==='performance' && !analyticsDemo() && key===goalKey(goalMonth,goalPath())) renderGoalWorkflow();
        });
      }
      return;
    }
    const record = (demo ? demoGoals()[key] : liveState.result.record) || {};
    const draft = record.draft || record.approved || {};
    const status = record.status || 'new';
    const permitted = demo ? null : liveState.result.actions;
    const editable = demo ? ['new','draft','revision'].includes(status) : permitted.includes('save');
    const actions = {save:'Taslak kaydedildi',submit:'Onaya gönderildi',forward:'GM onayına gönderildi',approve:'Onaylandı',revise:'Revizyon açıldı'};
    const states = {new:'Yeni',draft:'Taslak',pending:'GM onayı bekliyor',regional:'Bölge onayı bekliyor',approved:'Onaylandı',revision:'Revizyon'};
    const button = (action,label) => permitted && !permitted.includes(action) ? '' : '<button class="btn sm" type="submit" value="'+action+'">'+label+'</button>';
    const actual = allRows().filter(row => monthKey(row.createdAt) === goalMonth);
    const approved = record.approved;
    const totals = demo ? demoGoalTotals(goalMonth) : (() => {
      const units = matchingBranches();
      const approved = units.map(unit=>liveGoal(goalMonth,[unit.region,unit.city,unit.id])).filter(Boolean);
      const target = approved.reduce((total,goal)=>total+goal.total,0);
      return {target,count:approved.length,complete:units.length>0 && approved.length===units.length,
        rating:target ? approved.reduce((sum,goal)=>sum+goal.total*goal.rating,0)/target : null};
    })();
    host.innerHTML = `<h3>Hedef planı · ${goalLevels[path.length]} · ${html(analyticsName())}</h3>
      <label>Hedef ayı <input id="reviewGoalMonth" type="month" min="2000-01" max="2099-12" value="${html(goalMonth)}"></label>
      <p>${demo ? 'Demo' : 'Canlı ERP'} · ${states[status]} · ${allRows().length} mevcut yorum</p>
      <form id="reviewGoalForm">
        <fieldset ${editable ? '' : 'disabled'}><legend>Hedefler</legend>
          <label>Varılacak toplam yorum <input name="total" type="number" required min="1" max="10000000" value="${draft.total ?? ''}"></label>
          <label>Yıldız türü <select name="stars">${[5,4,3,2,1].map(value=>`<option value="${value}" ${value===(draft.stars || 5)?'selected':''}>${value} yıldız</option>`).join('')}</select></label>
          <label>Dönemde hedeflenen yıldızlı yorum adedi <input name="starCount" type="number" required min="0" max="10000000" value="${draft.starCount ?? ''}"></label>
          <label>Ortalama puan hedefi <input name="rating" type="number" required min="1" max="5" step="0.1" value="${draft.rating ?? ''}"></label>
        </fieldset>
        ${!editable && (!permitted || permitted.includes('revise')) ? '<label>Revizyon gerekçesi <input name="reason" type="text" maxlength="500"></label>' : ''}
        <div class="pacts">${editable ? button('save','Taslağı kaydet')+button('submit','Onaya gönder') :
          status==='regional' ? button('forward','Üst onaya gönder')+button('revise','Revize et') :
          status==='pending' ? button('approve','Onayla')+button('revise','Revize et') : button('revise','Revize et')}</div>
      </form>
      <p>${approved ? `Onaylı hedef · ${approved.total} toplam yorum · ${actual.filter(row=>row.stars===approved.stars).length}/${approved.starCount} adet ${approved.stars} yıldızlı yorum · Puan hedefi ${fmt(approved.rating)} ★` : 'Bu kapsam ve ay için onaylı hedef yok.'}</p>
      ${path.length<3 ? `<p>Onaylı şube hedefleri · ${totals.count}/${matchingBranches().length} şube · ${totals.target} toplam yorum hedefi${totals.rating==null?'':' · Ağırlıklı puan hedefi '+fmt(totals.rating)}${approved && totals.complete?' · Yönetim hedefi farkı '+fmt(approved.total-totals.target):''}</p>` : ''}
      ${record.history?.length ? `<details><summary>İşlem geçmişi</summary><ol>${record.history.map(entry=>`<li>${actions[entry.action]}${entry.role ? ' · '+html(({gm:'GM',region:'Bölge',branch:'Şube'})[entry.role] || entry.role) : ''} · ${html(new Date(entry.at).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}))} · ${entry.values.total} yorum · ${entry.values.starCount} adet ${entry.values.stars} yıldız · ${fmt(entry.values.rating)} puan${entry.reason?' · '+html(entry.reason):''}</li>`).join('')}</ol></details>` : ''}
      <p id="reviewGoalStatus" role="status"></p>`;
    byId('reviewGoalMonth').onchange = event => {
      if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(event.target.value)) return;
      goalMonth = event.target.value;
      renderGoalWorkflow();
    };
    byId('reviewGoalForm').onsubmit = async event => {
      event.preventDefault();
      const action = event.submitter?.value || 'save';
      const reason = action==='revise' ? event.currentTarget.elements.reason.value.trim() : null;
      if (action==='revise' && !reason) {
        byId('reviewGoalStatus').textContent='Revizyon gerekçesini girin.';
        event.currentTarget.elements.reason.focus();
        return;
      }
      if (!demo) {
        if (!permitted.includes(action)) return;
        const form = event.currentTarget;
        const fields = new FormData(form);
        const values = Object.fromEntries(['total','stars','starCount','rating'].map(field=>[field,Number(fields.get(field))]));
        const controls = [...form.querySelectorAll('button')];
        controls.forEach(control=>control.disabled=true);
        try {
          const result = await managementApi.request('goal_plan_transition',{path,month:goalMonth,transition:action,values,reason,expected_version:record.version || 0});
          liveGoalRecords.set(key,{result});
          if (result.record?.approved) liveApprovedGoals.set(key,result.record.approved);
          if (STATE.view==='performance' && !analyticsDemo() && key===goalKey(goalMonth,goalPath())) root.switchView('performance');
          root.toast(states[result.record.status], 'ok');
        } catch(error) {
          root.toast(error.message || 'ERP hedefi kaydedilemedi.','warn');
          liveGoalRecords.delete(key);
        } finally {
          controls.forEach(control=>control.disabled=false);
        }
        return;
      }
      const all = demoGoals();
      const current = all[key] || {};
      if (current.status !== record.status || current.updatedAt !== record.updatedAt) {
        renderGoalWorkflow();
        root.toast('Hedef başka oturumda değişti. Güncel kayıt açıldı.', 'warn');
        return;
      }
      let next;
      if (editable && ['save','submit'].includes(action)) {
        const fields = new FormData(event.currentTarget);
        const data = Object.fromEntries(['total','stars','starCount','rating'].map(field=>[field,Number(fields.get(field))]));
        if (data.starCount > data.total) {
          byId('reviewGoalStatus').textContent = 'Yıldızlı yorum adedi toplam hedefi aşamaz.';
          return;
        }
        next = {...current,draft:data,status:action==='save'?'draft':path.length>=2?'regional':'pending'};
      } else if (action==='forward' && status==='regional') {
        next = {...current,status:'pending'};
      } else if (action==='approve' && status==='pending') {
        next = {...current,approved:current.draft,status:'approved'};
      } else if (action==='revise' && !editable) {
        next = {...current,status:'revision',reason:reason.trim()};
      } else return;
      next.updatedAt = new Date().toISOString();
      next.history = [...(current.history || []), {action,at:next.updatedAt,reason:action==='revise'?next.reason:null,values:next.draft}];
      all[key] = next;
      try { localStorage.setItem(goalStorageKey, JSON.stringify(all)); }
      catch (_) { byId('reviewGoalStatus').textContent = 'Demo hedefi tarayıcıya kaydedilemedi.'; return; }
      root.switchView('performance');
      root.toast(states[next.status], 'ok');
    };
  }

  root.renderPerformance = function () {
    const a = stats(rows()), total = currentReviewTotal(), target = currentTarget();
    const ratio = missingScopeData() ? null : progress(total, target);
    const head = byId('perfTable')?.closest('.card2')?.querySelector('.head'); if (head) head.classList.add('v2-performance-head');
    byId('perfTable').innerHTML = `<thead><tr><th>Şube</th><th class="n">Varılacak toplam</th><th class="n">Mevcut toplam</th><th>Hedef ilerlemesi</th><th class="n">Dönem yorumları</th><th class="n">Puan</th><th class="n">Yanıt</th><th>Ortam</th></tr></thead><tbody><tr><td>${html(analyticsName())}</td><td>${target == null ? '—' : fmt(target)}</td><td class="n">${total}</td><td>${ratio == null ? (missingScopeData() ? 'Şube verisi eksik' : 'Hedef girilmedi') : `<div class="v2-progress"><progress aria-label="Hedef ilerlemesi" max="100" value="${Math.min(100, ratio)}"></progress><b>${ratio}%</b></div>`}</td><td class="n">${a.count}</td><td class="n">${fmt(a.average)}</td><td class="n">${pct(a.responseRate)}</td><td><span class="chip ${analyticsLive() ? 'ok' : 'warn'}">${analyticsLive() ? 'Canlı' : 'Demo'}</span></td></tr></tbody>`;
    const ratingTarget = currentRatingTarget();
    const ratingCell = byId('perfTable').querySelector('tbody tr td:nth-child(2)');
    ratingCell.insertAdjacentHTML('beforeend', `<div class="v2-rating-goal">${ratingTarget == null ? 'Puan hedefi eksik' : `Puan hedefi ${fmt(ratingTarget)} ★`}</div>`);
    renderGoalWorkflow();
    if (ratio == null && analyticsLive() && (management().error || !management().loaded)) {
      byId('perfTable').querySelector('tbody tr td:nth-child(4)').textContent = 'Hedef doğrulanamadı';
    }
    const groupBody = byId('perfTable').tBodies[0];
    const branches = matchingBranches().slice().sort((a,b) =>
      a.region.localeCompare(b.region,'tr') || a.city.localeCompare(b.city,'tr') || a.name.localeCompare(b.name,'tr'));
    if (branches.length > 1) {
      let group = '';
      const scoped = rows();
      for (const b of branches) {
        const label = b.region + ' / ' + b.city;
        if (label !== group) {
          group = label;
          groupBody.insertAdjacentHTML('beforeend', `<tr class="review-perf-group"><th colspan="8" scope="rowgroup">${html(group)}</th></tr>`);
        }
        const summary = stats(scoped.filter(row => (row.branchId || row.branch_id) === b.id));
        groupBody.insertAdjacentHTML('beforeend', `<tr><th scope="row">${html(b.name)}</th><td>—</td><td>${(analyticsDemo() ? regionalDemoRows(b) : cachedReviews(b)).length}</td><td>—</td><td>${summary.count}</td><td>${fmt(summary.average)}</td><td>${pct(summary.responseRate)}</td><td>${analyticsDemo() ? 'Demo' : 'Canlı'}</td></tr>`);
      }
    }
    root.renderTargetBreakdown(); normalizeScope();
  };
  root.renderTargetBreakdown = function () {
    const host = byId('targetBreakdown'); if (!host) return;
    const target = currentTarget(), actual = currentReviewTotal(), ratio = missingScopeData() ? null : progress(actual, target);
    host.innerHTML = `<div class="v2-period-note">Toplam yorum hedefi · ${analyticsLive() ? 'Seçili şubenin canlı verisi' : 'Yalnız seçili demo şube'} · ${monthKey(Date.now())}</div><div class="v2-breakdown">${[['Bölge', branch()?.region || '—'], ['İl', branch()?.city || '—'], ['Şube', analyticsName()]].map(([label, value]) => `<div class="card"><h4>${label}</h4><b>${html(value)}</b><span class="v2-big">${ratio == null ? '—' : `${ratio}%`}</span><progress aria-label="${label} hedef ilerlemesi" max="100" value="${Math.min(100, ratio || 0)}"></progress><p>${actual} yorum / ${target ?? '—'} hedef · ${analyticsLive() ? 'Canlı' : 'Demo'}</p></div>`).join('')}</div>`;
  };
  root.exportPerformance = function () {
    const a = stats(rows());
    root.downloadCSV('ototr-yorum-sayfasi-2-performans.csv', [
      ['Şube', 'Ortam', 'Dönem', 'Dönem yorumları', 'Mevcut toplam', 'Varılacak toplam', 'Yıldız hedefi', 'Puan', 'Yanıt %', 'SLA %'],
      [analyticsName(), analyticsLive() ? 'Canlı' : 'Demo', PERIODS[period], a.count, currentReviewTotal(), currentTarget() ?? '', currentRatingTarget() ?? '', a.average ?? '', a.responseRate ?? '', a.slaRate ?? '']
    ]);
  };
  function branchHeatmap() {
    const now = Date.now();
    const month = monthKey(now);
    return [...liveRegistry().map(branch=>({branch,demo:false})), ...regionalDemos.map(branch=>({branch,demo:true}))]
      .map(({branch,demo}) => {
        const source = demo ? regionalDemoRows(branch) : cachedReviews(branch);
        const reviewRows = source.filter(row => monthKey(row.createdAt) && Date.parse(row.createdAt) <= now);
        const loaded = demo || reviewRows.length > 0 || Boolean(parentReviews?.getBranchById?.(branch.id)?.lastSyncedAt);
        const stats = live().aggregateReviews(reviewRows,{now,slaHours:demo?24:branch.id===branchId()?sla():Number(branch.sla_hours)||24});
        const target = demo ? directDemoGoal(month,[branch.region,branch.city,branch.id])?.total || demoTargets.get(branch.id) || branch.target : liveGoal(month,[branch.region,branch.city,branch.id])?.total ?? targetSeries([month],
          branch.id===branchId()?management().targets || []:scopedTargetCache.get(branch.id) || [],branch.id)[0];
        return {id:branch.id,name:branch.id===BRANCH_IDS[0]?'Bursa Nilüfer':branch.name,demo,
          count:loaded?stats.count:null, average:stats.average, response:stats.responseRate,
          sla:stats.slaRate, progress:loaded?progress(stats.count,target):null};
      });
  }
  function openDemoRanking() {
    Object.assign(analyticsScope,{mode:'demo',region:'',city:'',branch:''});
    root.switchView('overview');
  }
  function openRegionalDemo(id) {
    const b = regionalDemos.find(item => item.id === id);
    if (!b) return;
    Object.assign(analyticsScope,{mode:'demo',region:b.region,city:b.city,branch:b.id});
    root.switchView('performance');
  }
  root.OTOTRReviewAlternative = { ...pure, branchHeatmap, openDemoRanking, regionalDemos: () => regionalDemos.map(b=>({...b})), openRegionalDemo, getPeriod: () => period, scopedRows: operationalRows, filteredRows: rows };
  STATE.view = 'overview';
  root.switchView('overview');
})(typeof window === 'undefined' ? null : window);
