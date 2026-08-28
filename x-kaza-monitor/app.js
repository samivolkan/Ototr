import {
  DEFAULT_ACCIDENT_TERMS,
  DEFAULT_EXCLUDED_TERMS,
  buildXQuery,
  canApproveCandidate,
  createId,
  formatPlate,
  isValidTurkishPlate,
  normalizePlate,
  statusLabel,
} from './core.mjs';

const PAGE_META = Object.freeze({
  dashboard: ['OPERASYON PANELİ', 'Genel Bakış'],
  rules: ['X VERİ TOPLAMA', 'Tarama Kuralları'],
  review: ['KALİTE KAPISI', 'Onay Kuyruğu'],
  lookup: ['EKSPERTİZ ENTEGRASYONU', 'Plaka Sorgulama'],
  system: ['BAĞLANTI VE GÜVENLİK', 'Sistem ve OCR'],
});

const STORAGE_KEY = 'ototr-x-kaza-monitor-demo-v1';
const state = {
  apiAvailable: false,
  health: null,
  stats: null,
  rules: [],
  candidates: [],
  scans: [],
  activeView: 'dashboard',
  lookupAudience: 'technician',
  currentReviewCandidate: null,
  authRequired: false,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeImageUrl(value) {
  const url = String(value ?? '');
  if (url.startsWith('data:image/svg+xml') || url.startsWith('data:image/png;base64,') || url.startsWith('data:image/jpeg;base64,') || url.startsWith('data:image/webp;base64,')) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return parsed.href;
  } catch {
    return demoImageDataUrl('PLAKA YOK', 'Görsel kullanılamıyor');
  }
  return demoImageDataUrl('PLAKA YOK', 'Görsel kullanılamıyor');
}

function safeSourceUrl(value) {
  try {
    const parsed = new URL(String(value ?? ''));
    if (parsed.protocol === 'https:' && (parsed.hostname === 'x.com' || parsed.hostname.endsWith('.x.com'))) return parsed.href;
  } catch {
    return null;
  }
  return null;
}

function demoImageDataUrl(plate, caption) {
  const safePlate = escapeHtml(plate);
  const safeCaption = escapeHtml(caption);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#20242a"/><stop offset="1" stop-color="#61666d"/></linearGradient></defs>
    <rect width="960" height="540" fill="url(#g)"/><path d="M165 360 L230 245 Q250 215 300 210 H675 Q720 215 742 250 L800 360 Z" fill="#343a40" stroke="#e9ecef" stroke-width="5"/>
    <path d="M275 245 H650 Q682 246 699 275 L718 315 H245 L266 270 Q271 252 275 245" fill="#a7b0ba" opacity=".55"/><circle cx="285" cy="375" r="67" fill="#151719" stroke="#9299a1" stroke-width="14"/><circle cx="690" cy="375" r="67" fill="#151719" stroke="#9299a1" stroke-width="14"/>
    <path d="M735 256 l76 -52 25 18-55 73z" fill="#a30d16"/><path d="M700 215 l48 -70 32 13-22 88z" fill="#bd1923"/><rect x="384" y="336" width="210" height="65" rx="8" fill="white" stroke="#111" stroke-width="4"/><rect x="384" y="336" width="30" height="65" rx="5" fill="#204c9e"/>
    <text x="426" y="381" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#111">${safePlate}</text><rect x="20" y="20" width="270" height="44" rx="22" fill="#c51924"/><text x="43" y="50" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="white">SENTETİK DEMO GÖRSELİ</text><text x="480" y="495" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="white">${safeCaption}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function defaultDemoState() {
  const now = new Date().toISOString();
  return {
    rules: [
      {
        id: 'rule_local_demo',
        name: 'Bursa trafik kazaları — demo',
        terms: ['kaza', 'kazalı', 'trafik kazası', 'çarpıştı', 'takla attı'],
        excludedTerms: ['oyun', 'film', 'reklam'],
        locations: ['Bursa', 'Nilüfer', 'Osmangazi', 'İnegöl'],
        mediaType: 'image',
        language: 'tr',
        mode: 'recent',
        active: false,
        intervalMinutes: 60,
        maxPosts: 50,
        query: '(kaza OR kazalı OR "trafik kazası" OR çarpıştı OR "takla attı") (Bursa OR Nilüfer OR Osmangazi OR İnegöl) has:images lang:tr -is:retweet -oyun -film -reklam',
        createdAt: now,
        updatedAt: now,
        lastRunAt: null,
        nextRunAt: null,
        demo: true,
      },
    ],
    candidates: [
      demoCandidate('candidate_local_pending', '16 OTR 26', 'review_pending', 92, 'İnsan onayı bekleyen OCR adayı'),
      demoCandidate('candidate_local_internal', '34 DEM 123', 'approved_internal', 88, 'Usta kullanımına onaylı demo kaydı'),
      demoCandidate('candidate_local_customer', '06 KAZ 26', 'approved_customer', 95, 'Alıcı gösterimine onaylı demo kaydı'),
    ],
    scans: [],
  };
}

