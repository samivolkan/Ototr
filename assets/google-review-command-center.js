(function () {
  'use strict';

  // The command center is deliberately layered on the existing Google workflow.
  // It owns the management view only; inbox, goals, OAuth and the live publisher
  // remain on their existing, server-validated paths.
  const state = window.__OTOTR_GOOGLE_CC_STATE = window.__OTOTR_GOOGLE_CC_STATE || {
    branch: 'all', period: '2026-11', query: '', auditAction: 'all', auditActor: 'all', auditRange: '30', bulkRunning: false,
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const metric = (value, decimals = 0) => value == null ? '—' : Number(value).toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const getIcon = name => typeof window.icon === 'function' ? window.icon(name) : '';
  const liveBranchId = 'branch-google-nilufer';
  const hiddenBranches = new Set(['branch-google-inegol', 'branch-google-istanbul']);
  const demoBranchFallbacks = [
    { id: 'branch-google-gebze', name: 'OTOTR Oto Ekspertiz Gebze', city: 'Kocaeli', region: 'Marmara', demo: true, demoReviewCount: 126, demoRating: 4.5, demoUnrepliedCount: 14, demoCriticalCount: 3, demoResponseRate: 89, trend: [15, 18, 16, 21, 23, 29] },
    { id: 'branch-google-ankara', name: 'OTOTR Oto Ekspertiz Ankara Merkez', city: 'Ankara', region: 'İç Anadolu', demo: true, demoReviewCount: 142, demoRating: 4.4, demoUnrepliedCount: 18, demoCriticalCount: 4, demoResponseRate: 87, trend: [19, 21, 22, 25, 24, 31] },
    { id: 'branch-google-izmir', name: 'OTOTR Oto Ekspertiz İzmir Bornova', city: 'İzmir', region: 'Ege', demo: true, demoReviewCount: 128, demoRating: 4.2, demoUnrepliedCount: 23, demoCriticalCount: 6, demoResponseRate: 82, trend: [28, 24, 23, 21, 25, 27] },
  ];
  const periods = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
  const periodLabels = ['Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas'];

  function rawBranches() {
    try {
      const rows = typeof googleBranches === 'function' ? googleBranches() : (window.googleReputationData?.branches || []);
      const merged = new Map(rows.map(row => [row.id, row]));
      // A browser that has not opened demo mode yet can still render the
      // management dashboard with its three clearly labelled demo branches.
      // The live branch always remains sourced from googleBranches().
      demoBranchFallbacks.forEach(row => { if (!merged.has(row.id)) merged.set(row.id, row); });
      return [...merged.values()].filter(row => !hiddenBranches.has(row.id));
    } catch (_) { return []; }
  }
  function rawReviews() {
    try {
      const rows = typeof googleReviews === 'function' ? googleReviews() : (window.googleReputationData?.reviews || []);
      return rows.filter(row => !hiddenBranches.has(row.branchId));
    } catch (_) { return []; }
  }
  function branchStats(branch) {
    const rows = rawReviews().filter(row => row.branchId === branch.id && !row.demo);
    const live = branch.id === liveBranchId;
    const total = live ? (rows.length || Number(branch.googleReviewCount) || 0) : Number(branch.demoReviewCount || branch.googleReviewCount || 0);
    const waiting = live ? rows.filter(row => !row.isReplied).length : Number(branch.demoUnrepliedCount || branch.unrepliedCount || 0);
    const critical = live ? rows.filter(row => typeof googleReviewIsCritical === 'function' && googleReviewIsCritical(row)).length : Number(branch.demoCriticalCount || branch.criticalCount || 0);
    const rating = live ? (rows.length ? rows.reduce((sum, row) => sum + Number(row.starRating || row.rating || 0), 0) / rows.length : Number(branch.googleRating || 0)) : Number(branch.demoRating || branch.googleRating || 0);
    const responseRate = live ? (total ? Math.round((total - waiting) / total * 100) : 0) : Number(branch.demoResponseRate || 0);
    return { branch, total, waiting, critical, rating, responseRate, live, synced: Boolean(branch.synced || branch.lastSyncedAt || rows.length) };
  }
  function visibleStats() {
    let rows = rawBranches().map(branchStats);
    if (state.branch !== 'all') rows = rows.filter(row => row.branch.id === state.branch);
    if (state.query) rows = rows.filter(row => `${row.branch.name} ${row.branch.city} ${row.branch.region}`.toLocaleLowerCase('tr-TR').includes(state.query.toLocaleLowerCase('tr-TR')));
    return rows;
  }
  function totals(rows) {
    const total = rows.reduce((sum, row) => sum + row.total, 0);
    const waiting = rows.reduce((sum, row) => sum + row.waiting, 0);
    const critical = rows.reduce((sum, row) => sum + row.critical, 0);
    const weighted = rows.reduce((sum, row) => sum + row.rating * row.total, 0);
    return { total, waiting, critical, rating: total ? weighted / total : 0, responded: Math.max(0, total - waiting), responseRate: total ? Math.round((total - waiting) / total * 100) : 0 };
  }
  function trend(rows) {
    return periods.map((period, index) => rows.reduce((sum, row) => {
      const branch = row.branch;
      if (row.live) {
        const trendValues = Array.isArray(branch.monthlyTrend) ? branch.monthlyTrend : Array.isArray(branch.trend) ? branch.trend : [];
        return sum + Number(trendValues[index] || (index === periods.length - 1 ? row.total : 0));
      }
      return sum + Number((branch.trend || [])[index] || 0);
    }, 0));
  }
  function linePoints(values, width = 760, height = 136, padX = 22, padY = 16) {
    const max = Math.max(...values, 1);
    return values.map((value, index) => `${padX + index * ((width - padX * 2) / Math.max(1, values.length - 1))},${height - padY - (value / max) * (height - padY * 2)}`).join(' ');
  }
  function percent(value, total) { return total ? Math.max(0, Math.min(100, Math.round(value / total * 100))) : 0; }
  function branchLabel(branch) { return String(branch.name || '').replace(/^OTOTR Oto Ekspertiz\s*/i, '') || branch.name || 'Şube'; }
  function statusTone(row) { return row.critical >= Math.max(3, row.total * .12) ? 'risk' : row.waiting >= Math.max(10, row.total * .18) ? 'warn' : 'good'; }
  function statusLabel(row) { return statusTone(row) === 'risk' ? 'Kritik' : statusTone(row) === 'warn' ? 'Takipte' : 'Sağlıklı'; }

  function renderTrend(rows) {
    const values = trend(rows), max = Math.max(...values, 1), points = linePoints(values);
    const ratingValues = periods.map((_, index) => {
      const weighted = rows.reduce((sum, row) => sum + row.rating * row.total, 0);
      const total = rows.reduce((sum, row) => sum + row.total, 0);
      return total ? Math.max(0, Math.min(5, weighted / total)) : (index < 5 ? 4.2 : 4.5);
    });
    const ratingPoints = ratingValues.map((value, index) => `${22 + index * ((760 - 44) / 5)},${150 - (value / 5) * 108}`).join(' ');
    const circles = values.map((value, index) => {
      const x = 22 + index * ((760 - 44) / 5), y = 136 - (value / max) * 104;
      return `<circle tabindex="0" data-cc-point="${index}" data-cc-series="volume" cx="${x}" cy="${y}" r="5" fill="#ef3340"></circle>`;
    }).join('');
    const ratingCircles = ratingValues.map((value, index) => {
      const x = 22 + index * ((760 - 44) / 5), y = 150 - (value / 5) * 108;
      return `<circle tabindex="0" data-cc-point="${index}" data-cc-series="rating" cx="${x}" cy="${y}" r="4" fill="#287bf2"></circle>`;
    }).join('');
    return `<div class="cc-chart" data-cc-chart data-volumes="${esc(values.join(','))}" data-ratings="${esc(ratingValues.join(','))}">
      <div class="cc-y-axis"><span>${metric(max)}</span><span>${metric(Math.round(max * .75))}</span><span>${metric(Math.round(max * .5))}</span><span>${metric(Math.round(max * .25))}</span><span>0</span></div>
      <svg viewBox="0 0 784 166" role="img" aria-label="6 aylık yorum hacmi ve puan trendi"><line class="cc-hover-line" x1="22" x2="22" y1="10" y2="150" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4 4"></line>${[10,45,80,115,150].map(y => `<line class="gridline" x1="22" x2="762" y1="${y}" y2="${y}"></line>`).join('')}<polygon class="volume-area" points="22,150 ${points} 762,150"></polygon><polyline class="volume-line" points="${points}"></polyline><polyline class="rating-line" points="${ratingPoints}"></polyline>${circles}${ratingCircles}</svg>
      <div class="cc-x-axis">${periodLabels.map(label => `<span>${label} 2026</span>`).join('')}</div>
    </div>`;
  }
  function renderOperation(rows) {
    return rows.map(row => {
      const responded = Math.max(0, row.total - row.waiting - row.critical);
      return `<div class="cc-op-row"><span class="cc-op-name">${esc(branchLabel(row.branch))}</span><div class="cc-stack"><i class="answered" style="width:${percent(responded, row.total)}%">${responded || ''}</i><i class="waiting" style="width:${percent(row.waiting, row.total)}%">${row.waiting || ''}</i><i class="critical" style="width:${percent(row.critical, row.total)}%">${row.critical || ''}</i></div><strong>${metric(row.total)}</strong></div>`;
    }).join('');
  }
  function renderBranches(rows) {
    const max = Math.max(...rows.map(row => row.total), 1);
    return `<div class="cc-branch-table"><div class="cc-branch-row header"><span>Şube / kaynak</span><span>Ortalama</span><span>Yorum hacmi</span><span>Bekleyen</span><span>Durum</span><span></span></div>${rows.map(row => `<div class="cc-branch-row"><span><strong>${esc(branchLabel(row.branch))}</strong><small>${esc(row.branch.city || '—')} · ${row.live ? 'Nilüfer canlı' : 'Demo veri'}</small></span><span><strong>${row.rating ? metric(row.rating, 1) : '—'} ★</strong></span><span><div class="cc-branch-meter"><i style="width:${percent(row.total, max)}%"></i></div><small>${metric(row.total)} toplam</small></span><span><strong>${metric(row.waiting)}</strong><small>${row.critical} kritik</small></span><span><em class="cc-branch-health ${statusTone(row)}">${statusLabel(row)}</em></span><span><button class="cc-row-action" data-cc-branch="${esc(row.branch.id)}">İncele</button></span></div>`).join('')}</div>`;
  }
  function renderAuditRows() {
    const samples = [
      ['approved', 'Yanıt onayı', 'Süper Admin', 'Bursa Nilüfer · Barış Buktel', '3 dk önce'],
      ['routed', 'Hukuk birimine sevk', 'Sistem', 'Bursa Nilüfer · 1★ yorum', '21 dk önce'],
      ['updated', 'AI politikası güncellendi', 'Süper Admin', 'Genel merkez ayarları', 'Bugün 09:42'],
      ['sync', 'Google senkronizasyonu tamamlandı', 'Sistem', 'Nilüfer · 12 yeni / 3 güncellendi', 'Bugün 09:18'],
    ];
    const action = state.auditAction, actor = state.auditActor;
    return samples.filter(item => (action === 'all' || item[0] === action) && (actor === 'all' || item[2] === actor)).map(item => `<div class="cc-audit-row"><div class="cc-audit-dot">${item[0] === 'approved' ? '✓' : item[0] === 'routed' ? '→' : item[0] === 'sync' ? '↻' : '✎'}</div><div><b>${esc(item[1])}</b><small>${esc(item[2])} · ${esc(item[3])}</small></div><time>${esc(item[4])}</time></div>`).join('') || '<p class="cc-muted-note">Filtreye uyan işlem bulunamadı.</p>';
  }
  function overlay(title, body, footer = '') { return `<div class="cc-overlay on" data-cc-overlay><section class="cc-modal" role="dialog" aria-modal="true"><header class="cc-modal-head"><h3>${title}</h3><button class="cc-modal-close" data-cc-close aria-label="Kapat">×</button></header><div class="cc-modal-body">${body}</div>${footer ? `<footer class="cc-modal-foot">${footer}</footer>` : ''}</section></div>`; }
  function openModal(kind) {
    const root = document.getElementById('page-google-reviews'); if (!root) return;
    let html = '';
    if (kind === 'bulk') {
      html = overlay('Toplu sevk kuyruğu', `<p class="cc-muted-note">Seçili onay bekleyen kayıtlar güvenli bir kuyrukta işlenir. Demo şubelerde dış gönderim kapalıdır; Nilüfer kayıtları için admin onayı zorunludur.</p><div class="cc-progress"><i data-cc-progress-bar></i></div><div class="cc-progress-meta"><span data-cc-progress-label>Hazır</span><b data-cc-progress-value>%0</b></div><div class="cc-alert" style="margin-top:15px">${getIcon('shield-check')}<div><b>Yetki kontrolü</b> Süper Admin · Google yanıt yayınlama yetkisi aktif. Her kayıt idempotency anahtarıyla tek kez işlenir.</div></div>`, '<button class="cc-row-action" data-cc-close>İptal</button><button class="cc-row-action" data-cc-bulk-start>Toplu sevki başlat</button>');
    } else if (kind === 'audit') {
      html = overlay('Denetim günlüğü', `<div class="cc-audit-filters"><select data-cc-audit-action><option value="all">Tüm işlemler</option><option value="approved">Onay</option><option value="routed">Sevk</option><option value="updated">Ayar değişikliği</option><option value="sync">Senkronizasyon</option></select><select data-cc-audit-actor><option value="all">Tüm kullanıcılar</option><option value="Süper Admin">Süper Admin</option><option value="Sistem">Sistem</option></select><select><option value="30">Son 30 gün</option><option value="7">Son 7 gün</option><option value="90">Son 90 gün</option></select><input placeholder="Yorum, şube veya işlem ara…"></div><div class="cc-audit-list" data-cc-audit-list>${renderAuditRows()}</div>`, '<button class="cc-row-action" data-cc-audit-export>Audit CSV indir</button><button class="cc-row-action" data-cc-close>Kapat</button>');
    } else {
      html = overlay('E-posta önizleme', `<div class="cc-audit-filters"><input value="dijital@ototr.com" aria-label="Alıcı" readonly><input value="Google yorumu · yönetim özeti" aria-label="Konu" readonly><select><option>Yönetim özeti şablonu v2</option><option>Hukuk sevk şablonu v1</option></select><span></span></div><div class="cc-card" style="box-shadow:none;background:#fbfdff"><p><b>Alıcı:</b> dijital@ototr.com</p><p><b>Konu:</b> OTOTR Google Yorum Merkezi · günlük aksiyon özeti</p><hr style="border:0;border-top:1px solid #e5ebf2"><p>Merhaba,</p><p>Nilüfer canlı bağlantısında bekleyen yanıtlar ve kritik müşteri deneyimi sinyalleri aşağıdadır. Bu e-posta yalnızca önizlemedir; gönderim için yetkili onayı gerekir.</p><p><b>Bekleyen yanıt:</b> 14<br><b>Kritik / hukuk:</b> 2<br><b>SLA başarısı:</b> %96</p><p>OTOTR Müşteri Deneyimi Merkezi</p></div>`, '<button class="cc-row-action" data-cc-close>Vazgeç</button><button class="cc-row-action" data-cc-email-test>Test e-postası gönder</button>');
    }
    root.insertAdjacentHTML('beforeend', html);
  }
  function exportCsv(rows) {
    const lines = [['Şube', 'İl', 'Kaynak', 'Toplam yorum', 'Bekleyen', 'Kritik', 'Ortalama puan'], ...rows.map(row => [branchLabel(row.branch), row.branch.city || '', row.live ? 'Canlı' : 'Demo', row.total, row.waiting, row.critical, row.rating.toFixed(2)])];
    const csv = '\ufeff' + lines.map(line => line.map(value => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); link.download = `ototr-google-yonetim-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 500);
  }
  function markup() {
    const rows = visibleStats(), allRows = rawBranches().map(branchStats), t = totals(rows), trendRows = rows.length ? rows : allRows, values = trend(trendRows), target = state.branch === liveBranchId ? 300 : state.branch === 'all' ? 1800 : (rows[0]?.branch?.demoReviewCount || 300), completion = Math.min(100, target ? Math.round(t.total / target * 100) : 0), overdue = rows.reduce((sum, row) => sum + Math.max(0, row.waiting - 8), 0), branchNames = allRows.length ? `${allRows.length} şube` : 'Veri bekleniyor';
    const live = allRows.find(row => row.branch.id === liveBranchId);
    const liveText = live?.synced ? 'Nilüfer canlı · son senkronizasyon hazır' : 'Nilüfer canlı · senkronizasyon bekleniyor';
    return `<div class="cc-shell"><aside class="cc-sidebar"><div class="cc-brand"><b>Oto<span>TR</span></b><small>GOOGLE</small></div><nav class="cc-nav" aria-label="Google yorum merkezi"><div class="cc-nav-title">Müşteri deneyimi</div><button class="active" data-cc-nav="overview">${getIcon('house')}<span>Genel Bakış</span></button><button data-cc-nav="reviews">${getIcon('message-square')}<span>Yorumlar ve yanıtlar</span></button><button data-cc-nav="radar">${getIcon('radar')}<span>İtibar Radarı</span></button><button data-cc-nav="goals">${getIcon('target')}<span>Hedefler</span></button><div class="cc-nav-title">Yönetim</div><button data-cc-nav="connections">${getIcon('link-2')}<span>Google Bağlantıları</span></button><button data-cc-nav="audit">${getIcon('clipboard-list')}<span>Audit Log</span></button></nav><div class="cc-sidebar-foot"><b>OTOTR · Google Yorum Merkezi</b>${esc(liveText)}<br>Demo şubeler yalnızca örnek veridir.</div></aside><main class="cc-main"><header class="cc-topbar"><label class="cc-search">${getIcon('search')}<input data-cc-search value="${esc(state.query)}" placeholder="Şube, yorum veya müşteri ara…" aria-label="Şube, yorum veya müşteri ara"></label><div class="cc-top-actions"><select data-cc-period aria-label="Dönem">${periods.map((period, index) => `<option value="${period}" ${state.period === period ? 'selected' : ''}>${periodLabels[index]} 2026</option>`).join('')}</select><select data-cc-branch-filter aria-label="Şube"><option value="all">Tüm şubeler</option>${allRows.map(row => `<option value="${esc(row.branch.id)}" ${state.branch === row.branch.id ? 'selected' : ''}>${esc(branchLabel(row.branch))}${row.live ? ' · Canlı' : ' · Demo'}</option>`).join('')}</select><button class="cc-export" data-cc-export>${getIcon('download')} Dışa aktar</button></div></header><section class="cc-head"><div><span class="cc-eyebrow">OTOTR · İTİBAR VE MÜŞTERİ DENEYİMİ</span><h1>Google Yorum Merkezi</h1><p>Yönetim için puan, SLA, hedef, risk ve aksiyon sinyallerini tek bakışta izleyin.</p></div><div class="cc-head-actions"><span class="cc-live-pill"><i></i>${esc(liveText)}</span><span class="cc-demo-pill">${esc(branchNames)} · 3 demo + Nilüfer canlı</span><button class="cc-row-action" data-cc-sync>${getIcon('refresh-cw')} Nilüfer’i senkronize et</button></div></section><section class="cc-kpis"><article class="cc-kpi"><span>Toplam yorum</span><strong>${metric(t.total)}</strong><small>${state.branch === 'all' ? 'Ağ görünümü' : esc(branchLabel(rows[0]?.branch || {}))}</small></article><article class="cc-kpi good"><span>Ortalama puan</span><strong>${t.rating ? metric(t.rating, 1) : '—'} / 5</strong><small>Şube ağırlıklı Google puanı</small><em class="delta">${t.rating ? 'Kalite' : 'Bekliyor'}</em></article><article class="cc-kpi warn"><span>Bekleyen yanıt</span><strong>${metric(t.waiting)}</strong><small>${metric(overdue)} SLA riski</small></article><article class="cc-kpi risk"><span>Kritik / hukuk</span><strong>${metric(t.critical)}</strong><small>1–2 yıldız ve risk sinyali</small></article><article class="cc-kpi good"><span>SLA başarısı</span><strong>%${metric(t.responseRate)}</strong><small>24 saat hedefi</small></article></section><section class="cc-grid"><article class="cc-card"><div class="cc-card-head"><div><h2>6 aylık yorum eğilimi <small>${state.branch === 'all' ? 'Tüm şubeler' : esc(branchLabel(rows[0]?.branch || {}))}</small></h2><p>Yorum hacmi ve ortalama puan · noktaya geldiğinizde ayrıntı gösterilir.</p><div class="cc-legend"><span><i class="red"></i>Yorum hacmi</span><span><i class="blue"></i>Ortalama puan (endeksli)</span></div></div><div class="cc-status-summary"><span><b>${metric(t.total)}</b>Toplam</span><span><b>%${completion}</b>Hedef payı</span></div></div>${renderTrend(trendRows)}</article><article class="cc-card"><div class="cc-card-head"><div><h2>Kasım hedef temposu <small>${state.branch === 'all' ? 'Genel merkez' : 'Şube'}</small></h2><p>Gerçekleşen yorum / dönem hedefi</p></div><span class="cc-demo-pill">${state.branch === liveBranchId ? 'Canlı' : 'Demo + canlı'}</span></div><div class="cc-goal-number">${metric(t.total)} <small>/ ${metric(target)}</small><b>%${completion}<small>tamamlandı</small></b></div><div class="cc-goal-track"><i style="width:${completion}%"></i></div><div class="cc-goal-scale"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div><div class="cc-goal-cards"><div>${getIcon('bar-chart-3')}<b>${metric(Math.max(1, Math.round(t.total / 30)))}<small>Mevcut günlük tempo</small></b></div><div>${getIcon('target')}<b>${metric(Math.max(1, Math.ceil(Math.max(0, target - t.total) / 15)))}<small>Gerekli günlük tempo</small></b></div></div></article></section><section class="cc-section-grid"><article class="cc-card"><div class="cc-card-head"><div><h2>Yanıt operasyonunun dağılımı <small>${esc(liveText)}</small></h2><p>Şube bazında yayınlanan, bekleyen ve kritik kayıtların dağılımı.</p></div><button class="cc-row-action" data-cc-open="bulk">Toplu sevk kuyruğu</button></div><div class="cc-legend"><span><i style="background:#287bf2"></i>Yanıtlandı</span><span><i style="background:#f4b126"></i>Yanıt bekliyor</span><span><i style="background:#ef3340"></i>Kritik / eskale</span></div>${renderOperation(rows)}</article><article class="cc-card"><div class="cc-card-head"><div><h2>İtibar radarı <small>Yönetim sinyalleri</small></h2><p>Risk yükseldiğinde ilgili ekip aksiyona bağlanır.</p></div><button class="cc-row-action" data-cc-nav="radar">Detay</button></div><div class="cc-radar"><div class="cc-radar-item good"><span>Marka skoru</span><strong>${metric(Math.max(0, Math.round(t.rating / 5 * 100)))}<small>/100</small></strong><small>Yorum kalitesi</small><div class="cc-risk-track"><i style="width:${Math.round(t.rating / 5 * 100)}%"></i></div></div><div class="cc-radar-item ${t.critical ? 'risk' : 'good'}"><span>Kritik alarm</span><strong>${metric(t.critical)}</strong><small>1–2 yıldız / hukuk</small><div class="cc-risk-track"><i style="width:${Math.min(100, t.critical * 10)}%"></i></div></div><div class="cc-radar-item ${overdue ? 'warn' : 'good'}"><span>SLA riski</span><strong>${metric(overdue)}</strong><small>Süresi yaklaşan</small><div class="cc-risk-track"><i style="width:${Math.min(100, overdue * 5)}%"></i></div></div><div class="cc-radar-item"><span>Canlı bağlantı</span><strong>${live?.synced ? '1/1' : '0/1'}</strong><small>dijital@ototr.com</small><div class="cc-risk-track"><i style="width:${live?.synced ? 100 : 20}%"></i></div></div></div></article></section><section class="cc-section-grid"><article class="cc-card"><div class="cc-card-head"><div><h2>Şube sağlık görünümü <small>${allRows.length} kayıt</small></h2><p>Bölge, il ve şube seviyesinde yönetim özeti.</p></div><button class="cc-row-action" data-cc-nav="connections">Şube ayarları</button></div>${renderBranches(rows.length ? rows : allRows)}</article><article class="cc-card"><div class="cc-card-head"><div><h2>Öncelikli yönetim aksiyonları</h2><p>En hızlı karar verilmesi gereken kuyruğu açın.</p></div></div><div class="cc-actions"><button class="cc-action" data-cc-nav="reviews"><b>Yanıt ve onay kuyruğu</b><strong>${metric(t.waiting)}</strong><span>AI taslaklarını inceleyin</span></button><button class="cc-action" data-cc-nav="radar"><b>Kritik / hukuk incelemesi</b><strong>${metric(t.critical)}</strong><span>Yetkili kararı gereken kayıtlar</span></button><button class="cc-action blue" data-cc-open="email"><b>Yönetim e-posta özeti</b><strong>↗</strong><span>Önizle ve test gönder</span></button><button class="cc-action good" data-cc-open="audit"><b>Audit log</b><strong>↻</strong><span>Filtrele, incele ve CSV al</span></button></div></article></section><section class="cc-footer-grid"><div class="cc-alert">${getIcon('shield-alert')}<div><b>Canlı veri sınırı</b>Yalnızca Bursa Nilüfer Google bağlantısı canlıdır. Diğer üç şubenin sayıları ve yorumları demo etiketiyle gösterilir; demo kayıtları Google’a gönderilemez.</div></div><div class="cc-card" style="padding:13px"><b style="font-size:11px">Yetki modeli</b><p class="cc-muted-note" style="margin:6px 0 0">AI yalnızca taslak hazırlar. Google’a yayınlama, toplu onay ve hukuk sevki backend’de rol kontrolü ve audit kaydı ile yürütülür.</p></div></section></main></div>`;
  }

  function mountOverlays() {
    const page = document.getElementById('page-google-reviews'); if (!page) return;
    page.querySelector('.cc-radar')?.closest('.cc-card')?.setAttribute('id', 'cc-radar-anchor');
    if (!page.querySelector('[data-cc-chart-bound]')) {
      page.querySelector('[data-cc-chart]')?.setAttribute('data-cc-chart-bound', '1');
      page.querySelectorAll('[data-cc-point]').forEach(point => {
        const chart = point.closest('[data-cc-chart]'), guide = chart?.querySelector('.cc-hover-line'), index = Number(point.dataset.ccPoint), series = point.dataset.ccSeries;
        const values = (chart?.dataset[series === 'rating' ? 'ratings' : 'volumes'] || '').split(',').map(Number), ratings = (chart?.dataset.ratings || '').split(',').map(Number);
        const show = event => { const value = values[index] || 0, rating = ratings[index] || 0; const label = `${periodLabels[index] || ''} 2026 · ${series === 'rating' ? `Puan: ${metric(value, 1)} / 5` : `Yorum: ${metric(value)} · Puan: ${metric(rating, 1)} / 5`}`; let tip = document.getElementById('cc-chart-tip'); if (!tip) { tip = document.createElement('div'); tip.id = 'cc-chart-tip'; tip.className = 'cc-chart-tip'; document.body.appendChild(tip); } tip.textContent = label; tip.classList.add('on'); tip.style.left = `${Math.min(window.innerWidth - 265, event.clientX + 12)}px`; tip.style.top = `${Math.max(10, event.clientY - 52)}px`; const x = point.getAttribute('cx'); guide?.setAttribute('x1', x); guide?.setAttribute('x2', x); guide?.style.setProperty('opacity', '1'); };
        point.addEventListener('pointerenter', show); point.addEventListener('focus', show); point.addEventListener('pointerleave', () => { document.getElementById('cc-chart-tip')?.classList.remove('on'); guide?.style.setProperty('opacity', '0'); }); point.addEventListener('blur', () => { document.getElementById('cc-chart-tip')?.classList.remove('on'); guide?.style.setProperty('opacity', '0'); });
      });
    }
  }
  function refresh() { if (typeof window.refreshGoogleReputationPage === 'function') window.refreshGoogleReputationPage(); else document.querySelector('#page-google-reviews')?.querySelector('.cc-main')?.replaceWith(document.createRange().createContextualFragment(markup())); setTimeout(mountOverlays, 0); }
  function navigate(view) {
    if (view === 'reviews') return window.OTOTRGoogleReputation?.setCenterView?.('inbox', 'waiting');
    if (view === 'goals') return window.OTOTRGoogleReputation?.setCenterView?.('goals');
    if (view === 'connections') return window.OTOTRGoogleReputation?.setCenterView?.('connections');
    if (view === 'radar') { document.getElementById('cc-radar-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    window.OTOTRGoogleReputation?.setCenterView?.('overview');
  }
  function bind() {
    if (window.__OTOTR_GOOGLE_CC_BOUND__) return; window.__OTOTR_GOOGLE_CC_BOUND__ = true;
    document.addEventListener('input', event => { const search = event.target.closest?.('[data-cc-search]'); if (search) { state.query = search.value; refresh(); } });
    document.addEventListener('change', event => { const branch = event.target.closest?.('[data-cc-branch-filter]'); if (branch) { state.branch = branch.value; refresh(); } const period = event.target.closest?.('[data-cc-period]'); if (period) { state.period = period.value; refresh(); } const action = event.target.closest?.('[data-cc-audit-action]'); if (action) { state.auditAction = action.value; const list = document.querySelector('[data-cc-audit-list]'); if (list) list.innerHTML = renderAuditRows(); } const actor = event.target.closest?.('[data-cc-audit-actor]'); if (actor) { state.auditActor = actor.value; const list = document.querySelector('[data-cc-audit-list]'); if (list) list.innerHTML = renderAuditRows(); } });
    document.addEventListener('click', event => {
      const nav = event.target.closest?.('[data-cc-nav]'); if (nav) { event.preventDefault(); const view = nav.dataset.ccNav; if (view === 'overview') return navigate('overview'); navigate(view); return; }
      const branch = event.target.closest?.('[data-cc-branch]'); if (branch) { state.branch = branch.dataset.ccBranch; refresh(); return; }
      const open = event.target.closest?.('[data-cc-open]'); if (open) { event.preventDefault(); openModal(open.dataset.ccOpen); return; }
      if (event.target.closest?.('[data-cc-close]') || event.target.matches?.('[data-cc-overlay]')) { event.target.closest('[data-cc-overlay]')?.remove(); return; }
      if (event.target.closest?.('[data-cc-sync]')) { event.preventDefault(); window.OTOTRGoogleReputation?.syncGoogleReviewsForBranch?.(liveBranchId); return; }
      if (event.target.closest?.('[data-cc-export]')) { event.preventDefault(); exportCsv(visibleStats()); return; }
      if (event.target.closest?.('[data-cc-email-test]')) { window.toast?.('E-posta önizlemesi hazırlandı; gerçek gönderim için mail worker ve yetkili onayı gerekir.', 'info'); return; }
      if (event.target.closest?.('[data-cc-audit-export]')) { const csv = 'İşlem;Kullanıcı;Kayıt;Zaman\nYanıt onayı;Süper Admin;Nilüfer;3 dk önce\nGoogle senkronizasyonu;Sistem;Nilüfer;Bugün 09:18'; const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); link.download = 'ototr-google-audit.csv'; link.click(); }
      if (event.target.closest?.('[data-cc-bulk-start]')) { const button = event.target.closest('[data-cc-bulk-start]'), bar = document.querySelector('[data-cc-progress-bar]'), label = document.querySelector('[data-cc-progress-label]'), value = document.querySelector('[data-cc-progress-value]'); if (!bar || !label || !value) return; button.disabled = true; state.bulkRunning = true; let progress = 0; const timer = setInterval(() => { progress = Math.min(100, progress + 10); bar.style.width = `${progress}%`; value.textContent = `%${progress}`; label.textContent = progress < 100 ? `${Math.round(progress * .14)} / 14 kayıt kuyruğa alındı` : 'Kuyruk tamamlandı · audit kaydı oluşturuldu'; if (progress >= 100) { clearInterval(timer); state.bulkRunning = false; button.textContent = 'Tamamlandı'; window.toast?.('Toplu sevk kuyruğu tamamlandı. Google yayını için admin onayı korunuyor.', 'success'); } }, 160); }
    });
  }
  function install() {
    if (typeof GoogleScreenshotDashboard !== 'function' || typeof googleReputationState === 'undefined') return setTimeout(install, 120);
    // Product decision: show the three demo branches beside the one live branch
    // by default, while sync/publish still target Nilüfer only.
    googleReputationState.demoMode = true;
    googleDashboardState.branchId = 'all';
    // Keep the existing inbox/goals/connections workspaces intact. The
    // command-center shell owns only the management overview; other views
    // continue through the product's established renderer so their forms,
    // filters and connection settings remain fully interactive.
    const legacyDashboard = window.GoogleScreenshotDashboard;
    window.GoogleScreenshotDashboard = function (...args) {
      return (googleReputationState.centerView || 'overview') === 'overview'
        ? markup()
        : legacyDashboard.apply(this, args);
    };
    if (!window.__OTOTR_GOOGLE_CC_REFRESH_WRAPPED__ && typeof window.refreshGoogleReputationPage === 'function') {
      const originalRefresh = window.refreshGoogleReputationPage;
      window.refreshGoogleReputationPage = function (...args) {
        googleReputationState.demoMode = true;
        googleDashboardState.branchId = 'all';
        const result = originalRefresh.apply(this, args);
        setTimeout(mountOverlays, 0);
        return result;
      };
      window.__OTOTR_GOOGLE_CC_REFRESH_WRAPPED__ = true;
    }
    bind();
    setTimeout(() => { if (typeof window.refreshGoogleReputationPage === 'function') window.refreshGoogleReputationPage(); mountOverlays(); }, 60);
  }
  window.OTOTRGoogleCommandCenter = Object.freeze({ refresh, openModal, exportCsv });
  install();
})();
