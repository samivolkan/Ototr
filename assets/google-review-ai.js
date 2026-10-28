(function () {
  'use strict';

  const AI_ENDPOINT = 'https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/google-review-ai';
  const workflow = { items: [], loaded: false, loading: false, lastSuccessAt: 0, error: '' };
  const statusNames = { preparing: 'AI yanıtı hazırlanıyor', draft_failed: 'Taslak hazırlanamadı', approval_pending: 'Onay bekliyor', publishing: 'Yayın doğrulanıyor', published: 'Google’da yayımlandı', publish_failed: 'Yayımlanamadı', publish_unknown: 'Yayın sonucu belirsiz', open: 'Açık görev', done: 'Tamamlandı' };
  const kindNames = { reply: 'Yanıt taslağı', branch: 'Şube yanıt görevi', complaint: 'Müşteri deneyimi görevi', legal: 'Hukuk incelemesi', quality: 'Kalite incelemesi', crisis: 'Kriz incelemesi' };
  const sourceNames = { openai: 'OpenAI taslağı', local_template: 'Yerel şablon · AI bağlantısı başarısız', manual: 'Elle düzenlenen taslak' };
  let editor = null, generationSequence = 0, workflowRevision = 0;
  const pendingTasks = new Set();
  const cards = new Map(), preparingReviews = new Set(), automaticAttempts = new Set();
  const publicationLocks = new Set(), verificationChecks = new Map(), pendingPublicationRefreshes = new Set();
  const automaticVerification = { busy: false, due: 0, failures: 0 };
  let automaticPumpScheduled = false;
  const rerender = () => {
    const focused = document.activeElement, reviewId = focused?.dataset?.googleCardText;
    const selection = reviewId ? { start: focused.selectionStart, end: focused.selectionEnd, scroll: focused.scrollTop } : null;
    window.OTOTRGoogleReputation?.render?.();
    if (reviewId) {
      const next = [...(document.querySelectorAll?.('[data-google-card-text]') || [])].find(element => element.dataset.googleCardText === reviewId);
      if (next) { next.focus?.({ preventScroll: true }); next.setSelectionRange?.(selection.start, selection.end); next.scrollTop = selection.scroll; }
    }
  };

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
    const team = String(branch.replySignatureName || branch.name || 'OTOTR').replace(/ Test Şube$/i, '').trim().replace(/\s+ekibi$/iu, ' Ekibi');
    const rawName = String(review?.reviewerName || '').trim().replace(/\s+/g, ' ');
    const name = /^(?!Google kullanıc(?:ı|i)|Google User$)[\p{L}][\p{L}'’.-]*(?:\s+[\p{L}][\p{L}'’.-]*){1,3}$/iu.test(rawName) ? rawName : '';
    const greeting = `Sayın ${name || 'Değerli müşterimiz'},`;
    if (Number(review.rating) >= 4) {
      return `${greeting}\n\nBizi tercih ettiğiniz için teşekkür ederiz. Memnuniyetinizi paylaşmanız ekibimize güç veriyor; sizi yeniden ağırlamaktan mutluluk duyarız.\n\n${team}`;
    }
    return `${greeting}\n\nYaşadığınız deneyimi önemsiyoruz. Konuyu şube yönetimimizle değerlendirerek hizmetimizi geliştirmek için gerekli adımları atacağız; ayrıntıları paylaşmanız hâlinde size yardımcı olmaktan memnuniyet duyarız.\n\n${team}`;
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
      .google-ai-warning[data-tone="waiting"]{border-color:#bfdbfe;background:#eff6ff;color:#1e40af}
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
      <div class="google-ai-actions"><button type="button" data-google-ai-close>Kapat</button><button type="button" data-google-ai-regenerate>Yeni yanıt hazırla</button><button type="button" data-google-ai-queue>Taslağı kaydet</button><button type="button" data-google-ai-verify>Yayın sonucunu kontrol et</button><button type="button" class="primary" data-google-ai-publish>Onayla ve Google’da yayımla</button></div>
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

  async function requestDraft(review, branch, previousReply = '') {
    const auth = await session();
    const key = supabaseKey();
    if (!auth?.access_token || !key) throw new Error('ERP oturumu veya backend bağlantısı bulunamadı.');
    const response = await globalThis.fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${auth.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate', previous_reply: String(previousReply || ''), review: { id: review.id, rating: review.rating, comment: review.comment, reviewerName: String(review.reviewerName || '') }, branch: { id: branch.id, name: branch.name, city: branch.city, replySignatureName: branch.replySignatureName } })
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
    const timeoutMs = action === 'prepare_draft' ? 45000 : 30000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
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
        error.code = data.code;
        error.source = data.source;
        error.reconnection_required = data.reconnection_required === true;
        throw error;
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error(`İşlem ${timeoutMs / 1000} saniye içinde yanıt vermedi. İşlem sonucunu kontrol edin; yeniden gönderim yapılmadı.`);
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
    if (workflow.loading) return { skipped: true };
    const revision = workflowRevision;
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
      if (revision !== workflowRevision) return { skipped: true };
      workflow.items = items; workflow.loaded = true; workflow.lastSuccessAt = Date.now();
    } catch (error) {
      if (revision !== workflowRevision) return { skipped: true };
      workflow.error = error.message;
      if ([401, 403].includes(error.status)) { workflow.items = []; workflow.loaded = false; }
    }
    finally { workflow.loading = false; rerender(); }
    return { ok: !workflow.error, lastSuccessAt: workflow.lastSuccessAt };
  }

  function remember(item) {
    workflowRevision++;
    workflow.items = [item, ...workflow.items.filter(row => row.id !== item.id)];
    workflow.error = ''; rerender();
  }

  function renderWorkflow(branchId, options = {}) {
    const items = workflow.items.filter(item => (branchId === 'all' ? Boolean(window.OTOTRGoogleReputation?.getBranchById?.(item.branch_id)) : item.branch_id === branchId) && (!options.tasksOnly || item.kind !== 'reply'));
    const pending = workflow.loaded ? items.filter(item => item.kind === 'reply' && item.status !== 'published').length : '—';
    const tasks = workflow.loaded ? items.filter(item => item.kind !== 'reply' && item.status === 'open').length : '—';
    return `<section class="google-premium-card" data-testid="google-workflow"><div class="google-premium-title"><div><h3>Yanıt onayları ve şube görevleri</h3><p>Genel merkezde ortak kayıt · ${pending} yanıt bekliyor · ${tasks} açık görev</p></div><button type="button" class="google-action-btn" data-google-work-refresh ${workflow.loading ? 'disabled' : ''}>${workflow.loading ? 'Yükleniyor…' : 'Listeyi yenile'}</button></div>${workflow.error ? `<div class="google-ai-warning" role="alert">${esc(workflow.error)}${workflow.loaded ? ' Son alınan kayıtlar gösteriliyor.' : ' Görevler henüz alınamadı.'}</div>` : ''}${items.length ? items.map(item => `<article class="google-workflow-row"><div class="google-workflow-head"><strong>${esc(kindNames[item.kind] || item.kind)}</strong><span class="badge b-blue">${esc(replyStatus(item))}</span></div><p>${esc(item.review_snapshot?.rating || '—')}/5 · ${esc(item.review_snapshot?.comment || 'Yalnız yıldız değerlendirmesi')}</p>${item.kind === 'reply' ? `<small>${esc(sourceNames[item.draft_source] || 'Taslak')}</small><p>${esc(item.reply_text)}</p>` : `<p>${esc(item.note || 'Henüz görev notu yok.')}</p>`}${item.last_error ? `<p role="status">${esc(item.last_error)}</p>` : ''}<button type="button" class="google-action-btn" data-google-work-open="${esc(item.id)}">${item.kind === 'reply' ? 'Yanıtı incele' : 'Görevi aç'}</button></article>`).join('') : `<div class="google-empty">${workflow.loading ? 'Kayıtlar yükleniyor…' : workflow.loaded ? 'Bu şubeye ait kayıtlı yanıt veya görev yok.' : 'Ortak görev listesi henüz alınmadı.'}</div>`}<p style="font-size:12px;color:var(--muted)">Bu kayıtlar yetkili genel merkez kullanıcıları arasında paylaşılır. Şube bildirimi veya e-posta otomatik gönderilmez.</p></section>`;
  }

  function canVerifyReply(item) {
    return item?.kind === 'reply' && (['publishing', 'publish_unknown'].includes(item.status) ||
      (item.status === 'publish_failed' && Boolean(item.approved_by && item.approved_at)));
  }

  function publicationWaiting(item) { return ['publishing', 'publish_unknown'].includes(item?.status); }
  function googleAccepted(item) { return item?.review_snapshot?.google_reply_accepted === true || item?.review_snapshot?.google_reply_state === 'PENDING'; }
  function replyStatus(item) {
    return publicationWaiting(item) ? googleAccepted(item) ? 'Yanıt gönderildi, kontrol ediliyor' : 'Gönderim sonucu kontrol ediliyor' : statusNames[item?.status] || item?.status || '';
  }
  function verificationNote(item) {
    const checked = verificationChecks.get(item.id);
    const last = checked?.at ? ` Son kontrol: ${new Date(checked.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}.` : '';
    const retry = checked?.error ? ' Bağlantı kontrolü tamamlanamadı; otomatik yeniden denenecek.' : '';
    return `${googleAccepted(item) ? 'Google yanıtı aldı; yayın onayı bekleniyor.' : 'Gönderimin sonucu henüz doğrulanmadı.'} Sayfa açık ve düzenleme kapalıyken sıradaki kayıt dakikada bir kontrol edilir.${last}${retry}`;
  }

  async function publicationConfirmed(item, quiet = false) {
    if (!quiet) window.toast?.('Yanıtın doğru Google yorumunda yayımlandığı doğrulandı.');
    try { await window.OTOTRGoogleReputation?.syncGoogleReviewsForBranch?.(item.branch_id, { quiet }); }
    catch (error) { window.OTOTRGoogleReputation?.setError?.(`Yanıt yayımlandı; yorum listesi yenilenemedi: ${error.message}`); }
  }

  function updateEditorControls() {
    if (!editor) return;
    const modal = ensureModal(), item = editor.item, task = item && item.kind !== 'reply';
    const status = item?.status || 'approval_pending';
    const requiresResave = Boolean(item?.review_snapshot?.reply_conflict);
    const editable = task || ['approval_pending', 'publish_failed', 'draft_failed'].includes(status);
    const value = modal.querySelector('#googleAiReply').value.trim();
    const sameSavedText = item && value === item.reply_text;
    modal.querySelector('#googleAiReply').readOnly = !editable || editor.busy;
    modal.querySelector('#googleAiReply').setAttribute('aria-label', task ? 'Şube görev notu' : 'Google yorum yanıt taslağı');
    modal.querySelector('#googleTaskStateLabel').hidden = !task;
    modal.querySelector('#googleTaskState').disabled = editor.busy;
    const acceptedWaiting = publicationWaiting(item) && googleAccepted(item);
    modal.querySelector('#googleAiApproval').hidden = task || status === 'published' || acceptedWaiting;
    modal.querySelector('#googleAiApprove').disabled = editor.busy || !sameSavedText || status === 'publishing' || requiresResave;
    const save = modal.querySelector('[data-google-ai-queue]');
    save.textContent = task ? 'Görevi kaydet' : item ? 'Taslak değişikliğini kaydet' : 'Onay kuyruğuna kaydet';
    save.hidden = !editable; save.disabled = editor.busy || (!task && (!value || value.length > 4000));
    const regen = modal.querySelector('[data-google-ai-regenerate]');
    regen.textContent = editor.regenerating ? 'Yeni yanıt hazırlanıyor…' : 'Yeni yanıt hazırla';
    regen.hidden = task || !editable; regen.disabled = editor.busy;
    const publish = modal.querySelector('[data-google-ai-publish]');
    publish.hidden = task || status === 'published' || acceptedWaiting;
    publish.textContent = status === 'publish_unknown' ? 'Aynı yanıtı onayla ve yeniden yayımla' : 'Onayla ve Google’da yayımla';
    publish.disabled = editor.busy || acceptedWaiting || publicationLocks.has(item?.id) || !sameSavedText || !modal.querySelector('#googleAiApprove').checked || !['approval_pending', 'publish_failed', 'publish_unknown'].includes(status) || requiresResave;
    const verify = modal.querySelector('[data-google-ai-verify]');
    verify.hidden = !canVerifyReply(item); verify.disabled = editor.busy || publicationLocks.has(item?.id) || !sameSavedText;
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
    modal.querySelector('#googleAiMeta').innerHTML = `<span>${esc(task ? 'Kalıcı şube görevi' : sourceNames[editor.source])}</span>${item ? `<span>${esc(replyStatus(item))}</span>` : ''}`;
    const previous = editor.review.replyText || (item?.review_snapshot?.reply_conflict ? item.review_snapshot.current_reply : item?.expected_reply) || '';
    modal.querySelector('#googleAiExisting').hidden = task || item?.status === 'published' || !previous;
    modal.querySelector('#googleAiExisting').textContent = `Google’daki mevcut yanıt (yayımlarsanız değiştirilecek):\n${previous}`;
    modal.querySelector('#googleAiWarning').dataset.tone = publicationWaiting(item) ? 'waiting' : '';
    modal.querySelector('#googleAiWarning').textContent = item?.status === 'published' ? 'Bu yanıtın Google’da yayımlandığı doğrulandı. Metin salt okunur.' : publicationWaiting(item) ? verificationNote(item) : item?.last_error || (task ? 'Not ve durum genel merkezde ortak kaydedilir.' : 'Önce taslağı kaydedin. Yalnızca açıkça onayladığınız tek yanıt Google’da yayımlanır.');
    updateEditorControls();
  }

  function openItem(id) {
    const item = workflow.items.find(row => row.id === id);
    if (!item) return;
    const branch = window.OTOTRGoogleReputation?.getBranchById(item.branch_id) || { id: item.branch_id, name: item.branch_name, replySignatureName: item.branch_name };
    const liveReview = window.OTOTRGoogleReputation?.demoReviews?.find(row => row.branchId === item.branch_id && row.googleReviewId === item.review_id);
    const review = { id: item.review_id, googleReviewId: item.review_id, branchId: item.branch_id, rating: item.review_snapshot?.rating, comment: item.review_snapshot?.comment, reviewerName: liveReview?.reviewerName || item.review_snapshot?.reviewer_name || '', replyText: liveReview?.replyText || (item.review_snapshot?.reply_conflict ? item.review_snapshot.current_reply : item.expected_reply) };
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
    if (current.item && (current.item.kind !== 'reply' || !['approval_pending', 'publish_failed', 'draft_failed'].includes(current.item.status))) return '';
    const previousReply = modal.querySelector('#googleAiReply').value;
    current.busy = true; current.regenerating = true; modal.querySelector('#googleAiApprove').checked = false; updateEditorControls();
    modal.querySelector('#googleAiWarning').textContent = 'Yeni yanıt hazırlanıyor…';
    try {
      const result = await requestDraft(current.review, current.branch, previousReply);
      if (editor !== current || seq !== generationSequence) return '';
      if (!String(result.reply || '').trim()) throw new Error('AI servisi boş taslak döndürdü.');
      current.source = 'openai'; modal.querySelector('#googleAiReply').value = result.reply;
      modal.querySelector('#googleAiMeta').innerHTML = `<span>OpenAI taslağı</span><span>${esc(result.tone || 'doğal')}</span>`;
      modal.querySelector('#googleAiWarning').textContent = result.risk_reason || 'Taslağı düzenleyip kaydedin. Henüz Google’a gönderilmedi.';
    } catch (error) {
      if (editor !== current || seq !== generationSequence) return '';
      if (previousReply.trim() || current.item?.reply_text) {
        modal.querySelector('#googleAiWarning').textContent = `${error.message} Yeni yanıt hazırlanamadı; mevcut metniniz korundu. Google’a gönderilmedi.`;
      } else {
        current.source = 'local_template'; modal.querySelector('#googleAiReply').value = fallbackReply(current.review, current.branch);
        modal.querySelector('#googleAiMeta').innerHTML = '<span>Yerel şablon · OpenAI yanıtı alınamadı</span>';
        modal.querySelector('#googleAiWarning').textContent = `${error.message} Aşağıdaki metin yerel şablondur. İnceleyip düzenleyin; Google’a gönderilmedi.`;
      }
    } finally {
      current.busy = false; current.regenerating = false;
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
      workflowRevision++; workflow.error = error.message; rerender();
      if (editor === current) modal.querySelector('#googleAiWarning').textContent = error.message;
    } finally { current.busy = false; if (editor === current) updateEditorControls(); }
  }

  async function publishEditor(verifyOnly) {
    if (!editor?.item || editor.busy) return;
    const current = editor, modal = ensureModal(), item = current.item;
    if (publicationLocks.has(item.id)) return;
    if (verifyOnly && (!canVerifyReply(item) || modal.querySelector('#googleAiReply').value.trim() !== item.reply_text)) return;
    if (!verifyOnly && (item.kind !== 'reply' || (publicationWaiting(item) && googleAccepted(item)) || !['approval_pending', 'publish_failed', 'publish_unknown'].includes(item.status) || item.review_snapshot?.reply_conflict || !modal.querySelector('#googleAiApprove').checked || modal.querySelector('#googleAiReply').value.trim() !== item.reply_text)) return;
    publicationLocks.add(item.id);
    modal.querySelector('#googleAiApprove').checked = false;
    current.busy = true; updateEditorControls();
    modal.querySelector('#googleAiWarning').textContent = verifyOnly ? 'Google’daki yayın sonucu kontrol ediliyor…' : 'Onayladığınız yanıt Google’a gönderiliyor ve sonucu doğrulanıyor…';
    try {
      const data = await googleBusinessRequest(verifyOnly ? 'verify_reply' : 'publish_reply', { item_id: item.id, expected_version: item.version, ...(!verifyOnly ? { approved: true } : {}) });
      remember(data.item);
      if (editor === current) openItem(data.item.id);
      if (data.item.status === 'published') await publicationConfirmed(data.item);
    } catch (error) {
      await refreshWorkflow();
      const latest = workflow.items.find(row => row.id === item.id);
      if (latest?.status === 'published') {
        if (editor === current) openItem(latest.id);
        await publicationConfirmed(latest);
      } else if (editor === current) {
        if (latest) current.item = latest;
        modal.querySelector('#googleAiWarning').textContent = `${error.message} ${canVerifyReply(current.item) ? 'Yayın sonucunu kontrol et düğmesiyle Google’daki yanıtı doğrulayabilirsiniz.' : 'Kayıtlı yayın durumunu inceleyin.'} Yeniden gönderim yapılmadı.`;
      }
    } finally {
      publicationLocks.delete(item.id); automaticVerification.due = Math.max(automaticVerification.due, Date.now() + 60000);
      if (verifyOnly) verificationChecks.set(item.id, { at: Date.now() });
      current.busy = false; if (editor === current) updateEditorControls();
      else if (editor?.item?.id === item.id) updateEditorControls();
    }
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
    } catch (error) { workflowRevision++; workflow.error = error.message; rerender(); api?.setError(error.message); }
    finally { pendingTasks.delete(key); }
  }

  function cardContext(reviewId) {
    const api = window.OTOTRGoogleReputation, review = api?.getReviewById(reviewId);
    const branch = review && api?.getBranchById(review.branchId);
    if (!review || !branch) return null;
    const item = workflow.items.find(row => row.kind === 'reply' && row.branch_id === branch.id && row.review_id === review.googleReviewId && String(row.location_id) === String(branch.googleBusinessLocationId));
    if (!cards.has(reviewId)) cards.set(reviewId, { editing: false, text: '', baseVersion: null, approved: null, busy: false, error: '' });
    const state = cards.get(reviewId);
    if (state.approved && (!item || state.approved.id !== item.id || state.approved.version !== item.version || state.approved.text !== item.reply_text)) state.approved = null;
    return { review, branch, item, state };
  }

  function editingCards() { return [...cards.values()].some(state => state.editing || state.busy); }
  function automaticViewAllowed() {
    return typeof location !== 'undefined' && location.hash === '#google-reviews' && document.visibilityState === 'visible' &&
      (typeof navigator === 'undefined' || navigator.onLine !== false) &&
      !document.documentElement?.classList.contains('ototr-access-locked') &&
      !document.getElementById('googleReviewAiModal')?.classList.contains('open') && !editingCards() && !editor?.busy;
  }
  function autoPreparationAllowed() {
    return automaticViewAllowed() && !automaticVerification.busy && !publicationLocks.size &&
      workflow.loaded && !workflow.loading && !workflow.error && !window.OTOTRGoogleReputation?.getRefreshState?.().busy;
  }
  async function verifyPendingReply() {
    const now = Date.now();
    if (!autoPreparationAllowed()) return { skipped: true };
    if (pendingPublicationRefreshes.size) {
      const branchId = pendingPublicationRefreshes.values().next().value;
      automaticVerification.busy = true;
      try { await publicationConfirmed({ branch_id: branchId }, true); pendingPublicationRefreshes.delete(branchId); }
      finally { automaticVerification.busy = false; }
      return { skipped: true };
    }
    if (now < automaticVerification.due) return { skipped: true };
    const candidates = workflow.items.filter(item => item.kind === 'reply' && item.approved_by && item.approved_at &&
      !item.review_snapshot?.reply_conflict && item.review_snapshot?.google_reply_state !== 'REJECTED' &&
      (item.status === 'publish_unknown' || (item.status === 'publishing' && now - new Date(item.updated_at).getTime() > 90000)));
    candidates.sort((left, right) => (verificationChecks.get(left.id)?.at || 0) - (verificationChecks.get(right.id)?.at || 0));
    const item = candidates[0];
    if (!item) return { skipped: true };
    automaticVerification.busy = true; publicationLocks.add(item.id);
    let errorMessage = '';
    try {
      const data = await googleBusinessRequest('verify_reply', { item_id: item.id, expected_version: item.version });
      if (!data.item || data.item.id !== item.id) throw new Error('Yayın kontrolü sonucu okunamadı.');
      const current = workflow.items.find(row => row.id === item.id);
      if (!current || current.version !== item.version) return { skipped: true };
      remember(data.item);
      const modal = document.getElementById('googleReviewAiModal');
      if (modal?.classList.contains('open') && editor?.item?.id === item.id && !editor.busy && modal.querySelector('#googleAiReply').value.trim() === editor.item.reply_text) openItem(item.id);
      if (data.item.status === 'published') {
        if (automaticViewAllowed()) await publicationConfirmed(data.item, true);
        else pendingPublicationRefreshes.add(item.branch_id);
      }
      automaticVerification.failures = 0;
      return { ok: true };
    } catch (error) {
      errorMessage = error.message;
      automaticVerification.failures = Math.min(automaticVerification.failures + 1, 4);
      return { ok: false };
    } finally {
      const finished = Date.now();
      verificationChecks.set(item.id, { at: finished, error: errorMessage });
      automaticVerification.due = finished + (errorMessage ? Math.min(300000, 60000 * 2 ** (automaticVerification.failures - 1)) : 60000);
      automaticVerification.busy = false; publicationLocks.delete(item.id);
      if (editor?.item?.id === item.id) updateEditorControls();
      rerender();
    }
  }
  function schedulePreparation() {
    if (automaticPumpScheduled) return;
    automaticPumpScheduled = true;
    setTimeout(() => { automaticPumpScheduled = false; preparePendingDrafts(); }, 0);
  }
  function preparePendingDrafts() {
    if (!autoPreparationAllowed()) return;
    const reviews = window.OTOTRGoogleReputation?.demoReviews || [];
    for (const review of reviews) {
      if (preparingReviews.size >= 2) break;
      if (review.isReplied || automaticAttempts.has(review.id) || preparingReviews.has(review.id)) continue;
      const context = cardContext(review.id);
      if (!context || context.item || context.state.editing || context.state.busy) continue;
      automaticAttempts.add(review.id);
      void prepareCard(review.id, false);
    }
  }
  async function prepareCard(reviewId, explicitRetry) {
    const context = cardContext(reviewId);
    if (!context || context.review.isReplied || context.state.busy || preparingReviews.has(reviewId) || preparingReviews.size >= 2) return;
    const { review, branch, item, state } = context;
    if (item && !['preparing', 'draft_failed'].includes(item.status)) return;
    if (item && !explicitRetry) return;
    automaticAttempts.add(reviewId); preparingReviews.add(reviewId); state.error = ''; state.approved = null; rerender();
    try {
      const data = await googleBusinessRequest('prepare_draft', { ...identityFor(review, branch), ...(explicitRetry && item ? { retry: true, item_id: item.id, expected_version: item.version } : {}) });
      if (!data.item) throw new Error('Taslak sonucu alınamadı. Durumu kontrol ederek yeniden deneyin.');
      remember(data.item);
      if (data.item.status === 'draft_failed') state.error = data.item.last_error || 'Taslak hazırlanamadı. Yeniden deneyebilirsiniz.';
    } catch (error) {
      state.error = error.message;
    } finally {
      preparingReviews.delete(reviewId); rerender(); schedulePreparation();
    }
  }
  function renderAutoDraftSummary(branchId) {
    const reviews = (window.OTOTRGoogleReputation?.demoReviews || []).filter(review => (branchId === 'all' || review.branchId === branchId) && (!review.isReplied || canVerifyReply(cardContext(review.id)?.item)));
    const verificationItems = [];
    let ready = 0, preparing = 0, failed = 0, verification = 0, sent = 0;
    for (const review of reviews) {
      const context = cardContext(review.id), status = context?.item?.status;
      if (status === 'published') sent++;
      else if (canVerifyReply(context?.item)) { verification++; verificationItems.push({ item: context.item, review }); }
      else if (['approval_pending', 'publish_failed'].includes(status)) ready++;
      else if (preparingReviews.has(review.id) || status === 'preparing') preparing++;
      else if (status === 'draft_failed' || context?.state.error) failed++;
    }
    const waiting = Math.max(0, reviews.length - ready - preparing - failed - verification - sent);
    return `<section class="google-auto-draft-summary" data-testid="google-auto-drafts"><div><strong>Hazır yanıtlar</strong><p>Cevapsız yorumlar için AI taslakları otomatik hazırlanır. Yalnızca tek tek onayladığınız yanıtlar gönderilir.</p></div><div class="google-draft-summary-counts"><span>${ready} hazır</span><span>${preparing} hazırlanıyor</span><span>${waiting} sırada</span>${failed ? `<span>${failed} tekrar deneme bekliyor</span>` : ''}${verification ? `<span>${verification} yayın kontrolü</span>` : ''}${sent ? `<span>${sent} gönderildi</span>` : ''}</div>${verificationItems.length ? `<div class="google-reply-actions">${verificationItems.map(({ item, review }, index) => `<button type="button" class="google-reply-secondary" data-google-work-open="${esc(item.id)}">Yayın kaydını incele${review.reviewerName ? ` · ${esc(review.reviewerName)}` : verificationItems.length > 1 ? ` · ${index + 1}` : ''}</button>`).join('')}</div>` : ''}${workflow.error ? `<p class="google-reply-error">${esc(workflow.error)} Taslakların yeniden hazırlanması, kayıtlar okunana kadar bekler.</p>` : ''}</section>`;
  }
  function renderAutoDraftMiniSummary(branchId) {
    const reviews = (window.OTOTRGoogleReputation?.demoReviews || []).filter(review => (branchId === 'all' || review.branchId === branchId) && (!review.isReplied || canVerifyReply(cardContext(review.id)?.item)));
    let ready = 0, preparing = 0, waiting = 0;
    for (const review of reviews) {
      const context = cardContext(review.id), status = context?.item?.status;
      if (canVerifyReply(context?.item) || ['approval_pending', 'publish_failed'].includes(status)) ready++;
      else if (preparingReviews.has(review.id) || status === 'preparing') preparing++;
      else waiting++;
    }
    return `<span class="google-branch-draft-mini" aria-label="Hazır yanıt durumu"><span class="google-branch-draft-btn">${ready} hazır</span><span class="google-branch-draft-btn">${preparing} hazırlanıyor</span><span class="google-branch-draft-btn">${waiting} sırada</span></span>`;
  }
  function renderReplyCard(review, branch) {
    const context = cardContext(review.id);
    if (!context) return '';
    const { item, state } = context, status = item?.status;
    const action = (name, label, disabled = false, primary = false) => `<button type="button" class="${primary ? 'google-reply-primary' : 'google-reply-secondary'}" data-google-card-action="${name}" data-review-id="${esc(review.id)}" ${disabled || (name !== 'details' && publicationLocks.has(item?.id)) ? 'disabled' : ''}>${label}</button>`;
    if (review.isReplied) {
      const verification = canVerifyReply(item), conflict = Boolean(item?.review_snapshot?.reply_conflict), failed = item?.status === 'publish_failed';
      return `<div class="google-reply-heading"><strong>Google’daki yanıt</strong><span class="google-reply-status" data-tone="${verification ? 'loading' : 'published'}">${verification ? publicationWaiting(item) ? esc(replyStatus(item)) : 'Yayın kaydı doğrulama bekliyor' : item?.status === 'published' ? 'Yayımlandığı doğrulandı' : 'Yanıtlandı'}</span></div><div class="google-reply-text">${esc(review.replyText || 'Google’da yanıt mevcut.')}</div><p class="google-reply-note">${publicationWaiting(item) ? esc(verificationNote(item)) : verification ? 'Google’da bir yanıt görünüyor. Kayıtlı taslağın yayın sonucunu kontrol edin; bu işlem yanıt göndermez.' : 'Mevcut işletme yanıtı korunuyor.'}</p>${!verification && (conflict || failed) ? '<p class="google-reply-error">Kayıtlı taslağı ve Google’daki mevcut yanıtı inceleyin. Değişiklik için taslağı yeniden kaydetmeniz ve onaylamanız gerekir.</p>' : ''}${state.error && item?.status !== 'published' ? `<p class="google-reply-error" role="status">${esc(state.error)}</p>` : ''}${verification || conflict || failed ? `<div class="google-reply-actions">${verification ? action('verify', 'Yayın sonucunu kontrol et', state.busy) : ''}${action('details', 'Kayıtlı taslağı ve mevcut yanıtı incele', state.busy)}</div>` : ''}`;
    }
    if (!item || ['preparing', 'draft_failed'].includes(status)) {
      const pending = preparingReviews.has(review.id) || status === 'preparing', error = state.error || item?.last_error;
      return `<div class="google-reply-heading"><strong>AI yanıt taslağı</strong><span class="google-reply-status" data-tone="${error ? 'error' : 'loading'}">${pending ? 'Hazırlanıyor' : error ? 'Tekrar deneme gerekli' : 'Hazırlama sırasında'}</span></div><div class="google-reply-text">${pending ? 'Yoruma ve şubeye özel yanıt hazırlanıyor…' : error ? 'Taslak hazır olduğunda burada görünecek.' : 'Bu yorumun yanıtı otomatik hazırlanacak.'}</div>${error ? `<p class="google-reply-error" role="status">${esc(error)}</p>` : ''}<div class="google-reply-actions">${error || status === 'preparing' ? action('prepare', status === 'preparing' ? 'Hazırlığı kontrol et' : 'Yeniden dene', preparingReviews.has(review.id)) : ''}</div><p class="google-reply-note">Hazırlanan taslak otomatik kaydedilir; onayınız olmadan Google’a gönderilmez.</p>`;
    }
    const editable = ['approval_pending', 'publish_failed'].includes(status), conflict = Boolean(item.review_snapshot?.reply_conflict);
    const mayApprove = editable && !conflict && !state.editing && !state.busy && Boolean(item.reply_text?.trim());
    const risk = item.review_snapshot?.ai_analysis?.risk_reason;
    const versionChanged = state.editing && state.baseVersion !== item.version;
    return `<div class="google-reply-heading"><strong>${status === 'published' ? 'Yayımlanan yanıt' : 'Hazır yanıt'}</strong><span class="google-reply-status" data-tone="${status === 'published' ? 'published' : editable ? 'ready' : 'loading'}">${esc(replyStatus(item))}</span></div><p class="google-reply-note">${esc(sourceNames[item.draft_source] || 'Kayıtlı taslak')}</p>${state.editing ? `<textarea class="google-reply-editor" data-google-card-text="${esc(review.id)}" aria-label="${esc(branch.replySignatureName || branch.name)} yanıtını düzenle" maxlength="4000" ${state.busy ? 'disabled' : ''}>${esc(state.text)}</textarea>` : `<div class="google-reply-text">${esc(item.reply_text)}</div>`}${risk ? `<p class="google-reply-note">${esc(risk)}</p>` : ''}${conflict ? '<p class="google-reply-error">Google’daki yanıt değişmiş. Mevcut yanıtı inceleyip taslağı yeniden kaydedin.</p>' : ''}${versionChanged ? '<p class="google-reply-error">Taslak başka oturumda değişti. Yazdığınız metin korundu; kayıtlı sürümü inceleyin.</p>' : ''}${publicationWaiting(item) ? `<p class="google-reply-note" role="status">${esc(verificationNote(item))}</p>` : status !== 'published' && (state.error || item.last_error) ? `<p class="google-reply-error" role="status">${esc(state.error || item.last_error)}</p>` : ''}${editable && !state.editing && !conflict ? `<label class="google-reply-approval"><input type="checkbox" data-google-card-approve="${esc(review.id)}" ${state.approved ? 'checked' : ''} ${mayApprove ? '' : 'disabled'}>Bu yorumu ve hazır yanıtı kontrol ettim, Google’da yayımlanmasını onaylıyorum.</label>` : ''}<div class="google-reply-actions">${state.editing ? action('save', 'Değişikliği kaydet', state.busy || versionChanged || !state.text.trim(), true) + action('cancel', 'Vazgeç', state.busy) : editable ? action('send', state.busy ? 'İşleniyor…' : 'Onayla ve gönder', !mayApprove || !state.approved, true) + action('edit', 'Düzenle', state.busy) + action('regenerate', state.operation === 'regenerate' ? 'Yeni yanıt hazırlanıyor…' : 'Yeni yanıt hazırla', state.busy) : ''}${conflict ? action('details', 'Mevcut yanıtı incele', state.busy) : ''}${canVerifyReply(item) && !state.editing ? action('verify', 'Yayın sonucunu kontrol et', state.busy) : ''}</div>`;
  }
  async function cardAction(reviewId, action) {
    const context = cardContext(reviewId);
    if (!context || context.state.busy) return;
    const { review, branch, item, state } = context;
    if (action === 'prepare') return prepareCard(reviewId, true);
    if (action === 'details' && item) return openItem(item.id);
    if (publicationLocks.has(item?.id)) return;
    if (!item || (review.isReplied && action !== 'verify')) return;
    if (item.review_snapshot?.reply_conflict && ['edit', 'regenerate'].includes(action)) return openItem(item.id);
    if (action === 'edit' && ['approval_pending', 'publish_failed'].includes(item.status)) {
      state.editing = true; state.text = item.reply_text; state.baseVersion = item.version; state.approved = null; state.error = ''; rerender(); return;
    }
    if (action === 'cancel') { state.editing = false; state.approved = null; state.error = ''; rerender(); schedulePreparation(); return; }
    if (action === 'send' && (!state.approved || state.editing || item.review_snapshot?.reply_conflict || state.approved.id !== item.id || state.approved.version !== item.version || state.approved.text !== item.reply_text || !['approval_pending', 'publish_failed'].includes(item.status))) return;
    if (action === 'save' && (!state.editing || !state.text.trim() || state.text.trim().length > 4000 || state.baseVersion !== item.version)) return;
    if (action === 'regenerate' && (state.editing || !['approval_pending', 'publish_failed'].includes(item.status))) return;
    if (action === 'verify' && (!canVerifyReply(item) || state.editing)) return;
    if (!['save', 'regenerate', 'send', 'verify'].includes(action)) return;
    if (['send', 'verify'].includes(action)) publicationLocks.add(item.id);
    state.busy = true; state.operation = action; state.error = ''; const approved = state.approved; state.approved = null; rerender();
    try {
      let data;
      if (action === 'save' || action === 'regenerate') {
        const generated = action === 'regenerate' ? await requestDraft(review, branch, item.reply_text) : null;
        const text = generated ? String(generated.reply || '').trim() : state.text.trim();
        if (!text) throw new Error('AI boş yanıt döndürdü. Kayıtlı taslak korundu.');
        data = await googleBusinessRequest('save_draft', { ...identityFor(review, branch), item_id: item.id, expected_version: item.version, reply_text: text, draft_source: generated ? 'openai' : 'manual' });
      } else {
        data = await googleBusinessRequest(action === 'verify' ? 'verify_reply' : 'publish_reply', { item_id: item.id, expected_version: action === 'send' ? approved.version : item.version, ...(action === 'send' ? { approved: true } : {}) });
      }
      if (!data.item) throw new Error('Kayıt sonucu doğrulanamadı. Listeyi yenileyin.');
      remember(data.item); state.editing = false;
      if (data.item.status === 'published') await publicationConfirmed(data.item);
    } catch (error) {
      state.error = error.message;
      if (['send', 'verify'].includes(action)) {
        await refreshWorkflow();
        const latest = workflow.items.find(row => row.id === item.id);
        if (latest?.status === 'published') { state.error = ''; await publicationConfirmed(latest); }
      }
    } finally {
      if (['send', 'verify'].includes(action)) {
        publicationLocks.delete(item.id); automaticVerification.due = Math.max(automaticVerification.due, Date.now() + 60000);
        if (action === 'verify') verificationChecks.set(item.id, { at: Date.now() });
      }
      state.busy = false; state.operation = ''; rerender(); schedulePreparation();
    }
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
    formatBusinessError: googleBusinessError,
    getApprovalQueue: () => workflow.items.filter(item => item.kind === 'reply'),
    getRefreshState: () => ({ busy: workflow.loading || automaticVerification.busy || Boolean(editor?.busy) || pendingTasks.size > 0 || editingCards(), lastSuccessAt: workflow.lastSuccessAt }),
    refreshWorkflow, renderWorkflow, createTask, openItem,
    renderReplyCard, renderAutoDraftSummary, renderAutoDraftMiniSummary, preparePendingDrafts, verifyPendingReply
  };
    if (typeof document !== 'undefined') {
      document.addEventListener('click', event => {
        const card = event.target.closest?.('[data-google-card-action]');
        if (card) { void cardAction(card.dataset.reviewId, card.dataset.googleCardAction); return; }
        const open = event.target.closest?.('[data-google-work-open]');
        if (open) openItem(open.dataset.googleWorkOpen);
        if (event.target.closest?.('[data-google-work-refresh]')) refreshWorkflow();
      });
      document.addEventListener('input', event => {
        const reviewId = event.target.dataset?.googleCardText;
        if (!reviewId) return;
        const context = cardContext(reviewId);
        if (context?.state.editing) {
          context.state.text = event.target.value; context.state.approved = null;
          const save = event.target.closest?.('.google-reply-panel')?.querySelector('[data-google-card-action="save"]');
          if (save) save.disabled = context.state.busy || context.state.baseVersion !== context.item?.version || !context.state.text.trim() || context.state.text.trim().length > 4000;
        }
      });
      document.addEventListener('change', event => {
        const reviewId = event.target.dataset?.googleCardApprove;
        if (!reviewId) return;
        const context = cardContext(reviewId);
        if (!context) return;
        const { item, state, review } = context;
        state.approved = event.target.checked && item && !review.isReplied && !state.editing && !state.busy && !item.review_snapshot?.reply_conflict && ['approval_pending', 'publish_failed'].includes(item.status) && item.reply_text?.trim() ? { id: item.id, version: item.version, text: item.reply_text } : null;
        rerender();
      });
    }
  }

  install();
})();