function demoCandidate(id, plate, status, confidence, caption) {
  const normalized = normalizePlate(plate);
  const approved = status.startsWith('approved_');
  return {
    id,
    postId: `demo-${id}`,
    mediaKey: `demo-media-${id}`,
    sourcePlatform: 'X',
    sourceUrl: null,
    sourceAvailable: true,
    author: { name: 'Demo Kaynak', username: 'demo' },
    postText: `${caption}. Bu kayıt gerçek kişiye veya araca ait değildir.`,
    postedAt: new Date(Date.now() - Math.random() * 40 * 86400000).toISOString(),
    imageUrl: demoImageDataUrl(plate, caption),
    mediaType: 'photo',
    ocrText: plate,
    ocrConfidence: confidence,
    ocrLowConfidence: confidence < 35,
    plateCandidates: [{ plate, normalized, confidence }],
    selectedPlate: plate,
    selectedPlateNormalized: normalized,
    status,
    review: approved
      ? {
          reviewer: 'Demo Moderatör',
          reviewedAt: new Date().toISOString(),
          plateFullyVisible: true,
          belongsToDamagedVehicle: true,
          accidentContextConfirmed: true,
          customerDisplayAuthorized: status === 'approved_customer',
        }
      : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    demo: true,
  };
}

function loadLocalDemo() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // Gizli mod veya file:// kısıtlarında bellek içi demo kullanılır.
  }
  return defaultDemoState();
}

function saveLocalDemo() {
  if (state.apiAvailable) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      rules: state.rules,
      candidates: state.candidates,
      scans: state.scans,
    }));
  } catch {
    // Kalıcı depolama kullanılamıyorsa oturum içinde devam edilir.
  }
}

function getAdminApiToken() {
  try {
    return sessionStorage.getItem('ototr-x-admin-api-token') || '';
  } catch {
    return '';
  }
}

async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 30_000);
  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(getAdminApiToken() ? { Authorization: `Bearer ${getAdminApiToken()}` } : {}),
        ...(options.headers ?? {}),
      },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      const error = new Error(payload?.error?.message || `İstek başarısız (${response.status}).`);
      error.code = payload?.error?.code || 'REQUEST_FAILED';
      error.details = payload?.error?.details;
      throw error;
    }
    return payload.data;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadData({ notify = false } = {}) {
  setConnectionState('loading');
  let health = null;
  let loadError = null;

  try {
    health = await apiRequest('/api/health', { timeout: 4000 });
    const [stats, rules, candidates, scans] = await Promise.all([
      apiRequest('/api/stats'),
      apiRequest('/api/rules'),
      apiRequest('/api/candidates'),
      apiRequest('/api/scans?limit=20'),
    ]);
    Object.assign(state, {
      apiAvailable: true,
      authRequired: false,
      health,
      stats,
      rules,
      candidates,
      scans,
    });
    setConnectionState(health.xConfigured ? 'live' : 'demo');
    if (notify) toast('Veriler yenilendi', 'Sunucu kayıtları güncellendi.');
    renderAll();
    return;
  } catch (error) {
    loadError = error;
  }

  const local = loadLocalDemo();
  Object.assign(state, {
    apiAvailable: false,
    authRequired: loadError?.code === 'API_AUTH_REQUIRED',
    health: health ?? { mode: 'demo', xConfigured: false, adminAuthConfigured: false, storeMedia: false },
    rules: local.rules ?? [],
    candidates: local.candidates ?? [],
    scans: local.scans ?? [],
  });
  state.stats = computeLocalStats();
  setConnectionState(state.authRequired ? 'locked' : 'demo');
  if (notify) {
    toast(
      state.authRequired ? 'Yönetim API anahtarı gerekli' : 'Demo moduna geçildi',
      state.authRequired
        ? 'Sistem ve OCR ekranından bu oturum için yönetim API anahtarını girin.'
        : 'Yerel API erişilemedi; örnek veriler kullanılıyor.',
      'error',
    );
  }
  renderAll();
}

function computeLocalStats() {
  const byStatus = state.candidates.reduce((accumulator, item) => {
    accumulator[item.status] = (accumulator[item.status] ?? 0) + 1;
    return accumulator;
  }, {});
  return {
    mode: 'demo',
    xConfigured: false,
    rules: state.rules.length,
    activeRules: state.rules.filter((rule) => rule.active).length,
    candidates: state.candidates.length,
    byStatus,
    latestScan: state.scans[0] ?? null,
    runningScans: [],
  };
}

