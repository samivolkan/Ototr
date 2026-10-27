(function () {
  'use strict';

  const AI_ENDPOINT = 'https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/google-review-ai';
  const workflow = { items: [], loaded: false, loading: false, error: '' };
  const statusNames = { approval_pending: 'Onay bekliyor', publishing: 'Yayın doğrulanıyor', published: 'Google’da yayımlandı', publish_failed: 'Yayımlanamadı', publish_unknown: 'Yayın sonucu belirsiz', open: 'Açık görev', done: 'Tamamlandı' };
  const kindNames = { reply: 'Yanıt taslağı', branch: 'Şube yanıt görevi', complaint: 'Müşteri deneyimi görevi', legal: 'Hukuk incelemesi', quality: 'Kalite incelemesi', crisis: 'Kriz incelemesi' };
  const sourceNames = { openai: 'OpenAI taslağı', local_template: 'Yerel şablon · AI bağlantısı başarısız', manual: 'Elle düzenlenen taslak' };
  let editor = null, generationSequence = 0;
  const pendingTasks = new Set();
  const rerender = () => window.OTOTRGoogleReputation?.render?.();

  function esc(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  async function session() {
    if (typeof window.OTOTRGetLiveSession === 'function') {
      try { return await window.OTOTRGetLiveSession(); } catch (_) {}
    }
    try { return JSON.parse(localStorage.getItem('ototr-dealer-supabase-session-v1') || 'null'); }
    catch (_) { return null; }
  }

  function supabaseKey() {
    if (typeof window.OTOTRGetSupabaseKey === 'function') {
      try { return window.OTOTRGetSupabaseKey(); } catch (_) {}
    }
    try { return typeof DEALER_SUPABASE_KEY === 'undefined' ? '' : DEALER_SUPABASE_KEY; }
    catch (_) { return ''; }
  }

  function fallbackReply(review, branch) {
    const team = `${String(branch.replySignatureName || branch.name || 'OTOTR').replace(/ Test Şube$/i, '').trim()} ekibi`;
    if (Number(review.rating) >= 4) {
      return `Deneyiminizi bizimle paylaştığınız için çok teşekkür ederiz. Güzel değerlendirmeniz ekibimiz için çok kıymetli; sizi yeniden ağırlamaktan memnuniyet duyarız.\n\n${team}`;
    }
    return `Geri bildiriminizi dikkatle okuduk. Yaşadığınız deneyimi inceleyip gerekli iyileştirmeleri yapabilmemiz için konuyu şube yönetimimizle değerlendireceğiz. Bizimle iletişime geçerseniz size doğrudan yardımcı olmak isteriz.\n\n${team}`;
  }

  function ensureModal() {
    let modal = document.getElementById('googleReviewAiModal');
    if (modal) return modal;
    const style = document.createElement('style');
    style.textContent = `
      .google-ai-modal{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.58);display:none;place-items:center;padding:20px}
      .google-ai-modal.open{display:grid}.google-ai-dialog{width:min(720px,100%);max-height:90vh;overflow:auto;background:#fff;border:1px solid #dbe3ee;border-radius:18px;box-shadow:0 30px 80px rgba(15,23,42,.25);padding:20px;color:#18202b}
      .google-ai-dialog h2{margin:0;font-size:22px}.google-ai-dialog p{color:#667085;line-height:1.5}.google-ai-dialog textarea{width:100%;min-height:180px;resize:vertical;border:1px solid #cfd8e6;border-radius:12px;padding:14px;font:inherit;line-height:1.55;box-sizing:border-box}
      .google-ai-meta{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.google-ai-meta span{padding:5px 8px;border-radius:999px;background:#f2f5f9;font-size:11px;font-weight:800}
      .google-ai-warning{border:1px solid #f8d49b;background:#fff8eb;border-radius:10px;padding:10px 12px;color:#805100;font-size:12px;margin:12px 0}
      .google-ai-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:14px}.google-ai-actions button{border:1px solid #d4dce8;background:#fff;border-radius:9px;padding:9px 12px;font-weight:800;cursor:pointer}.google-ai-actions .primary{background:#111827;color:#fff;border-color:#111827}
      .google-ai-actions button:disabled{opacity:.45;cursor:not-allowed}.google-ai-approval{display:flex;gap:9px;align-items:flex-start;margin-top:14px;font-size:13px;line-height:1.5}.google-ai-existing{white-space:pre-wrap;padding:12px;border:1px solid #dbe3ee;border-radius:10px}.google-workflow-row{padding:14px 0;border-bottom:1px solid var(--line,#dbe3ee)}.google-workflow-row:last-child{border-bottom:0}.google-workflow-row p{white-space:pre-wrap;overflow-wrap:anywhere}.google-workflow-head{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap}
      body.dark-mode .google-ai-dialog{background:#111f33;color:#f1f5f9;border-color:#2b3c56}body.dark-mode .google-ai-dialog textarea{background:#0b1627;color:#f1f5f9;border-color:#40516b}
      .google-ai-dialog [hidden]{display:none!important}
    `;
    document.head.appendChild(style);
    modal = document.createElement('div');
    modal.id = 'googleReviewAiModal';
    modal.className = 'google-ai-modal';
    modal.innerHTML = `<section class="google-ai-dialog" role="dialog" aria-modal="true" aria-labelledby="googleAiTitle">
      <h2 id="googleAiTitle">Yanıt taslağı</h2><p id="googleAiContext"></p>
      <div class="google-ai-meta" id="googleAiMeta"></div>
      <div class="google-ai-existing" id="googleAiExisting" hidden></div>
      <textarea id="googleAiReply" aria-label="Google yorum yanıt taslağı"></textarea>
      <label id="googleTaskStateLabel" hidden>Görev durumu <select id="googleTaskState"><option value="open">Açık</option><option value="done">Tamamlandı</option></select></label>
      <div class="google-ai-warning" id="googleAiWarning" role="status" aria-live="polite"></div>
      <label class="google-ai-approval" id="googleAiApproval"><input type="checkbox" id="googleAiApprove">Bu şubeyi, yorumu ve kayıtlı yanıt metnini kontrol ettim. Yanıtın Google’da herkese açık yayımlanmasını onaylıyorum.</label>
      <div class="google-ai-actions"><button type="button" data-google-ai-close>Kapat</button><button type="button" data-google-ai-regenerate>Yeniden üret</button><button type="button" data-google-ai-queue>Taslağı kaydet</button><button type="button" data-google-ai-verify>Yayın sonucunu kontrol et</button><button type="button" class="primary" data-google-ai-publish>Onayla ve Google’da yayımla</button></div>
    </section>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (event) => { if (event.target === modal || event.target.closest('[data-google-ai-close]')) modal.classList.remove('open'); });
    modal.querySelector('[data-google-ai-regenerate]').addEventListener('click', () => regenerateEditor());
    modal.querySelector('[data-google-ai-queue]').addEventListener('click', () => saveEditor());
    modal.querySelector('[data-google-ai-publish]').addEventListener('click', () => publishEditor(false));
    modal.querySelector('[data-google-ai-verify]').addEventListener('click', () => publishEditor(true));
    modal.querySelector('#googleAiReply').addEventListener('input', () => { modal.querySelector('#googleAiApprove').checked = false; updateEditorControls(); });
    modal.querySelector('#googleAiApprove').addEventListener('change', updateEditorControls);
    return modal;
  }

  async function requestDraft(review, branch) {
    const auth = await session();
    const key = supabaseKey();
    if (!auth?.access_token || !key) throw new Error('ERP oturumu veya backend bağlantısı bulunamadı.');
    const response = await globalThis.fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate', review: { id: review.id, rating: review.rating, comment: review.comment }, branch: { id: branch.id, name: branch.name, city: branch.city, replySignatureName: branch.replySignatureName } })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || `AI servisi ${response.status} hatası verdi (${new URL(response.url).hostname}).`);
    return data;
  }

  async function googleBusinessRequest(action, extra = {}) {
    const auth = await session();
    const key = supabaseKey();
    if (!auth?.access_token) throw new Error('ERP oturumu süresi dolmuş. Lütfen ERP’ye tekrar giriş yapın.');
    if (!key) throw new Error('Supabase bağlantı anahtarı bulunamadı.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await globalThis.fetch('https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/google-business-oauth', {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(googleBusinessError(data.error || `Google bağlantı servisi ${response.status} hatası verdi.`));
        error.status = response.status;
        throw error;
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('Google bağlantısı 30 saniye içinde yanıt vermedi. Listeyi yenileyip işlem sonucunu kontrol edin.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function googleBusinessError(message) {
    const text = String(message || 'Google verisi alınamadı.');
    if (/has not been used in project.*before or it is disabled|SERVICE_DISABLED|API.*disabled/i.test(text)) {
      const api = text.match(/(?:My Business|Google My Business)[\w ]*API/i)?.[0] || 'Google Business Profile API';
      return `Google hesabı bağlı, ancak ${api} erişimi Google Cloud projesinde etkin değil. Bu API etkinleştirildikten sonra Google Senkronize Et ile yeniden deneyin.`;
    }
    if (/quota|RESOURCE_EXHAUSTED|rate limit/i.test(text)) return 'Google Business Profile API erişim kotası bu isteği karşılamıyor. Google Cloud kotası 0 ise Business Profile API erişim onayı ve kota tanımlanması gerekir; tekrar bağlanmak veya yeniden denemek bunu çözmez. Kota 0’dan yüksekse kullanım sınırını kontrol edin.';
    return text;
  }

  async function connectGoogleBusiness() {
    try {
      const data = await googleBusinessRequest('start');
      if (!data.auth_url) throw new Error('Google yetkilendirme adresi alınamadı.');
      location.assign(data.auth_url);
    } catch (error) {
      window.OTOTRGoogleReputation?.setError(error.message);
      if (typeof window.toast === 'function') window.toast(error.message);
    }
  }

  async function googleBusinessStatus() {
    return googleBusinessRequest('status');
  }

  function identityFor(review, branch) {
    const identity = { account_id: branch.googleBusinessAccountId, location_id: branch.googleBusinessLocationId, review_id: review.googleReviewId, branch_id: branch.id };
    if (!identity.account_id || !identity.location_id || !identity.review_id) throw new Error('Önce bu şubenin gerçek Google yorumlarını senkronize edin.');
    return identity;
  }

  async function refreshWorkflow() {
    if (workflow.loading) return;
    workflow.loading = true; workflow.error = ''; rerender();
    try {
      const items = []; let offset = 0;
      do {
        const data = await googleBusinessRequest('workflow_list', { offset });
        if (!Array.isArray(data.items)) throw new Error('Görev listesi okunamadı.');
        items.push(...data.items);
        const next = data.next_offset;
        if (next != null && (!Number.isSafeInteger(next) || next <= offset)) throw new Error('Görev listesi sayfalaması geçersiz.');
        offset = next;
        if (items.length > 10000) throw new Error('Görev listesi çok büyük; yönetici incelemesi gerekli.');
      } while (offset != null);
      workflow.items = items; workflow.loaded = true;
    } catch (error) {
      workflow.error = error.message;
      if ([401, 403].includes(error.status)) { workflow.items = []; workflow.loaded = false; }
    }
    finally { workflow.loading = false; rerender(); }
  }

  function remember(item) {
    workflow.items = [item, ...workflow.items.filter(row => row.id !== item.id)];
    workflow.error = ''; rerender();
  }

  function renderWorkflow(branchId) {
    const items = workflow.items.filter(item => item.branch_id === branchId);
    const pending = workflow.loaded ? items.filter(item => item.kind === 'reply' && item.status !== 'published').length : '—';
    const tasks = workflow.loaded ? items.filter(item => item.kind !== 'reply' && item.status === 'open').length : '—';
    return `<section class="google-premium-card" data-testid="google-workflow"><div class="google-premium-title"><div><h3>Yanıt onayları ve şube görevleri</h3><p>Genel merkezde ortak kayıt · ${pending} yanıt bekliyor · ${tasks} açık görev</p></div><button type="button" class="google-action-btn" data-google-work-refresh ${workflow.loading ? 'disabled' : ''}>${workflow.loading ? 'Yükleniyor…' : 'Listeyi yenile'}</button></div>${workflow.error ? `<div class="google-ai-warning" role="alert">${esc(workflow.error)}${workflow.loaded ? ' Son alınan kayıtlar gösteriliyor.' : ' Görevler henüz alınamadı.'}</div>` : ''}${items.length ? items.map(item => `<article class="google-workflow-row"><div class="google-workflow-head"><strong>${esc(kindNames[item.kind] || item.kind)}</strong><span class="badge b-blue">${esc(statusNames[item.status] || item.status)}</span></div><p>${esc(item.review_snapshot?.rating || '—')}/5 · ${esc(item.review_snapshot?.comment || 'Yalnız yıldız değerlendirmesi')}</p>${item.kind === 'reply' ? `<small>${esc(sourceNames[item.draft_source] || 'Taslak')}</small><p>${esc(item.reply_text)}</p>` : `<p>${esc(item.note || 'Henüz görev notu yok.')}</p>`}${item.last_error ? `<p role="status">${esc(item.last_error)}</p>` : ''}<button type="button" class="google-action-btn" data-google-work-open="${esc(item.id)}">${item.kind === 'reply' ? 'Yanıtı incele' : 'Görevi aç'}</button></article>`).join('') : `<div class="google-empty">${workflow.loading ? 'Kayıtlar yükleniyor…' : workflow.loaded ? 'Bu şubeye ait kayıtlı yanıt veya görev yok.' : 'Ortak görev listesi henüz alınmadı.'}</div>`}<p style="font-size:12px;color:var(--muted)">Bu kayıtlar yetkili genel merkez kullanıcıları arasında paylaşılır. Şube bildirimi veya e-posta otomatik gönderilmez.</p></section>`;
  }

  function updateEditorControls() {
    if (!editor) return;
    const modal = ensureModal(), item = editor.item, task = item && item.kind !== 'reply';
    const status = item?.status || 'approval_pending';
    const requiresResave = Boolean(item?.review_snapshot?.reply_conflict);
    const editable = task || ['approval_pending', 'publish_failed'].includes(status);
    const value = modal.querySelector('#googleAiReply').value.trim();
    const sameSavedText = item && value === item.reply_text;
    modal.querySelector('#googleAiReply').readOnly = !editable || editor.busy;
    modal.querySelector('#googleAiReply').setAttribute('aria-label', task ? 'Şube görev notu' : 'Google yorum yanıt taslağı');
    modal.querySelector('#googleTaskStateLabel').hidden = !task;
    modal.querySelector('#googleTaskState').disabled = editor.busy;
    modal.querySelector('#googleAiApproval').hidden = task || status === 'published';
    modal.querySelector('#googleAiApprove').disabled = editor.busy || !sameSavedText || status === 'publishing' || requiresResave;
    const save = modal.querySelector('[data-google-ai-queue]');
    save.textContent = task ? 'Görevi kaydet' : item ? 'Taslak değişikliğini kaydet' : 'Onay kuyruğuna kaydet';
    save.hidden = !editable; save.disabled = editor.busy || (!task && (!value || value.length > 4000));
    const regen = modal.querySelector('[data-google-ai-regenerate]');
    regen.hidden = task || !editable; regen.disabled = editor.busy;
    const publish = modal.querySelector('[data-google-ai-publish]');
    publish.hidden = task || status === 'published';
    publish.textContent = status === 'publish_unknown' ? 'Aynı yanıtı onayla ve yeniden yayımla' : 'Onayla ve Google’da yayımla';
    publish.disabled = editor.busy || !sameSavedText || !modal.querySelector('#googleAiApprove').checked || status === 'publishing' || requiresResave;
    const verify = modal.querySelector('[data-google-ai-verify]');
    verify.hidden = task || !['publishing', 'publish_unknown'].includes(status); verify.disabled = editor.busy;
  }

  function showEditor(current, text) {
    generationSequence++; editor = current;
    const modal = ensureModal(), item = editor.item, task = item && item.kind !== 'reply';
    modal.classList.add('open');
    modal.querySelector('#googleAiTitle').textContent = task ? kindNames[item.kind] : item?.status === 'published' ? 'Yayımlanan Google yanıtı' : 'Google yanıtını incele';
    modal.querySelector('#googleAiContext').textContent = `${editor.branch.name} · ${editor.review.rating}/5 · ${editor.review.comment || 'Yalnız yıldız değerlendirmesi'}`;
    modal.querySelector('#googleAiReply').value = text || '';
    modal.querySelector('#googleAiApprove').checked = false;
    modal.querySelector('#googleTaskState').value = task ? item.status : 'open';
    modal.querySelector('#googleAiMeta').innerHTML = `<span>${esc(task ? 'Kalıcı şube görevi' : sourceNames[editor.source])}</span>${item ? `<span>${esc(statusNames[item.status])}</span>` : ''}`;
    const previous = item?.review_snapshot?.reply_conflict ? item.review_snapshot.current_reply : item?.expected_reply || editor.review.replyText || '';
    modal.querySelector('#googleAiExisting').hidden = task || item?.status === 'published' || !previous;
    modal.querySelector('#googleAiExisting').textContent = `Google’daki mevcut yanıt (yayımlarsanız değiştirilecek):\n${previous}`;
    modal.querySelector('#googleAiWarning').textContent = item?.status === 'published' ? 'Bu yanıtın Google’da yayımlandığı doğrulandı. Metin salt okunur.' : item?.last_error || (task ? 'Not ve durum genel merkezde ortak kaydedilir.' : 'Önce taslağı kaydedin. Yalnızca açıkça onayladığınız tek yanıt Google’da yayımlanır.');
    updateEditorControls();
  }

  function openItem(id) {
    const item = workflow.items.find(row => row.id === id);
    if (!item) return;
    const branch = window.OTOTRGoogleReputation?.getBranchById(item.branch_id) || { id: item.branch_id, name: item.branch_name, replySignatureName: item.branch_name };
    const review = { id: item.review_id, googleReviewId: item.review_id, branchId: item.branch_id, rating: item.review_snapshot?.rating, comment: item.review_snapshot?.comment, replyText: item.expected_reply };
    showEditor({ item, branch, review, identity: { account_id: item.account_id, location_id: item.location_id, review_id: item.review_id, branch_id: item.branch_id }, source: item.draft_source, busy: false }, item.kind === 'reply' ? item.reply_text : item.note);
  }

  async function generate(reviewId) {
    const api = window.OTOTRGoogleReputation, review = api?.getReviewById(reviewId), branch = review && api?.getBranchById(review.branchId);
    if (!review || !branch) return '';
    const existing = workflow.items.find(item => item.kind === 'reply' && item.branch_id === branch.id && item.review_id === review.googleReviewId);
    if (existing) { openItem(existing.id); return existing.reply_text; }
    try { showEditor({ item: null, review, branch, identity: identityFor(review, branch), source: 'manual', busy: false }, ''); }
    catch (error) { api?.setError(error.message); return ''; }
    return regenerateEditor();
  }

  async function regenerateEditor() {
    if (!editor || editor.busy) return '';
    const current = editor, seq = ++generationSequence, modal = ensureModal();
    current.busy = true; updateEditorControls();
    modal.querySelector('#googleAiWarning').textContent = 'OpenAI yanıt taslağı hazırlanıyor…';
    try {
      const result = await requestDraft(current.review, current.branch);
      if (editor !== current || seq !== generationSequence) return '';
      if (!String(result.reply || '').trim()) throw new Error('AI servisi boş taslak döndürdü.');
      current.source = 'openai'; modal.querySelector('#googleAiReply').value = result.reply;
      modal.querySelector('#googleAiMeta').innerHTML = `<span>OpenAI taslağı</span><span>${esc(result.tone || 'doğal')}</span>`;
      modal.querySelector('#googleAiWarning').textContent = result.risk_reason || 'Taslağı düzenleyip kaydedin. Henüz Google’a gönderilmedi.';
    } catch (error) {
      if (editor !== current || seq !== generationSequence) return '';
      current.source = 'local_template'; modal.querySelector('#googleAiReply').value = fallbackReply(current.review, current.branch);
      modal.querySelector('#googleAiMeta').innerHTML = '<span>Yerel şablon · OpenAI yanıtı alınamadı</span>';
      modal.querySelector('#googleAiWarning').textContent = `${error.message} Aşağıdaki metin yerel şablondur. İnceleyip düzenleyin; Google’a gönderilmedi.`;
    } finally {
      current.busy = false;
      if (editor === current) { modal.querySelector('#googleAiApprove').checked = false; updateEditorControls(); }
    }
    return modal.querySelector('#googleAiReply').value;
  }

  async function saveEditor() {
    if (!editor || editor.busy) return;
    const current = editor, modal = ensureModal(), item = current.item, task = item && item.kind !== 'reply';
    const text = modal.querySelector('#googleAiReply').value.trim();
    if (!task && (!text || text.length > 4000)) return;
    current.busy = true; updateEditorControls();
    try {
      const data = task
        ? await googleBusinessRequest('update_task', { item_id: item.id, expected_version: item.version, note: text, status: modal.querySelector('#googleTaskState').value })
        : await googleBusinessRequest('save_draft', { ...current.identity, ...(item ? { item_id: item.id, expected_version: item.version } : {}), reply_text: text, draft_source: current.source });
      remember(data.item);
      if (editor === current) { openItem(data.item.id); ensureModal().querySelector('#googleAiWarning').textContent = task ? 'Görev ortak kayıtlara kaydedildi.' : 'Taslak kaydedildi. Metni onayladığınızda tek yanıt Google’da yayımlanacak.'; }
    } catch (error) {
      workflow.error = error.message; rerender();
      if (editor === current) modal.querySelector('#googleAiWarning').textContent = error.message;
    } finally { current.busy = false; if (editor === current) updateEditorControls(); }
  }

  async function publishEditor(verifyOnly) {
    if (!editor?.item || editor.busy) return;
    const current = editor, modal = ensureModal(), item = current.item;
    if (!verifyOnly && (item.review_snapshot?.reply_conflict || !modal.querySelector('#googleAiApprove').checked || modal.querySelector('#googleAiReply').value.trim() !== item.reply_text)) return;
    current.busy = true; updateEditorControls();
    modal.querySelector('#googleAiWarning').textContent = verifyOnly ? 'Google’daki yayın sonucu kontrol ediliyor…' : 'Onayladığınız yanıt Google’a gönderiliyor ve sonucu doğrulanıyor…';
    try {
      const data = await googleBusinessRequest(verifyOnly ? 'verify_reply' : 'publish_reply', { item_id: item.id, expected_version: item.version, ...(!verifyOnly ? { approved: true } : {}) });
      remember(data.item);
      if (editor === current) openItem(data.item.id);
      if (data.item.status === 'published') {
        window.toast?.('Yanıtın doğru Google yorumunda yayımlandığı doğrulandı.');
        await window.OTOTRGoogleReputation?.syncGoogleReviewsForBranch?.(item.branch_id);
      }
    } catch (error) {
      await refreshWorkflow();
      const latest = workflow.items.find(row => row.id === item.id);
      if (editor === current) {
        if (latest) current.item = latest;
        modal.querySelector('#googleAiWarning').textContent = `${error.message} Başarı bildirimi alınmadı; yayın durumunu listeden kontrol edin.`;
      }
    } finally { current.busy = false; if (editor === current) updateEditorControls(); }
  }

  async function createTask(reviewId, kind = 'branch') {
    const key = `${reviewId}:${kind}`;
    if (pendingTasks.has(key)) return;
    const api = window.OTOTRGoogleReputation, review = api?.getReviewById(reviewId), branch = review && api?.getBranchById(review.branchId);
    if (!review || !branch) return;
    pendingTasks.add(key);
    try {
      const data = await googleBusinessRequest('create_task', { ...identityFor(review, branch), kind, note: review.recommendedAction || '' });
      remember(data.item); openItem(data.item.id);
      window.toast?.(data.existing ? 'Bu yorumun mevcut görevi açıldı.' : 'Görev genel merkez ortak kayıtlarına kaydedildi.');
      return data.item;
    } catch (error) { workflow.error = error.message; rerender(); api?.setError(error.message); }
    finally { pendingTasks.delete(key); }
  }

  function install() {
    if (!window.OTOTRGoogleReputation) return setTimeout(install, 100);
    window.OTOTRGoogleReputation.generateReplyDraft = generate;
    window.OTOTRGoogleReputation.assignTaskToBranch = id => createTask(id, 'branch');
    window.OTOTRGoogleReputation.convertGoogleReviewToComplaint = id => createTask(id, 'complaint');
    window.OTOTRGoogleReputation.sendToLegal = id => createTask(id, 'legal');
    window.OTOTRGoogleReputation.openQualityAudit = id => createTask(id, 'quality');
    window.OTOTRGoogleReputation.sendToCrisisCenter = id => createTask(id, 'crisis');
  window.OTOTRGoogleReviewAI = {
    generate,
    connectGoogleBusiness,
    googleBusinessStatus,
    googleBusinessRequest,
    getApprovalQueue: () => workflow.items.filter(item => item.kind === 'reply'),
    refreshWorkflow, renderWorkflow, createTask, openItem
  };
    if (typeof document !== 'undefined') {
      document.addEventListener('click', event => {
        const open = event.target.closest?.('[data-google-work-open]');
        if (open) openItem(open.dataset.googleWorkOpen);
        if (event.target.closest?.('[data-google-work-refresh]')) refreshWorkflow();
      });
      setTimeout(refreshWorkflow, 300);
    }
  }

  install();
})();
