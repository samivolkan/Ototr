import { createHrApiFromBrowser } from './hr-api-bridge.mjs';

const state = {
  mode: 'loading',
  message: 'İK sunucu sınırı doğrulanıyor…',
  dashboard: null,
  readiness: [],
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]);
}

function renderStatus() {
  const status = document.getElementById('hr-backend-status');
  if (status) {
    status.className = `backend-status ${state.mode}`;
    status.textContent = state.message;
  }

  const target = document.getElementById('hr-backend-readiness');
  if (!target) return;
  if (!state.readiness.length) {
    target.innerHTML = `<div class="alert ${state.mode === 'ready' ? '' : 'r'}">${escapeHtml(state.message)}</div>`;
    return;
  }
  const dashboard = state.dashboard || {};
  target.innerHTML = `
    <div class="card">
      <h2>Sunucu doğrulaması</h2>
      <div class="alert">${escapeHtml(state.message)}</div>
      <div class="grid">
        <div class="stat"><b>${Number(dashboard.employees || 0)}</b><span>erişilebilir çalışan</span></div>
        <div class="stat"><b>${Number(dashboard.pendingLeave || 0)}</b><span>bekleyen izin</span></div>
        <div class="stat"><b>${Number(dashboard.openWorkflows || 0)}</b><span>açık iş akışı</span></div>
        <div class="stat"><b>${Number(dashboard.pendingPayrollShadow || 0)}</b><span>bekleyen gölge bordro</span></div>
      </div>
      <div class="readiness-grid">${state.readiness.map((gate) => {
        const css = gate.status === 'PASSED' ? 'ok' : gate.status === 'BLOCKED' || gate.status === 'EXCLUDED_BY_SCOPE' ? 'block' : '';
        return `<div class="readiness-card ${css}"><b>${escapeHtml(gate.title)}</b><span>${escapeHtml(gate.status)}</span></div>`;
      }).join('')}</div>
    </div>`;
}

async function loadServerState() {
  let api;
  try {
    api = createHrApiFromBrowser();
  } catch (error) {
    state.mode = 'blocked';
    state.message = error.message;
    renderStatus();
    return;
  }
  if (!api) {
    state.mode = 'pilot';
    state.message = 'Güvenli pilot: sunucu yapılandırması veya geçerli ERP oturumu yok; yalnızca sentetik tarayıcı verisi gösteriliyor.';
    renderStatus();
    return;
  }
  try {
    const [context, dashboard, readiness] = await Promise.all([
      api.rpc('hr_my_context'),
      api.rpc('hr_dashboard'),
      api.rpc('hr_readiness_snapshot'),
    ]);
    state.mode = 'ready';
    state.dashboard = dashboard;
    state.readiness = Array.isArray(readiness) ? readiness : [];
    state.message = context.realPersonDataAllowed
      ? 'İK sunucu sınırı doğrulandı.'
      : 'İK sunucu sınırı doğrulandı; gerçek kişi verisi üretim kapısında kilitli.';
  } catch (error) {
    state.mode = 'blocked';
    state.message = error.message;
  }
  renderStatus();
}

const view = document.getElementById('view');
if (view) new MutationObserver(renderStatus).observe(view, { childList: true });
renderStatus();
loadServerState();