function setConnectionState(mode) {
  const pill = $('#connection-pill');
  const sideDot = $('#sidebar-status-dot');
  const sideMode = $('#sidebar-mode');
  const sideDetail = $('#sidebar-mode-detail');
  pill.classList.remove('live', 'demo', 'locked');
  sideDot.classList.remove('live', 'demo', 'locked');

  if (mode === 'live') {
    pill.classList.add('live');
    sideDot.classList.add('live');
    pill.lastChild.textContent = 'X API bağlı';
    sideMode.textContent = 'Canlı bağlantı';
    sideDetail.textContent = 'X API sunucu üzerinden bağlı';
  } else if (mode === 'demo') {
    pill.classList.add('demo');
    sideDot.classList.add('demo');
    pill.lastChild.textContent = 'Demo modu';
    sideMode.textContent = 'Demo modu';
    sideDetail.textContent = 'Gerçek X taraması kapalı';
  } else if (mode === 'locked') {
    pill.classList.add('locked');
    sideDot.classList.add('locked');
    pill.lastChild.textContent = 'API kilitli';
    sideMode.textContent = 'Yetki gerekli';
    sideDetail.textContent = 'Yönetim API anahtarını girin';
  } else {
    pill.lastChild.textContent = 'Bağlanıyor';
    sideMode.textContent = 'Bağlanıyor';
    sideDetail.textContent = 'Sunucu kontrol ediliyor';
  }
}

function setActiveView(view) {
  if (!PAGE_META[view]) return;
  state.activeView = view;
  $$('.nav-item').forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $$('[data-view-panel]').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.viewPanel === view));
  $('#page-eyebrow').textContent = PAGE_META[view][0];
  $('#page-title').textContent = PAGE_META[view][1];
  document.body.classList.remove('menu-open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function formatDate(value, includeTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
}

function truncate(value, length = 95) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length <= length ? text : `${text.slice(0, length - 1)}…`;
}

function renderAll() {
  if (!state.apiAvailable) state.stats = computeLocalStats();
  renderMetrics();
  renderDashboardCandidates();
  renderRules();
  renderReviewGrid();
  renderSystem();
}

function renderMetrics() {
  const stats = state.stats ?? computeLocalStats();
  const pending = stats.byStatus?.review_pending ?? 0;
  const approved = (stats.byStatus?.approved_internal ?? 0) + (stats.byStatus?.approved_customer ?? 0);
  $('#metric-rules').textContent = String(stats.rules ?? state.rules.length);
  $('#metric-active-rules').textContent = `${stats.activeRules ?? 0} aktif`;
  $('#metric-candidates').textContent = String(stats.candidates ?? state.candidates.length);
  $('#metric-pending').textContent = String(pending);
  $('#metric-approved').textContent = String(approved);
  $('#review-nav-count').textContent = String(pending);

  const scan = stats.latestScan ?? state.scans[0];
  const card = $('#last-scan-card');
  if (scan) {
    card.innerHTML = `<span>Son tarama</span><strong>${escapeHtml(scan.ruleName || 'Tarama')}</strong><small>${formatDate(scan.finishedAt, true)} • ${Number(scan.candidatesCreated || 0)} aday</small>`;
  } else {
    card.innerHTML = '<span>Son tarama</span><strong>Henüz gerçek tarama yok</strong><small>X anahtarı tanımlandıktan sonra başlatılır.</small>';
  }
}

function renderDashboardCandidates() {
  const container = $('#dashboard-candidates');
  const candidates = [...state.candidates]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 4);
  if (!candidates.length) {
    container.innerHTML = '<div class="empty-state compact"><span>⌕</span><h3>Aday bulunamadı</h3><p>Bir tarama kuralı çalıştırın.</p></div>';
    return;
  }
  container.innerHTML = candidates.map((candidate) => `
    <article class="compact-candidate">
      <img src="${escapeHtml(safeImageUrl(candidate.imageUrl || candidate.previewImageUrl))}" alt="${escapeHtml(candidate.selectedPlate || 'Plaka adayı')} görseli">
      <div class="compact-candidate-info"><strong>${escapeHtml(candidate.selectedPlate || 'Plaka okunamadı')}</strong><p>${escapeHtml(truncate(candidate.postText, 82))}</p><small>${escapeHtml(statusLabel(candidate.status))} • ${formatDate(candidate.postedAt)}</small></div>
      <button type="button" data-open-candidate="${escapeHtml(candidate.id)}" aria-label="Kaydı incele">→</button>
    </article>`).join('');
}

function formToRulePreview() {
  const form = $('#rule-form');
  const data = new FormData(form);
  try {
    return buildXQuery({
      terms: splitList(data.get('terms')),
      excludedTerms: splitList(data.get('excludedTerms')),
      locations: splitList(data.get('locations')),
      mediaType: data.get('mediaType'),
      language: 'tr',
      excludeRetweets: true,
    });
  } catch (error) {
    return error.message;
  }
}

