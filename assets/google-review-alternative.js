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
  function scopedRows(rows, branchId) {
    if (!BRANCH_IDS.includes(branchId)) return [];
    const demo = branchId !== BRANCH_IDS[0];
    const name = BRANCH_NAMES[BRANCH_IDS.indexOf(branchId)];
    return rows.filter(row => {
      const identity = row.branchId || row.branch_id;
      return row.demo === demo && (identity ? identity === branchId : row.store === name);
    });
  }
  function targetSeries(months, targets, branchId, demoTarget) {
    if (!BRANCH_IDS.includes(branchId)) return months.map(() => null);
    return months.map(month => {
      const record = targets.find(row => row.branch_id === branchId && String(row.month).slice(0, 7) === month);
      const raw = branchId === BRANCH_IDS[0] ? record?.monthly_target ?? record?.target : demoTarget;
      const value = Number(raw);
      return raw != null && Number.isFinite(value) && value > 0 ? value : null;
    });
  }
  function progress(actual, target) { return target > 0 ? Math.round(actual / target * 100) : null; }
  const pure = { BRANCH_IDS, monthsFor, monthKey, periodRows, scopedRows, targetSeries, progress };
  if (typeof module === 'object' && module.exports) module.exports = pure;
  if (!root?.document) return;

  const doc = root.document, second = doc.documentElement.dataset.reviewVariant === '2';
  const byId = id => doc.getElementById(id);
  const node = (tag, text, className) => { const n = doc.createElement(tag); if (text != null) n.textContent = text; if (className) n.className = className; return n; };
  const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const switcher = node('nav', null, 'review-page-switch');
  switcher.setAttribute('aria-label', 'Yorum sayfası tasarımı');
  for (const version of [1, 2]) {
    const url = new URL('index.html', location.href);
    if (version === 2) url.searchParams.set('reviewPage', '2');
    url.hash = 'google-reviews';
    const link = node('a', `Yorum Sayfası ${version}`);
    link.href = url.href; link.target = '_top';
    if (version === (second ? 2 : 1)) link.setAttribute('aria-current', 'page');
    link.addEventListener('click', event => {
      if (root.OTOTRReviewBridge?.isEditing?.()) {
        event.preventDefault(); root.toast('Önce açık yanıt taslağını kaydedin veya kapatın.', 'warn');
      }
    });
    switcher.append(link);
  }
  doc.querySelector('.topbar .searchbar')?.after(switcher);
  if (!second) return;

  doc.title = 'OTOTR · Yorum Sayfası 2';
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
  const subtitle = doc.querySelector('.bsub'); if (subtitle) subtitle.textContent = 'Google Yorum · 2';
  const live = () => root.OTOTRReviewLiveViews;
  const branchId = () => live()?.getBranchId?.() || BRANCH_IDS[0];
  const isLive = () => branchId() === BRANCH_IDS[0];
  const branchName = () => BRANCH_NAMES[BRANCH_IDS.indexOf(branchId())] || 'Şube seçin';
  const branch = () => BRANCHES.find(b => (b.erpBranchId || b.id) === branchId()) || BRANCHES[BRANCH_IDS.indexOf(branchId())];
  const management = () => root.OTOTRReviewManagement?.state || {};
  const allRows = () => scopedRows(typeof REVIEWS === 'undefined' ? [] : REVIEWS, branchId());
  let period = 'year';
  const rows = () => periodRows(allRows(), period);
  const sla = () => Number(isLive() ? management().policy?.default_sla_hours : branch()?.slaH) || 24;
  const stats = list => live().aggregateReviews(list, { slaHours: sla() });
  const fmt = value => value == null || !Number.isFinite(value) ? '—' : value.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
  const pct = value => value == null ? '—' : `${Math.round(value)}%`;
  const currentTarget = () => targetSeries([monthKey(Date.now())], management().targets || [], branchId(), branch()?.target)[0];
  const demoKey = 'ototr.review-page2.demo-targets.v1';
  try {
    const saved = JSON.parse(localStorage.getItem(demoKey) || '{}');
    BRANCHES.forEach((b, i) => { const value = Number(saved[BRANCH_IDS[i]]); if (i > 0 && i < 3 && Number.isInteger(value) && value >= 1 && value <= 10000) b.target = value; });
  } catch (_) { /* A damaged demo preference must not affect live data. */ }

  const oldControls = byId('erpGoogleSync')?.parentElement;
  const scopeBar = node('div', null, 'v2-scope'); scopeBar.setAttribute('aria-label', 'Şube ve dönem filtreleri');
  doc.querySelector('main')?.prepend(scopeBar);
  const branchSelect = byId('erpGlobalScope');
  if (branchSelect) scopeBar.append(branchSelect.parentElement);
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
  const environment = node('span', '1 canlı · 2 demo', 'chip ok'); scopeBar.append(environment);
  const refreshButtons = node('div', null, 'v2-refresh');
  ['erpGoogleSync', 'erpGoogleQueue', 'erpGoogleConnect'].forEach(id => { if (byId(id)) refreshButtons.append(byId(id)); });
  scopeBar.append(refreshButtons);
  if (oldControls) oldControls.hidden = true;
  const meta = node('div', null, 'v2-period-note'); meta.id = 'v2PeriodNote'; meta.setAttribute('aria-live', 'polite');
  doc.querySelector('.ph')?.after(meta);
  function normalizeScope() {
    if (branchSelect) {
      const labels = { live: 'Bursa Nilüfer · Canlı', gebze: 'Kocaeli Gebze · Demo', inegol: 'Bursa İnegöl · Demo' };
      for (const option of [...branchSelect.options]) { if (labels[option.value]) option.textContent = labels[option.value]; else option.remove(); }
      branchSelect.setAttribute('aria-label', 'Şube seçimi');
    }
    const sync = byId('erpGoogleSync');
    if (sync) { sync.hidden = !isLive(); sync.textContent = 'Nilüfer’i yenile'; }
    const current = byId('erpDataScope');
    if (current) current.textContent = `${branchName()} · ${isLive() ? 'Canlı ERP / Google kayıtları' : 'Demo · dış gönderim kapalı'}`;
    const currentMonth = monthKey(Date.now());
    meta.innerHTML = `<strong>${html(PERIODS[period])}</strong><span>${monthsFor(period)[0]} — ${currentMonth}</span><span>· ${isLive() ? 'Alınan canlı kayıtlar' : 'Örnek kayıtlar'}</span>`;
    const source = branch();
    if (isLive() && source?.lastSync) meta.append(node('span', `· Veri: ${source.lastSync}`));
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

  function chart(id, type, labels, datasets, extra = {}) {
    const canvas = byId(id);
    if (!canvas || typeof Chart === 'undefined') return;
    root.destroyChart(id);
    const color = getComputedStyle(doc.documentElement).getPropertyValue('--mute').trim();
    const line = getComputedStyle(doc.documentElement).getPropertyValue('--line').trim();
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${labels.join(', ')}. ${datasets.map(d => `${d.label}: ${d.data.map(v => v == null ? 'kayıt yok' : v).join(', ')}`).join('. ')}`);
    const plugins = { legend: { display: type === 'doughnut', position: 'right', labels: { color, boxWidth: 9, padding: 12 } } };
    charts[id] = new Chart(canvas, { type, data: { labels, datasets }, options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins, ...(type === 'doughnut' ? { cutout: '68%' } : { scales: { x: { grid: { display: false }, ticks: { color } }, y: { beginAtZero: true, grid: { color: line }, ticks: { color, precision: 0 } } } }), ...extra
    } });
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
  root.renderOverview = function () {
    const a = stats(rows());
    const connection = management().error ? 'Canlı yönetim bağlantısı alınamadı; Bağlantı durumu ekranını kontrol edin.' : !management().loaded ? 'Canlı kayıtlar için ERP oturumu bekleniyor.' : `${html(branchName())} · Google kayıtları ve ERP onay akışı. Gebze ve İnegöl bu toplama dahil değildir.`;
    byId('ovAlerts').innerHTML = `<div class="alert ${isLive() && management().loaded && !management().error ? 'info' : 'warn'}">${isLive() ? connection : `${html(branchName())} · Demo çalışma alanı. Yapılan denemeler Google’a gönderilmez.`}</div>`;
    const metrics = [
      ['Yorum hacmi', fmt(a.count), PERIODS[period]], ['Ort. puan', fmt(a.average), `${a.count} kayıttan hesaplandı`],
      ['Yanıt oranı', pct(a.responseRate), `${a.answered} yanıtlı yorum`], ['SLA', pct(a.slaRate), `${sla()} sa · ${a.timedAnswers} tarihli yanıt`],
      ['Yanıtsız', fmt(a.pending), 'Seçili dönem'], ['SLA aşımı', fmt(a.overdue), 'Yanıtsız ve geciken']
    ];
    byId('ovKpis').innerHTML = metrics.map(([label, value, note], i) => `<div class="kpi"><div class="kl">${html(label)}</div><div class="kv">${html(value)}</div><div class="kd">${html(note)}</div><div class="v2-mini"><canvas id="v2Mini${i}" aria-hidden="true"></canvas></div></div>`).join('');
    const critical = rows().filter(r => r.status !== 'gonderildi' && (r.stars <= 2 || r.escalated));
    byId('ovWatchlist').innerHTML = critical.slice(0, 5).map(r => `<div class="watch-row"><div class="info"><b>${html(root.OTOTRReviewEnhancements?.displayText(r.author) ?? r.author)}</b><small>${Number(r.stars)}★ · ${html(branchName())}</small></div><button class="btn sm" onclick="openReviewFromStore(${Number(r.id)})">İncele →</button></div>`).join('') || '<div class="empty">Seçili dönemde acil inceleme bekleyen yorum yok.</div>';
    byId('ovSla').innerHTML = `<div class="watch-row"><div class="info"><b>${html(branchName())}</b><small>Yorum tarihi → Google yanıt tarihi</small></div><span class="chip">${pct(a.slaRate)}</span></div><p class="v2-chart-note">${a.timedAnswers} kayıt ölçülebildi. Eksik veya geçersiz tarihler ortalamaya dahil edilmez.</p>`;
    normalizeScope();
  };
  root.initCharts = function () {
    const scoped = rows(), a = stats(scoped), keys = monthsFor(period);
    const counts = keys.map(key => scoped.filter(r => monthKey(r.createdAt) === key).length);
    const targets = targetSeries(keys, management().targets || [], branchId(), branch()?.target);
    const series = [
      { label: 'Alınan yorumlar', data: counts, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.08)', fill: true, tension: .3, pointRadius: 3 },
      { label: 'Yorum trendi', data: live().commentTrendSeries(counts), borderColor: '#7c3aed', borderDash: [4, 4], pointRadius: 0, fill: false },
      { label: 'Kayıtlı aylık hedef', data: targets, borderColor: '#e11d48', borderDash: [7, 4], pointRadius: 5, pointHoverRadius: 7, spanGaps: false, fill: false }
    ];
    const title = byId('chartTrend')?.closest('.chart-card')?.querySelector('h3');
    if (title) title.textContent = 'Yorum hacmi, trend ve hedef';
    const legend = byId('chartTrend')?.closest('.chart-card')?.querySelector('.chart-legend');
    if (legend) legend.innerHTML = '<span><i style="background:#2563eb"></i>Yorum</span><span><i style="background:#7c3aed"></i>Trend</span><span><i style="background:#e11d48"></i>Hedef</span>';
    chart('chartTrend', 'line', keys.map(key => new Date(`${key}-01T12:00:00Z`).toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })), series);
    chartNote('chartTrend', !isLive() ? 'Demo hedef çizgisi örnek aylık hedeftir. Mor çizgi örnek yorumlardan hesaplanan eğilimdir.' : targets.some(v => v != null) ? 'Hedef yalnız kayıtlı aylarda gösterilir. Kesikli mor çizgi alınan yorumlardan hesaplanan eğilimdir; tahmin değildir.' : 'Bu dönem için kayıtlı hedef yok. Performans ekranından bu ayın hedefini kaydedebilirsiniz.');
    chart('chartRating', 'doughnut', ['5★', '4★', '3★', '2★', '1★'], [{ label: 'Yıldız dağılımı', data: a.ratingCounts, backgroundColor: ['#12805c', '#6bbf9b', '#fbbf24', '#fb923c', '#b42318'], borderWidth: 2 }]);
    emptyChart('chartRating', a.count > 0, 'Seçili dönemde yorum bulunmuyor.');
    const monthly = stats(periodRows(allRows(), 'month')), target = currentTarget();
    const regionTitle = byId('chartRegion')?.closest('.chart-card')?.querySelector('h3'); if (regionTitle) regionTitle.textContent = 'Bu ay · hedef ve gerçekleşen';
    chart('chartRegion', 'bar', [branchName()], [
      { label: 'Kayıtlı hedef', data: [target], backgroundColor: '#cbd5e1', borderRadius: 5 },
      { label: 'Alınan yorumlar', data: [monthly.count], backgroundColor: '#e8281a', borderRadius: 5 }
    ], { indexAxis: 'y', plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 9 } } } });
    chartNote('chartRegion', `Bölge: Marmara · ${branchName()} · ${isLive() ? 'canlı' : 'demo'} kapsamı.`);
    chart('chartResponse', 'bar', ['<2 sa', '2–6 sa', '6–24 sa', '24–48 sa', '48+ sa'], [{ label: 'Yanıt süresi', data: a.durationBuckets, backgroundColor: ['#12805c', '#6bbf9b', '#fbbf24', '#fb923c', '#b42318'], borderRadius: 4 }]);
    const responseTitle = byId('chartResponse')?.closest('.chart-card')?.querySelector('h3'); if (responseTitle) responseTitle.textContent = `Yanıt süresi · SLA ${sla()} sa`;
    emptyChart('chartResponse', a.timedAnswers > 0, 'Yanıt süresi ölçülebilen kayıt bulunmuyor.');
    const bins = keys.map(key => stats(scoped.filter(r => monthKey(r.createdAt) === key)));
    ['count', 'average', 'responseRate', 'slaRate', 'pending', 'overdue'].forEach((field, i) => {
      chart(`v2Mini${i}`, 'line', keys, [{ label: metricsLabel(i), data: bins.map(s => s[field]), borderColor: ['#2563eb', '#b45309', '#12805c', '#12805c', '#b45309', '#b42318'][i], pointRadius: 0, borderWidth: 1.5, tension: .3 }], { scales: { x: { display: false }, y: { display: false } }, plugins: { legend: { display: false }, tooltip: { enabled: false } }, events: [] });
    });
  };
  function metricsLabel(i) { return ['Yorum hacmi', 'Puan', 'Yanıt oranı', 'SLA', 'Yanıtsız', 'SLA aşımı'][i]; }

  root.renderPerformance = function () {
    const a = stats(rows()), monthly = stats(periodRows(allRows(), 'month')), target = currentTarget();
    const ratio = progress(monthly.count, target), canSave = !isLive() || (management().loaded && !management().loading && !management().error && !management().targetError);
    const head = byId('perfTable')?.closest('.card2')?.querySelector('.head'); if (head) head.classList.add('v2-performance-head');
    byId('perfTable').innerHTML = `<thead><tr><th>Şube</th><th class="n">Bu ayın hedefi</th><th class="n">Bu ay alınan</th><th>Hedef ilerlemesi</th><th class="n">Dönem yorumları</th><th class="n">Puan</th><th class="n">Yanıt</th><th>Ortam</th></tr></thead><tbody><tr><td>${html(branchName())}</td><td><div class="v2-target-editor"><input id="v2Target" aria-label="${html(branchName())} aylık hedef" type="number" min="1" max="10000" step="1" value="${target ?? ''}" placeholder="Hedef" ${canSave ? '' : 'disabled'}><button id="v2SaveTarget" class="btn sm p" ${canSave ? '' : 'disabled'}>Kaydet</button></div></td><td class="n">${monthly.count}</td><td>${ratio == null ? 'Hedef girilmedi' : `<div class="v2-progress"><progress aria-label="Hedef ilerlemesi" max="100" value="${Math.min(100, ratio)}"></progress><b>${ratio}%</b></div>`}</td><td class="n">${a.count}</td><td class="n">${fmt(a.average)}</td><td class="n">${pct(a.responseRate)}</td><td><span class="chip ${isLive() ? 'ok' : 'warn'}">${isLive() ? 'Canlı' : 'Demo'}</span></td></tr></tbody>`;
    byId('v2SaveTarget').onclick = saveTarget;
    root.renderTargetBreakdown(); normalizeScope();
  };
  root.renderTargetBreakdown = function () {
    const host = byId('targetBreakdown'); if (!host) return;
    const target = currentTarget(), actual = stats(periodRows(allRows(), 'month')).count, ratio = progress(actual, target);
    host.innerHTML = `<div class="v2-period-note">Bu ayın hedef kırılımı · ${isLive() ? 'Yalnız Nilüfer canlı verisi' : 'Yalnız seçili demo şube'} · ${monthKey(Date.now())}</div><div class="v2-breakdown">${[['Bölge', 'Marmara'], ['İl', isLive() || branchId() === BRANCH_IDS[2] ? 'Bursa' : 'Kocaeli'], ['Şube', branchName()]].map(([label, value]) => `<div class="card"><h4>${label}</h4><b>${html(value)}</b><span class="v2-big">${ratio == null ? '—' : `${ratio}%`}</span><progress aria-label="${label} hedef ilerlemesi" max="100" value="${Math.min(100, ratio || 0)}"></progress><p>${actual} yorum / ${target ?? '—'} hedef · ${isLive() ? 'Canlı' : 'Demo'}</p></div>`).join('')}</div>`;
  };
  async function saveTarget() {
    const value = Number(byId('v2Target')?.value), button = byId('v2SaveTarget');
    if (!Number.isInteger(value) || value < 1 || value > 10000) return root.toast('Hedef 1–10000 arasında tam sayı olmalı.', 'warn');
    button.disabled = true;
    if (branchSelect) branchSelect.disabled = true;
    periodSelect.disabled = true;
    try {
      if (isLive()) {
        await root.OTOTRReviewManagement.saveTarget(value);
        if (currentTarget() !== value) throw new Error('Hedef kaydı doğrulanamadı; bağlantıyı yenileyin.');
      } else {
        branch().target = value;
        const saved = {};
        BRANCHES.forEach((b, i) => { if (i > 0 && i < 3) saved[BRANCH_IDS[i]] = b.target; });
        localStorage.setItem(demoKey, JSON.stringify(saved));
      }
      root.renderPerformance(); root.toast(`${branchName()} ${isLive() ? 'ERP' : 'demo'} hedefi kaydedildi.`, 'ok');
    } catch (error) { root.toast(error.message || 'Hedef kaydedilemedi.', 'warn'); }
    finally {
      if (button.isConnected) button.disabled = false;
      if (branchSelect) branchSelect.disabled = false;
      periodSelect.disabled = false;
    }
  }
  root.exportPerformance = function () {
    const a = stats(rows()), monthly = stats(periodRows(allRows(), 'month'));
    root.downloadCSV('ototr-yorum-sayfasi-2-performans.csv', [
      ['Şube', 'Ortam', 'Dönem', 'Dönem yorumları', 'Bu ay alınan', 'Bu ay hedef', 'Puan', 'Yanıt %', 'SLA %'],
      [branchName(), isLive() ? 'Canlı' : 'Demo', PERIODS[period], a.count, monthly.count, currentTarget() ?? '', a.average ?? '', a.responseRate ?? '', a.slaRate ?? '']
    ]);
  };
  root.OTOTRReviewAlternative = { ...pure, getPeriod: () => period, scopedRows: allRows, filteredRows: rows };
  STATE.view = 'overview';
  root.switchView('overview');
})(typeof window === 'undefined' ? null : window);
