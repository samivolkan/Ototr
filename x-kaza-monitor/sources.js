const $ = (selector) => document.querySelector(selector);
const state = { sources: [], articles: [] };

function escapeHtml(value = '') {
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function formatDate(value, withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('tr-TR', withTime ? { dateStyle:'medium', timeStyle:'short' } : { dateStyle:'medium' }).format(date);
}

function adminToken() {
  try { return sessionStorage.getItem('ototr-x-admin-api-token') || ''; } catch { return ''; }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type':'application/json' } : {}),
      ...(adminToken() ? { Authorization:`Bearer ${adminToken()}` } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    const error = new Error(payload?.error?.message || `İstek başarısız (${response.status})`);
    error.code = payload?.error?.code;
    throw error;
  }
  return payload.data;
}

function toast(title, message, type = '') {
  const region = $('#toast-region');
  const item = document.createElement('div');
  item.className = `toast ${type}`;
  item.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p>`;
  region.appendChild(item);
  setTimeout(() => item.remove(), 4500);
}

function setConnection(mode, label) {
  const el = $('#source-connection');
  el.classList.remove('live','demo','locked');
  el.classList.add(mode);
  el.lastChild.textContent = label;
}

function renderSources() {
  const grid = $('#source-grid');
  if (!state.sources.length) {
    grid.innerHTML = '<div class="empty-state"><span>◎</span><h3>Kaynak bulunamadı</h3><p>TRT Haber kaynağı seed edilmemiş olabilir.</p></div>';
    return;
  }
  grid.innerHTML = state.sources.map((source) => {
    const disabled = source.enabled === false;
    const lastError = source.lastError?.message || source.lastError || null;
    return `<article class="source-card ${disabled ? 'is-disabled' : ''}" data-source-card="${escapeHtml(source.id)}">
      <div class="source-head">
        <div class="source-brand"><div class="source-logo">${source.type === 'rss_news' ? 'H' : 'X'}</div><div><h3>${escapeHtml(source.name)}</h3><small>${escapeHtml(source.type === 'rss_news' ? 'HABER • RSS' : source.type || 'Kaynak')}</small></div></div>
        <span class="source-status">${disabled ? 'PASİF' : source.scanRunning ? 'TARANIYOR' : 'AKTİF'}</span>
      </div>
      <div class="source-stats">
        <div class="source-stat"><small>Toplam haber</small><strong>${Number(source.totalArticlesFound || 0)}</strong></div>
        <div class="source-stat"><small>İşlenen görsel</small><strong>${Number(source.totalImagesScanned || 0)}</strong></div>
        <div class="source-stat"><small>Plaka adayı</small><strong>${Number(source.currentCandidates || source.totalPlateCandidates || 0)}</strong></div>
        <div class="source-stat"><small>Onaylı</small><strong>${Number(source.approvedCandidates || 0)}</strong></div>
      </div>
      <div class="source-meta">
        <div><strong>Son tarama:</strong> ${formatDate(source.lastScanAt, true)}</div>
        <div><strong>Son başarılı:</strong> ${formatDate(source.lastSuccessfulScanAt, true)}</div>
        <div><strong>Rate limit:</strong> ${Number(source.rateLimitMs || 0)} ms</div>
        <div><strong>Feed:</strong> <code>${escapeHtml(source.feedUrl || '—')}</code></div>
      </div>
      ${lastError ? `<div class="source-message error"><strong>Son hata:</strong> ${escapeHtml(String(lastError))}</div>` : '<div class="source-message success">Kaynak hazır. Fotoğrafta OCR plakası bulunursa onay kuyruğuna düşer.</div>'}
      <div class="source-actions">
        <button class="button button-primary" type="button" data-source-action="scan" data-source-id="${escapeHtml(source.id)}" ${disabled || source.scanRunning ? 'disabled' : ''}>${source.scanRunning ? 'Taranıyor…' : 'Şimdi tara'}</button>
        <button class="button button-secondary" type="button" data-source-action="toggle" data-source-id="${escapeHtml(source.id)}">${disabled ? 'Kaynağı aç' : 'Kaynağı kapat'}</button>
      </div>
    </article>`;
  }).join('');
}

function renderArticles() {
  $('#article-count').textContent = `${state.articles.length} haber`;
  const body = $('#article-body');
  if (!state.articles.length) {
    body.innerHTML = '<tr><td colspan="5">Henüz haber kaydı yok. TRT Haber kaynağında “Şimdi tara” düğmesini kullanın.</td></tr>';
    return;
  }
  body.innerHTML = state.articles.slice(0,100).map((article) => {
    const href = /^https:\/\//.test(article.url || article.canonicalUrl || '') ? (article.url || article.canonicalUrl) : null;
    const title = escapeHtml(article.title || 'Başlıksız haber');
    return `<tr><td>${formatDate(article.publishedAt, true)}</td><td>${href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${title}</a>` : title}</td><td>${escapeHtml(article.sourceName || article.sourceId || '—')}</td><td>${Number(article.imageCount || article.images?.length || 0)}</td><td>${escapeHtml(article.status || 'işlendi')}</td></tr>`;
  }).join('');
}

async function load() {
  setConnection('demo','Yükleniyor');
  try {
    const [sources, articles] = await Promise.all([api('/api/sources'), api('/api/articles')]);
    state.sources = sources;
    state.articles = articles;
    renderSources();
    renderArticles();
    setConnection('live','Kaynak API bağlı');
  } catch (error) {
    setConnection(error.code === 'API_AUTH_REQUIRED' ? 'locked' : 'demo', error.code === 'API_AUTH_REQUIRED' ? 'Yetki gerekli' : 'Bağlantı hatası');
    toast('Kaynaklar yüklenemedi', error.message, 'error');
  }
}

async function sourceAction(button) {
  const id = button.dataset.sourceId;
  const action = button.dataset.sourceAction;
  const source = state.sources.find((item) => item.id === id);
  if (!source) return;
  button.disabled = true;
  try {
    if (action === 'toggle') {
      await api(`/api/sources/${encodeURIComponent(id)}`, { method:'PATCH', body:JSON.stringify({ enabled: source.enabled === false }) });
      toast('Kaynak güncellendi', source.enabled === false ? 'Kaynak etkinleştirildi.' : 'Kaynak pasife alındı.');
    } else if (action === 'scan') {
      toast('Tarama başladı', `${source.name} RSS ve haber görselleri işleniyor.`);
      const result = await api(`/api/sources/${encodeURIComponent(id)}/scan`, { method:'POST', body:'{}' });
      toast('Tarama tamamlandı', `${Number(result.articlesMatched || 0)} haber eşleşti, ${Number(result.imagesScanned || 0)} görsel işlendi, ${Number(result.candidatesCreated || 0)} plaka adayı oluşturuldu.`);
    }
    await load();
  } catch (error) {
    toast('İşlem başarısız', error.message, 'error');
    await load();
  } finally {
    button.disabled = false;
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-source-action]');
  if (button) sourceAction(button);
});
$('#source-refresh').addEventListener('click', load);
load();