function splitList(value) {
  return [...new Set(String(value ?? '').split(/[\n,;]/).map((item) => item.trim()).filter(Boolean))];
}

function renderRules() {
  const container = $('#rules-list');
  $('#rules-count').textContent = `${state.rules.length} kural`;
  if (!state.rules.length) {
    container.innerHTML = '<div class="empty-state compact"><span>⌕</span><h3>Tarama kuralı yok</h3><p>Soldaki formdan ilk kuralı oluşturun.</p></div>';
    return;
  }
  container.innerHTML = state.rules.map((rule) => `
    <article class="rule-card">
      <div class="rule-top">
        <div class="rule-title"><h4>${escapeHtml(rule.name)}</h4><p>${escapeHtml(rule.mode === 'full_archive' ? 'Tam arşiv taraması' : 'Son paylaşımlar taraması')} • ${escapeHtml(rule.mediaType === 'video' ? 'Video' : 'Fotoğraf')}</p></div>
        <span class="rule-status ${rule.active ? 'active' : ''}">${rule.active ? 'AKTİF' : 'PASİF'}</span>
      </div>
      <div class="rule-query">${escapeHtml(rule.query)}</div>
      <div class="rule-meta">
        <span>${rule.terms?.length ?? 0} anahtar kelime</span><span>${rule.locations?.length ?? 0} konum</span><span>${Number(rule.maxPosts || 100)} paylaşım</span><span>${Number(rule.intervalMinutes || 60)} dk.</span>
        ${rule.lastRunAt ? `<span>Son: ${formatDate(rule.lastRunAt, true)}</span>` : ''}
      </div>
      <div class="rule-actions">
        <button class="button button-primary" type="button" data-rule-action="scan" data-rule-id="${escapeHtml(rule.id)}">Şimdi tara</button>
        <button class="button button-secondary" type="button" data-rule-action="toggle" data-rule-id="${escapeHtml(rule.id)}">${rule.active ? 'Otomatiği durdur' : 'Otomatiği aç'}</button>
        <button class="button button-danger" type="button" data-rule-action="delete" data-rule-id="${escapeHtml(rule.id)}">Sil</button>
      </div>
    </article>`).join('');
}

function filteredReviewCandidates() {
  const status = $('#review-status-filter').value;
  const plate = normalizePlate($('#review-plate-filter').value);
  return state.candidates.filter((candidate) => {
    const statusMatches = status === 'all' || candidate.status === status;
    const plateMatches = !plate || String(candidate.selectedPlateNormalized || '').includes(plate);
    return statusMatches && plateMatches;
  });
}

function renderReviewGrid() {
  const container = $('#review-grid');
  const candidates = filteredReviewCandidates();
  if (!candidates.length) {
    container.innerHTML = '<div class="empty-state grid-span-all"><span>✓</span><h3>Bu filtrede kayıt yok</h3><p>Filtreyi değiştirin veya yeni tarama başlatın.</p></div>';
    return;
  }
  container.innerHTML = candidates.map(candidateCardHtml).join('');
}

function candidateCardHtml(candidate) {
  const sourceUrl = safeSourceUrl(candidate.sourceUrl);
  return `<article class="candidate-card">
    <div class="candidate-image"><img src="${escapeHtml(safeImageUrl(candidate.imageUrl || candidate.previewImageUrl))}" alt="${escapeHtml(candidate.selectedPlate || 'Plaka adayı')} kaynak görseli"><span class="candidate-confidence">OCR %${Number(candidate.ocrConfidence ?? 0)}</span></div>
    <div class="candidate-body">
      <div class="candidate-title-row"><h4>${escapeHtml(candidate.selectedPlate || 'Plaka adayı')}</h4><span class="status-badge ${escapeHtml(candidate.status)}">${escapeHtml(statusLabel(candidate.status))}</span></div>
      <p>${escapeHtml(truncate(candidate.postText, 120))}</p>
      <div class="candidate-meta"><span>${formatDate(candidate.postedAt)}${candidate.author?.username ? ` • @${escapeHtml(candidate.author.username)}` : ''}</span><span>${candidate.sourceAvailable === false ? 'Kaynak yok' : 'Kaynak erişilebilir'}</span></div>
      <div class="candidate-actions">
        <button class="button button-secondary" type="button" data-open-candidate="${escapeHtml(candidate.id)}">İncele</button>
        ${sourceUrl ? `<a class="source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">X kaynağı</a>` : '<span class="source-link">Demo kaynak</span>'}
      </div>
    </div>
  </article>`;
}

function renderSystem() {
  const live = Boolean(state.health?.xConfigured);
  $('#system-mode').textContent = live ? 'Canlı X API' : 'Demo / çevrimdışı';
  $('#system-token').textContent = live ? 'Sunucuda tanımlı' : 'Tanımlı değil';
  $('#system-media-store').textContent = state.health?.storeMedia ? 'Açık' : 'Kapalı (önerilen)';
  const authState = $('#api-auth-state');
  if (state.authRequired) authState.textContent = 'Sunucu yönetim API anahtarı istiyor. Doğru anahtarı girip Bağlan düğmesine basın.';
  else if (state.health?.adminAuthConfigured) authState.textContent = 'Yönetim API koruması etkin ve bu oturum yetkilendirildi. Anahtar yalnız sekme oturumunda tutulur.';
  else authState.textContent = 'Sunucuda yönetim API anahtarı tanımlı değil. Uzak ağda yayınlamadan önce etkinleştirin.';
  const pill = $('#system-connection');
  pill.classList.remove('live', 'demo', 'locked');
  if (state.authRequired) pill.classList.add('locked');
  else pill.classList.add(live ? 'live' : 'demo');
  pill.lastChild.textContent = state.authRequired ? 'API anahtarı gerekli' : live ? 'X API bağlı' : 'Demo modu';
}

function openCandidate(candidateId) {
  const candidate = state.candidates.find((item) => item.id === candidateId);
  if (!candidate) return;
  state.currentReviewCandidate = candidate;
  const dialog = $('#review-dialog');
  const form = $('#review-form');
  form.reset();
  form.elements.candidateId.value = candidate.id;
  form.elements.selectedPlate.value = candidate.selectedPlate || '';
  form.elements.reviewer.value = candidate.review?.reviewer || 'OtoTR Yetkilisi';
  form.elements.note.value = candidate.review?.note || '';
  form.elements.plateFullyVisible.checked = candidate.review?.plateFullyVisible === true;
  form.elements.belongsToDamagedVehicle.checked = candidate.review?.belongsToDamagedVehicle === true;
  form.elements.accidentContextConfirmed.checked = candidate.review?.accidentContextConfirmed === true;
  form.elements.customerDisplayAuthorized.checked = candidate.review?.customerDisplayAuthorized === true;
  form.elements.manualPlateOverride.checked = false;
  $('#review-dialog-title').textContent = candidate.selectedPlate || 'Plaka adayı';
  $('#review-image').src = safeImageUrl(candidate.imageUrl || candidate.previewImageUrl);
  $('#review-confidence').textContent = `OCR %${Number(candidate.ocrConfidence ?? 0)}`;
  dialog.showModal();
}

async function reviewCandidate(action) {
  const form = $('#review-form');
  const candidate = state.currentReviewCandidate;
  if (!candidate) return;
  const body = {
    action,
    selectedPlate: form.elements.selectedPlate.value,
    plateFullyVisible: form.elements.plateFullyVisible.checked,
    belongsToDamagedVehicle: form.elements.belongsToDamagedVehicle.checked,
    accidentContextConfirmed: form.elements.accidentContextConfirmed.checked,
    manualPlateOverride: form.elements.manualPlateOverride.checked,
    customerDisplayAuthorized: form.elements.customerDisplayAuthorized.checked,
    reviewer: form.elements.reviewer.value,
    note: form.elements.note.value,
  };

  setReviewButtonsDisabled(true);
  try {
    let updated;
    if (state.apiAvailable) {
      updated = await apiRequest(`/api/candidates/${encodeURIComponent(candidate.id)}/review`, {
        method: 'PATCH', body: JSON.stringify(body),
      });
    } else {
      if (action !== 'reject') {
        const gate = canApproveCandidate(candidate, { ...body, sourceAvailable: candidate.sourceAvailable });
        if (!gate.allowed) {
          const error = new Error(gate.reasons.join(' '));
          error.details = gate.reasons;
          throw error;
        }
        if (action === 'approve_customer' && !body.customerDisplayAuthorized) {
          throw new Error('Alıcıya gösterim yetkisi işaretlenmelidir.');
        }
      }
      updated = {
        ...candidate,
        selectedPlate: formatPlate(body.selectedPlate),
        selectedPlateNormalized: normalizePlate(body.selectedPlate),
        status: action === 'reject' ? 'rejected' : action === 'approve_customer' ? 'approved_customer' : 'approved_internal',
        review: { ...body, reviewedAt: new Date().toISOString() },
        updatedAt: new Date().toISOString(),
      };
      state.candidates = state.candidates.map((item) => item.id === candidate.id ? updated : item);
      saveLocalDemo();
    }
    $('#review-dialog').close();
    state.currentReviewCandidate = null;
    if (state.apiAvailable) await loadData(); else renderAll();
    toast('Moderasyon kaydedildi', `${updated.selectedPlate} • ${statusLabel(updated.status)}`);
  } catch (error) {
    toast('Onay tamamlanamadı', error.details?.join?.(' ') || error.message, 'error');
  } finally {
    setReviewButtonsDisabled(false);
  }
}

function setReviewButtonsDisabled(value) {
  $$('[data-review-action]').forEach((button) => { button.disabled = value; });
}

async function createRule(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  const body = {
    name: data.get('name'),
    terms: splitList(data.get('terms')),
    excludedTerms: splitList(data.get('excludedTerms')),
    locations: splitList(data.get('locations')),
    mode: data.get('mode'),
    mediaType: data.get('mediaType'),
    startTime: localDateTimeToIso(data.get('startTime')),
    endTime: localDateTimeToIso(data.get('endTime')),
    intervalMinutes: Number(data.get('intervalMinutes')),
    maxPosts: Number(data.get('maxPosts')),
    active: data.get('active') === 'on',
    language: 'tr',
  };
  try {
    body.query = buildXQuery(body);
    if (state.apiAvailable) {
      await apiRequest('/api/rules', { method: 'POST', body: JSON.stringify(body) });
      await loadData();
    } else {
      const now = new Date().toISOString();
      state.rules.unshift({ ...body, id: createId('rule'), createdAt: now, updatedAt: now, lastRunAt: null, nextRunAt: null, demo: true });
      saveLocalDemo();
      renderAll();
    }
    form.reset();
    form.elements.intervalMinutes.value = '60';
    form.elements.maxPosts.value = '100';
    form.elements.terms.value = DEFAULT_ACCIDENT_TERMS.join(', ');
    form.elements.excludedTerms.value = DEFAULT_EXCLUDED_TERMS.join(', ');
    $('#query-preview').textContent = formToRulePreview();
    toast('Tarama kuralı kaydedildi', body.name);
  } catch (error) {
    toast('Kural kaydedilemedi', error.message, 'error');
  }
}

function localDateTimeToIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function handleRuleAction(button) {
  const rule = state.rules.find((item) => item.id === button.dataset.ruleId);
  if (!rule) return;
  const action = button.dataset.ruleAction;
  button.disabled = true;
  try {
    if (action === 'scan') {
      if (!state.apiAvailable || !state.health?.xConfigured) {
        throw new Error('Gerçek tarama için sunucuda X_BEARER_TOKEN tanımlanmalıdır. Demo verileri değişmedi.');
      }
      toast('Tarama başlatıldı', `${rule.name} işleniyor.`);
      const scan = await apiRequest('/api/scans', { method: 'POST', body: JSON.stringify({ ruleId: rule.id }), timeout: 10 * 60_000 });
      await loadData();
      toast('Tarama tamamlandı', `${scan.postsScanned} paylaşım, ${scan.candidatesCreated} plakalı aday.`);
    }
    if (action === 'toggle') {
      const desiredActive = !rule.active;
      if (state.apiAvailable) {
        await apiRequest(`/api/rules/${encodeURIComponent(rule.id)}`, { method: 'PATCH', body: JSON.stringify({ active: desiredActive }) });
        await loadData();
      } else {
        rule.active = desiredActive;
        rule.updatedAt = new Date().toISOString();
        saveLocalDemo();
        renderAll();
      }
      toast('Otomatik tarama güncellendi', `${rule.name}: ${desiredActive ? 'aktif' : 'pasif'}`);
    }
    if (action === 'delete') {
      if (!window.confirm(`“${rule.name}” kuralı silinsin mi?`)) return;
      if (state.apiAvailable) {
        await apiRequest(`/api/rules/${encodeURIComponent(rule.id)}`, { method: 'DELETE' });
        await loadData();
      } else {
        state.rules = state.rules.filter((item) => item.id !== rule.id);
        saveLocalDemo();
        renderAll();
      }
      toast('Kural silindi', rule.name);
    }
  } catch (error) {
    toast('İşlem tamamlanamadı', error.message, 'error');
  } finally {
    button.disabled = false;
  }
}

async function lookupPlate(plate, audience = state.lookupAudience) {
  if (!isValidTurkishPlate(plate)) {
    throw new Error('Geçerli bir Türkiye plakası girin. Örnek: 34 ABC 123.');
  }
  if (state.apiAvailable) {
    return apiRequest(`/api/plates/${encodeURIComponent(plate)}?audience=${encodeURIComponent(audience)}`);
  }
  const normalized = normalizePlate(plate);
  const statuses = audience === 'customer'
    ? new Set(['approved_customer'])
    : new Set(['approved_internal', 'approved_customer']);
  const matches = state.candidates
    .filter((candidate) => candidate.selectedPlateNormalized === normalized && candidate.sourceAvailable !== false && statuses.has(candidate.status))
    .map((candidate) => ({
      ...candidate,
      plate: candidate.selectedPlate,
      plateNormalized: candidate.selectedPlateNormalized,
      disclaimer: 'Bu kayıt resmî hasar/Tramer kaydı değildir; kamuya açık kaynak görseli ile plakanın doğrulanmış teknik eşleşmesidir.',
    }));
  return { plate: formatPlate(plate), normalized, audience, exactMatch: true, count: matches.length, matches };
}

async function performLookup(plate) {
  const results = $('#lookup-results');
  results.innerHTML = '<div class="loading-shimmer"></div>';
  try {
    const payload = await lookupPlate(plate);
    renderLookupResults(payload);
  } catch (error) {
    results.innerHTML = `<div class="empty-state"><span>!</span><h3>Sorgu yapılamadı</h3><p>${escapeHtml(error.message)}</p></div>`;
    toast('Plaka sorgusu başarısız', error.message, 'error');
  }
}

function renderLookupResults(payload) {
  const results = $('#lookup-results');
  if (!payload.matches?.length) {
    results.innerHTML = `<div class="empty-state"><span>⌕</span><h3>${escapeHtml(payload.plate)} için onaylı kayıt bulunamadı</h3><p>${payload.audience === 'customer' ? 'Alıcı ekranında yalnız ayrıca gösterim yetkisi verilmiş kayıtlar yer alır.' : 'Onay kuyruğundaki veya reddedilen kayıtlar usta ekranına aktarılmaz.'}</p></div>`;
    return;
  }
  results.innerHTML = `
    <div class="lookup-result-header"><div><h3>${escapeHtml(payload.plate)} • Tam eşleşme</h3><p>${payload.audience === 'customer' ? 'Alıcı görünümü' : 'Usta görünümü'} • benzer plaka kullanılmadı</p></div><strong>${payload.count} kayıt bulundu</strong></div>
    <div class="lookup-result-grid">${payload.matches.map(lookupRecordHtml).join('')}</div>`;
}

function lookupRecordHtml(record) {
  const sourceUrl = safeSourceUrl(record.sourceUrl);
  return `<article class="lookup-record"><div class="lookup-record-inner">
    <img src="${escapeHtml(safeImageUrl(record.imageUrl || record.previewImageUrl))}" alt="${escapeHtml(record.plate)} olay görseli">
    <div class="lookup-record-content"><span class="section-kicker">DOĞRULANMIŞ AÇIK KAYNAK EŞLEŞMESİ</span><h4>${escapeHtml(record.plate)}</h4><p>${escapeHtml(truncate(record.postText, 240))}</p>
      <dl><div><dt>Paylaşım tarihi</dt><dd>${formatDate(record.postedAt, true)}</dd></div><div><dt>Kaynak</dt><dd>${escapeHtml(record.sourcePlatform || 'X')}</dd></div>${record.author?.username ? `<div><dt>Paylaşan</dt><dd>@${escapeHtml(record.author.username)}</dd></div>` : ''}<div><dt>Kaynak durumu</dt><dd>${record.sourceAvailable === false ? 'Erişilemiyor' : 'Erişilebilir'}</dd></div>${record.ocrConfidence != null ? `<div><dt>OCR güveni</dt><dd>%${Number(record.ocrConfidence)}</dd></div>` : ''}</dl>
      ${sourceUrl ? `<a class="button button-secondary button-full" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Kaynak paylaşımı aç</a>` : ''}
      <p class="disclaimer">${escapeHtml(record.disclaimer)}</p>
    </div></div></article>`;
}

async function runOcr(event) {
  event.preventDefault();
  const file = $('#ocr-file').files[0];
  if (!file) return;
  if (!state.apiAvailable) {
    toast('OCR sunucusu gerekli', 'Yerel demo yalnız arayüzü gösterir. OCR için Node sunucusunu çalıştırın.', 'error');
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    toast('Dosya çok büyük', 'En fazla 12 MB görsel seçin.', 'error');
    return;
  }
  const button = $('#ocr-form button[type="submit"]');
  button.disabled = true;
  button.textContent = 'OCR işleniyor…';
  $('#ocr-result').innerHTML = '<div class="loading-shimmer"></div>';
  try {
    const dataUrl = await readFileAsDataUrl(file);
    const result = await apiRequest('/api/ocr', { method: 'POST', body: JSON.stringify({ imageDataUrl: dataUrl }), timeout: 5 * 60_000 });
    if (result.plateCandidates.length) {
      $('#ocr-result').innerHTML = `<p><strong>OCR güveni: %${Number(result.confidence)}</strong></p><div class="ocr-plates">${result.plateCandidates.map((item) => `<span class="ocr-plate">${escapeHtml(item.plate)}</span>`).join('')}</div><details><summary>OCR ham metni</summary><pre>${escapeHtml(result.text)}</pre></details>`;
    } else {
      $('#ocr-result').innerHTML = `<p><strong>Geçerli Türkiye plakası bulunamadı.</strong></p><details><summary>OCR ham metni</summary><pre>${escapeHtml(result.text)}</pre></details>`;
    }
  } catch (error) {
    $('#ocr-result').innerHTML = `<p><strong>OCR çalıştırılamadı:</strong> ${escapeHtml(error.message)}</p>`;
    toast('OCR başarısız', error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'OCR analizini çalıştır';
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Görsel okunamadı.'));
    reader.readAsDataURL(file);
  });
}

async function runComplianceCheck() {
  const button = $('#compliance-button');
  if (!state.apiAvailable || !state.health?.xConfigured) {
    toast('Canlı X bağlantısı gerekli', 'Kaynak denetimi demo modunda çalıştırılmaz.', 'error');
    return;
  }
  button.disabled = true;
  button.textContent = 'Kaynaklar kontrol ediliyor…';
  try {
    const result = await apiRequest('/api/compliance/recheck', { method: 'POST', body: JSON.stringify({ limit: 100 }), timeout: 5 * 60_000 });
    $('#compliance-result').textContent = `${result.checked} kayıt kontrol edildi; ${result.available} erişilebilir, ${result.removed} kaldırılmış.`;
    await loadData();
    toast('Kaynak denetimi tamamlandı', `${result.removed} kayıt kullanımdan düşürüldü.`);
  } catch (error) {
    toast('Denetim tamamlanamadı', error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Kaynakları yeniden kontrol et';
  }
}

function toast(title, message, type = 'success') {
  const region = $('#toast-region');
  const element = document.createElement('div');
  element.className = `toast ${type === 'error' ? 'error' : ''}`;
  element.innerHTML = `<span>${type === 'error' ? '!' : '✓'}</span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p></div>`;
  region.append(element);
  setTimeout(() => element.remove(), 5200);
}

function bindEvents() {
  $$('.nav-item').forEach((button) => button.addEventListener('click', () => setActiveView(button.dataset.view)));
  $$('[data-go-view]').forEach((button) => button.addEventListener('click', () => setActiveView(button.dataset.goView)));
  $('#mobile-menu').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  document.addEventListener('click', (event) => {
    if (document.body.classList.contains('menu-open') && !event.target.closest('.sidebar') && !event.target.closest('#mobile-menu')) document.body.classList.remove('menu-open');
    const candidateButton = event.target.closest('[data-open-candidate]');
    if (candidateButton) openCandidate(candidateButton.dataset.openCandidate);
    const ruleButton = event.target.closest('[data-rule-action]');
    if (ruleButton) handleRuleAction(ruleButton);
  });
  $('#refresh-button').addEventListener('click', () => loadData({ notify: true }));
  $('#rule-form').addEventListener('submit', createRule);
  $('#rule-form').addEventListener('input', () => { $('#query-preview').textContent = formToRulePreview(); });
  $('#review-status-filter').addEventListener('change', renderReviewGrid);
  $('#review-plate-filter').addEventListener('input', renderReviewGrid);
  $$('[data-review-action]').forEach((button) => button.addEventListener('click', () => reviewCandidate(button.dataset.reviewAction)));
  $('#dashboard-lookup-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const plate = new FormData(event.currentTarget).get('plate');
    $('#lookup-plate').value = plate;
    setActiveView('lookup');
    performLookup(plate);
  });
  $('#lookup-form').addEventListener('submit', (event) => {
    event.preventDefault();
    performLookup(new FormData(event.currentTarget).get('plate'));
  });
  $$('.audience-switch button').forEach((button) => button.addEventListener('click', () => {
    state.lookupAudience = button.dataset.audience;
    $$('.audience-switch button').forEach((item) => item.classList.toggle('is-active', item === button));
    const plate = $('#lookup-plate').value;
    if (plate) performLookup(plate);
  }));
  $('#api-token-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const token = $('#admin-api-token').value.trim();
    try {
      if (token) sessionStorage.setItem('ototr-x-admin-api-token', token);
      else sessionStorage.removeItem('ototr-x-admin-api-token');
      $('#admin-api-token').value = '';
      await loadData({ notify: true });
    } catch {
      toast('Oturum anahtarı kaydedilemedi', 'Tarayıcı oturum depolamasına erişilemiyor.', 'error');
    }
  });
  $('#ocr-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    $('#ocr-preview').src = await readFileAsDataUrl(file);
    $('#ocr-preview').hidden = false;
  });
  $('#ocr-form').addEventListener('submit', runOcr);
  $('#compliance-button').addEventListener('click', runComplianceCheck);
}

function initializeRuleForm() {
  const form = $('#rule-form');
  form.elements.terms.value = DEFAULT_ACCIDENT_TERMS.join(', ');
  form.elements.excludedTerms.value = DEFAULT_EXCLUDED_TERMS.join(', ');
  $('#query-preview').textContent = formToRulePreview();
}

bindEvents();
initializeRuleForm();
loadData();
