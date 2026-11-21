(function () {
  'use strict';

  const embedded = new URLSearchParams(location.search).get('embedded') === '1' && window.parent !== window;
  let parentApi = null;
  try { if (embedded && window.parent.location.origin === location.origin) parentApi = window.parent.OTOTRGoogleReputation; } catch (_) {}
  // The ERP shell loads optional Google modules asynchronously. Resolve the
  // parent API lazily so the iframe never captures a null API during the first
  // paint (the old behavior made "Yeni yanıt" appear to do nothing).
  const getAI = () => {
    try { return embedded && window.parent.location.origin === location.origin ? (window.parent.OTOTRGoogleReviewAI || null) : null; }
    catch (_) { return null; }
  };
  let aiLoadPromise;
  function ensureParentAI() {
    if (!embedded) return Promise.resolve(null);
    const existing = getAI();
    if (existing) return Promise.resolve(existing);
    if (!aiLoadPromise) aiLoadPromise = new Promise(resolve => {
      try {
        const doc = window.parent.document;
        const found = doc.querySelector('script[data-ototr-google-ai]');
        if (found) { found.addEventListener('load', () => resolve(getAI()), { once: true }); setTimeout(() => resolve(getAI()), 1500); return; }
        const script = doc.createElement('script');
        const release=window.parent.OTOTRReviewRelease;
        const version=encodeURIComponent(release?.version && release?.commit ? release.version+'.'+release.commit : 'google-workflow-25');
        script.src = new URL('assets/google-review-ai.js?v='+version, window.parent.location.href).href;
        script.dataset.ototrGoogleAi = '1';
        script.onload = () => resolve(getAI());
        script.onerror = () => resolve(null);
        doc.head.appendChild(script);
        setTimeout(() => resolve(getAI()), 3000);
      } catch (_) { resolve(null); }
    });
    return aiLoadPromise;
  }
  void ensureParentAI();
  const aiProxy = (name) => (...args) => getAI()?.[name]?.(...args);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const liveIds = new Map();
  let nextId = -1; // Demo forms allocate positive IDs; keep the namespaces disjoint.
  const workIds = new Map();
  const liveBranchId = 'branch-google-nilufer';
  const builtinIds = new Set(['branch-google-nilufer', 'branch-google-gebze', 'branch-google-inegol']);
  const currentBranchId = () => window.OTOTRReviewLiveViews?.getBranchId?.() || liveBranchId;
  const currentBranchIsLive = () => window.OTOTRReviewLiveViews?.isLive?.() ?? currentBranchId() === liveBranchId;
  const branchIndex = id => id === 'branch-google-gebze' ? 1 : id === 'branch-google-inegol' ? 2 : id === liveBranchId ? 0 : -1;
  const branchTarget = id => typeof BRANCHES !== 'undefined' && Array.isArray(BRANCHES) ? BRANCHES.find(branch => branch.id === id || branch.erpBranchId === id) || (branchIndex(id) >= 0 ? BRANCHES[branchIndex(id)] : null) : null;

  function branchFullName(branch) {
    return `${branch.city || ''} ${branch.name || ''}`.trim();
  }

  function applyScope() {
    if (typeof BRANCHES === 'undefined' || !Array.isArray(BRANCHES)) return;
    BRANCHES.forEach((branch, index) => {
      const fullName = branchFullName(branch);
      const known = builtinIds.has(branch.id) || index < 3 || String(branch.id || '').startsWith('branch-custom-');
      branch.hidden = !known;
      branch.erpBranchId = branch.erpBranchId || (index === 0 ? liveBranchId : index === 1 ? 'branch-google-gebze' : index === 2 ? 'branch-google-inegol' : branch.id);
      branch.live = branch.erpBranchId === liveBranchId || branch.lifecycle === 'live' || branch.lifecycle === 'active' || branch.mode === 'live';
      branch.demo = !branch.live;
      if (branch.demo) {
        branch.gbp = '';
        branch.lastSync = 'Demo veri · dış gönderim kapalı';
      }
    });
    // Keep custom registry branches; only the static seed rows outside the
    // three supported built-ins are discarded.
    for (let i = BRANCHES.length - 1; i >= 3; i--) {
      if (!String(BRANCHES[i]?.id || '').startsWith('branch-custom-')) BRANCHES.splice(i, 1);
    }
    [LEGAL_CASES, COMPLAINTS, APPROVALS].forEach(rows => rows?.forEach(row => { row.branchIdx = 1 + Number(row.branchIdx || 0) % 2; }));
    if (typeof REVIEWS !== 'undefined' && Array.isArray(REVIEWS)) {
      REVIEWS.forEach((review, index) => {
        review.store = index % 2 ? 'Kocaeli Gebze' : 'Bursa İnegöl';
        review.demo = true;
      });
    }
  }

  function hydrateLiveNilufer() {
    if (typeof BRANCHES === 'undefined' || typeof REVIEWS === 'undefined') return;
    // Keep this loader callable by the legacy embedded test harness as well
    // as by the dynamic branch registry in the live shell.
    const branchId = typeof currentBranchId === 'function' ? currentBranchId() : liveBranchId;
    const liveEnabled = typeof currentBranchIsLive === 'function' ? currentBranchIsLive() : branchId === liveBranchId;
    const targetFor = typeof branchTarget === 'function' ? branchTarget : (id => BRANCHES.find(branch => branch.id === id || branch.erpBranchId === id));
    const indexFor = typeof branchIndex === 'function' ? branchIndex : (id => id === liveBranchId ? 0 : -1);
    if (!liveEnabled) return;
    const live = parentApi?.getBranchById?.(branchId);
    const reviews = parentApi?.fetchGoogleReviews?.(branchId) || [];
    const aiApi = typeof ai !== 'undefined' ? ai : getAI();
    const items = aiApi?.getWorkflowItems?.() || [];
    const policy = window.OTOTRReviewManagement?.state?.policy;
    const registry = window.OTOTRReviewLiveViews?.getBranchRegistry?.().find(item => item.id === branchId);
    const slaHours = Number(policy?.default_sla_hours) || Number(registry?.sla_hours) || 24;
    const target = targetFor(branchId);
    if (target) {
      target.actual = Number(live?.googleReviewCount ?? reviews.length);
      target.rating = Number(live?.googleRating ?? 0);
      // The ERP target is a monthly value. Keep a visible, safe fallback when
      // an older branch record has not populated monthlyTarget yet.
      const configuredTarget = Number(live?.monthlyTarget ?? live?.target ?? registry?.target ?? 0);
      target.target = configuredTarget > 0 ? configuredTarget : 200;
      target.slaH = slaHours;
      target.autoreply = policy?.auto_reply_enabled === true;
      target.gbp = live?.googleLocationId || live?.locationId || registry?.location_id || '';
      target.slaRate = 0;
      target.responseRate = reviews.length ? Math.round(reviews.filter(r => r.isReplied).length / reviews.length * 100) : 0;
      target.criticalRate = reviews.length ? Math.round(reviews.filter(r => r.rating <= 2).length / reviews.length * 100) : 0;
      // The ERP already formats this display field in Turkish. Parsing it
      // again can fail, or silently swap day/month for dates such as 7.11.
      const syncText = String(live?.lastSyncedAt || '');
      const localizedSync = /^\d{1,2}\.\d{1,2}\.\d{4}(?:,)?\s+\d{1,2}:\d{2}(?::\d{2})?$/.test(syncText);
      const syncDate = syncText ? new Date(syncText) : null;
      target.lastSync = localizedSync ? syncText : Number.isFinite(syncDate?.getTime())
        ? syncDate.toLocaleString('tr-TR') : syncText ? 'Zaman bilgisi alınamadı' : 'Senkronizasyon bekleniyor';
    }
    const mapped = reviews.filter(review => !review.demo && review.id && (review.branchId === branchId || !review.branchId)).map(review => {
      if (!liveIds.has(review.id)) liveIds.set(review.id, nextId--);
      const item = items.find(i => i.kind === 'reply' && i.branch_id === branchId && i.review_id === review.googleReviewId);
      const task = items.find(i => i.kind !== 'reply' && i.status === 'open' && i.branch_id === branchId && i.review_id === review.googleReviewId);
      const routedTo = task?.kind === 'branch' ? 'store' : task?.kind || null;
      const replyDate = review.replyUpdatedAt || review.replyDate || null;
      return ({
      id: liveIds.get(review.id),
      erpReviewId: review.id,
      demo: false,
      googleReviewId: review.googleReviewId,
      branchId,
      store: `${live?.city || live?.name?.match?.(/(Bursa|Kocaeli|İstanbul|Ankara)\s+([^,]+)/)?.[1] || target?.city || ''} ${live?.name?.replace?.(/^OTOTR(?: Oto Ekspertiz)?\s+/i, '').replace?.(/\s+Şubesi?$/i, '') || target?.name || ''}`.trim(),
      author: escape(review.reviewerName || 'Google kullanıcısı'),
      stars: Math.max(1, Math.min(5, Number(review.rating) || 1)),
      risk: Number(review.starRating || review.rating || 0) <= 2 ? 85 : Number(review.starRating || review.rating || 0) === 3 ? 45 : 8,
      riskSource: 'Yıldız puanı kuralı; AI risk ölçümü değildir',
      aiAnalysis: item?.review_snapshot?.ai_analysis || null,
      tag: Number(review.starRating || review.rating || 0) <= 2 ? 'Kritik' : Number(review.starRating || review.rating || 0) === 3 ? 'Takip' : 'Olumlu',
      text: escape(review.comment || ''),
      drafts: [escape(review.isReplied ? review.replyText || '' : item?.reply_text || 'ERP üzerinden taslak hazırlamak için Yeniden düğmesini kullanın.')],
      status: review.isReplied ? 'gonderildi' : routedTo === 'legal' ? 'hukuk' : routedTo ? 'routed' : 'bekliyor',
      time: review.reviewDate ? new Date(review.reviewDate).toLocaleString('tr-TR') : 'Canlı Google kaydı',
      slaH: slaHours,
      escalated: !review.isReplied && Boolean(review.reviewDate) && Date.now() - Date.parse(review.reviewDate) > slaHours * 3600000,
      createdAt: review.reviewDate || null,
      replyDate,
      pipeline: {routedTo, stages:{received:{done:true,ts:review.reviewDate || null},classified:{done:Boolean(item?.review_snapshot?.ai_analysis),ts:item?.review_snapshot?.ai_analysis ? item.created_at : null},draft:{done:Boolean(item?.reply_text),ts:item?.created_at || null},routed:{done:Boolean(task),ts:task?.created_at || null},responded:{done:Boolean(review.isReplied),ts:replyDate},closed:{done:false,ts:null}}},
    }); });
    REVIEWS.splice(0, REVIEWS.length, ...mapped, ...REVIEWS.filter(review => review.demo));
    const replace = (collection, kind, convert) => {
      const demo = collection.filter(row => !row.erpItemId);
      const liveItems = items.filter(item => item.branch_id === branchId && item.kind === kind);
      collection.splice(0, collection.length, ...liveItems.map(item => {
        if (!workIds.has(item.id)) workIds.set(item.id, `ERP-${workIds.size + 1}`);
        return {id:workIds.get(item.id), erpItemId:item.id, branchIdx:Math.max(0, indexFor(branchId)), branch_id:branchId, version:item.version, googleReviewId:item.review_id,
          customer:escape(item.review_snapshot?.reviewer_name || 'Google kullanıcısı'),
          text:escape(item.reply_text || item.note || ''), ...convert(item)};
      }), ...demo);
    };
    replace(LEGAL_CASES, 'legal', item => ({category:'Google yorum incelemesi',assignee:'ERP hukuk kuyruğu',status:item.status === 'done' ? 'closed' : 'open',hold:item.review_snapshot?.legal_hold === true,opened:String(item.created_at || '').slice(0,10),sla:slaHours/24,review:escape(item.review_snapshot?.comment || '')}));
    replace(COMPLAINTS, 'complaint', item => ({category:'Google müşteri deneyimi',assignee:'ERP şikayet kuyruğu',status:item.status === 'done' ? 'resolved' : 'received',severity:Number(item.review_snapshot?.rating) <= 2 ? 'high' : 'normal',openedAt:Date.parse(item.created_at),slaH:slaHours,review:escape(item.review_snapshot?.comment || '')}));
    replace(APPROVALS, 'reply', item => ({type:'ERP yanıtı · '+escape(item.review_snapshot?.rejection ? 'Reddedildi' : item.status),level:1,total:1,assignedTo:'ERP yetkili onayı',slaH:slaHours,openedAt:Date.parse(item.created_at),review:escape(item.review_snapshot?.comment || '')}));
    for (let i=APPROVALS.length-1;i>=0;i--) {
      const item=items.find(item=>item.id===APPROVALS[i].erpItemId);
      if(item && (['published','done','closed','rejected'].includes(item.status) || item.review_snapshot?.rejection)) APPROVALS.splice(i,1);
    }
  }

  const hydrateLiveBranch = hydrateLiveNilufer;

  function markEnvironment() {
    document.documentElement.dataset.erpEmbedded = embedded ? 'true' : 'false';
    const env = document.querySelector('.env');
    if (env) env.innerHTML = '<i></i>' + (parentApi ? 'Bursa ERP bağlantısı · Gebze/İnegöl demo' : 'ERP oturumu yok · canlı işlemler kapalı');
    document.querySelectorAll('option').forEach(option => {
      if (/Gebze|İnegöl/.test(option.textContent || '') && !/Demo/.test(option.textContent || '')) option.textContent += ' · Demo';
    });
    if (true) {
      STATE.onboarded = true;
      const tour = document.getElementById('tourOverlay');
      if (tour) tour.style.display = 'none';
      const role = document.getElementById('roleSelect');
      if (role) { role.disabled = true; role.title = 'Yetkiler ERP hesabınızdan doğrulanır'; if (role.options?.[0]) role.options[0].textContent='ERP oturumu'; }
    }
  }

  const avatar=document.getElementById('userAvatar');if(avatar)avatar.textContent='ERP';
  applyScope();
  hydrateLiveBranch();
  markEnvironment();
  const missing = () => toast('Canlı işlem için ERP oturumu ve Google bağlantısı gerekli.', 'warn');
  const liveRow = id => REVIEWS.find(r => r.id === id && !r.demo);
  const dirty = new Map();
  let pendingApproval = null, busy = false;
  const currentItem = row => getAI()?.getWorkflowItems?.().find(i=>i.kind==='reply' && i.branch_id===currentBranchId() && i.review_id===row.googleReviewId);
  const isEditing = () => dirty.size>0 || Boolean(pendingApproval) || busy;
  window.OTOTRReviewBridge = {hydrate:hydrateLiveBranch,isEditing};
  const lockEditing = () => getAI()?.setManagementEditing?.(isEditing());
  async function act(id, action, extra={}) {
    const row=liveRow(id); if(!row) return missing();
    // Older ERP shells exposed generate/createTask before manageReview. Keep
    // those calls as a compatibility fallback without bypassing the current
    // authenticated manageReview workflow when it is available.
    const ai = getAI();
    const api = getAI();
    if (!api?.manageReview) {
      if (['prepare','regenerate'].includes(action) && api?.generate) {
        const result = await api.generate(row.erpReviewId);
        hydrateLiveBranch();
        if (typeof renderReviews === 'function') renderReviews();
        return result;
      }
      if (['branch','legal','complaint'].includes(action) && api?.createTask) {
        const result = await api.createTask(row.erpReviewId, action);
        hydrateLiveBranch();
        if (typeof renderReviews === 'function') renderReviews();
        return result;
      }
      return missing();
    }
    if(busy)return;
    busy=true;lockEditing();
    try {
      const item=currentItem(row);
      const result=await (ai && ai.manageReview ? ai.manageReview.bind(ai) : api.manageReview.bind(api))(row.erpReviewId,action,{version:item?.version,...extra});
      dirty.delete(id);
      if(['publish','verify'].includes(action)) {
        toast(result.status==='published'?'Google yayını doğrulandı.':'Yayın sonucu: '+result.status,result.status==='published'?'ok':'warn');
      } else toast(result.status==='draft_failed'?'Taslak üretilemedi; yeniden deneyebilirsiniz.':'ERP kaydı güncellendi.',result.status==='draft_failed'?'warn':'ok');
      hydrateLiveBranch();renderReviews();
      return result;
    } catch(e) {toast(e.message || 'ERP işlemi başarısız; kayıt korunuyor.','warn');}
    finally {busy=false;lockEditing();}
  }
  const originalEmail=window.openEmail, originalConfirm=window.confirmEmail, originalRegen=window.regenDraft, originalEdit=window.editSentReply, originalSendUpdated=window.sendUpdatedReply;
  window.openEmail=id=>{
    const row=liveRow(id);if(!row)return originalEmail(id);
    const item=currentItem(row);
    if(dirty.has(id))return toast('Önce düzenlediğiniz taslağı kaydedin.','warn');
    if(item?.review_snapshot?.rejection)return toast('Bu taslak reddedildi. Önce düzenleyip yeniden kaydedin.','warn');
    if(!item?.reply_text || !['approval_pending','publish_failed'].includes(item.status)) {
      if (!getAI()?.manageReview && getAI()?.generate) return getAI().generate(row.erpReviewId);
      return toast('Önce geçerli bir taslak hazırlayın.','warn');
    }
    pendingApproval={id,version:item.version,text:item.reply_text};lockEditing();
    document.getElementById('emailFrom').textContent=`${branchTarget(currentBranchId())?.city || ''} ${branchTarget(currentBranchId())?.name || 'Şube'} · canlı Google yayını`.trim();
    document.getElementById('emailTo').textContent='Google yorumu';
    document.getElementById('emailReview').textContent=parentApi.getReviewById(row.erpReviewId)?.comment || '';
    document.getElementById('emailResp').textContent=item.reply_text;
    document.getElementById('reviewPublishNotice').textContent = 'Onayladığınız yanıt Google’da herkese açık yayımlanır.';
    document.getElementById('reviewPublishConfirm').textContent = 'Google’da yayımla';
    openModal('emailModal');
    document.querySelector('#emailModal .mfoot button')?.focus();
  };
  window.confirmEmail=async()=>{
    if(!pendingApproval)return originalConfirm();
    const approved={...pendingApproval};
    const result=await act(approved.id,'publish',{version:approved.version,text:approved.text,approved:true});
    if(result){pendingApproval=null;closeModal('emailModal');lockEditing();}
  };
  const originalClose=window.closeModal;
  window.closeModal=id=>{if(id==='emailModal'){pendingApproval=null;lockEditing();}return originalClose(id);};
  async function regenerateLiveReply(id) {
    const row=liveRow(id), item=row && currentItem(row);
    if (!row) return toast('Bu canlı yorum için ERP yanıt kaydı bulunamadı. Önce Bursa’yı yenileyin.','warn');
    if (dirty.has(id)) return toast('Önce açık düzenlemeyi kaydedin veya vazgeçin.','warn');
    let ai = getAI();
    if (!ai) { ai = await ensureParentAI(); }
    if (!item && ai?.generate) return ai.generate(row.erpReviewId);
    if (!item) return toast('Bu canlı yorum için ERP yanıt kaydı bulunamadı. Önce Bursa’yı yenileyin.','warn');
    const regenerate = ai?.['regeneratePublishedItem'] || ai?.['regenerateItem'];
    if (regenerate) return regenerate(item.id);
    if (ai?.generate) return ai.generate(row.erpReviewId);
    if (ai?.['openItem']) { ai['openItem'](item.id); return toast('ERP yanıt düzenleyicisi açıldı. Yeni yanıt hazırla seçeneğini kullanın.','info'); }
    return missing();
  }
  async function editLiveReply(id) {
    const row=liveRow(id), item=row && currentItem(row), box=document.getElementById('draftBox');
    if (!row || !item || !box) return missing();
    if (busy) return;
    if (item.review_snapshot?.legal_hold) return toast('Hukuki bekletme aktif; canlı yanıt değiştirilemez.','warn');
    box.readOnly=false; box.dataset.liveEditing='1'; box.focus();
    dirty.set(id,{text:box.value,version:item.version,published:true}); lockEditing();
    toast('Yanıt düzenleme modu açıldı. Değişiklikten sonra “Güncel yanıtı gönder” seçeneğini kullanın.','info');
  }
  async function sendLiveUpdatedReply(id) {
    const row=liveRow(id), item=row && currentItem(row), box=document.getElementById('draftBox');
    if (!row || !item || !box) return missing();
    const text=box.value.trim();
    if (!dirty.has(id)) return toast('Önce “Yanıtı düzenle” seçeneğini açın.','info');
    if (!text || text.length > 4000) return toast('Yanıt 1–4000 karakter olmalıdır.','warn');
    const api = getAI();
    if (!api?.googleBusinessRequest) return missing();
    busy=true; lockEditing();
    try {
      const data=await api.googleBusinessRequest('save_draft',{account_id:item.account_id,location_id:item.location_id,review_id:item.review_id,branch_id:item.branch_id,item_id:item.id,expected_version:item.version,reply_text:text,draft_source:'manual',edit_published:true});
      dirty.delete(id); box.readOnly=true; box.dataset.liveEditing='';
      await api.refreshWorkflow?.();
      hydrateLiveBranch(); renderReviews();
      api?.['openItem']?.(data.item.id);
      toast('Güncel yanıt kaydedildi; yayın için insan onayı bekleniyor.','ok');
      return data;
    } catch (e) { toast(e.message || 'Güncel yanıt kaydedilemedi.','warn'); }
    finally { busy=false; lockEditing(); }
  }
  window.editSentReply=id=>liveRow(id)?editLiveReply(id):originalEdit?.(id);
  window.sendUpdatedReply=id=>liveRow(id)?sendLiveUpdatedReply(id):originalSendUpdated?.(id);
  window.regenDraft=id=>liveRow(id)?regenerateLiveReply(id):originalRegen(id);
  window.saveLiveDraft=id=>{const edit=dirty.get(id);if(edit)return act(id,'save',{text:edit.text,version:edit.version});};
  window.verifyLiveReply=id=>act(id,'verify');
  const originalRoute=window.routeReview;
  window.routeReview=(id,target)=>liveRow(id)?act(id,target==='store'?'branch':target):originalRoute(id,target);
  const originalCloseRoute=window.closeRouting;
  window.closeRouting=id=>liveRow(id)?toast('Canlı görev durumu ERP kaydı üzerinden takip edilir.','info'):originalCloseRoute(id);
  const originalBulk=window.bulkAction;
  window.bulkAction=action=>{
    if([...SELECTED].some(id=>liveRow(id))&&action!=='clear') {
      toast('Canlı yorumları ayrı ayrı inceleyip onaylayın. Demo toplu işlemler canlı kayıtları değiştirmez.','warn');
      parentApi?.['setCenterView']?.('inbox','waiting');
      return;
    }
    return originalBulk(action);
  };
  const branchFilter=document.createElement('select');branchFilter.id='erpBranchFilter';branchFilter.setAttribute?.('aria-label','Şube ve veri ortamı');
  branchFilter.innerHTML='<option value="live">Bursa Nilüfer · Canlı</option><option value="Kocaeli Gebze">Gebze · Demo</option><option value="Bursa İnegöl">İnegöl · Demo</option><option value="all">Tümü · Canlı + Demo</option>';
  branchFilter.value=parentApi?'live':'all';
  document.getElementById('rvSort')?.after(branchFilter);
  const refreshBranchControls=()=>{
    const registry=window.OTOTRReviewLiveViews?.getBranchRegistry?.()||[];
    const known=registry.filter(item=>item?.id);
    const custom=known.filter(item=>String(item.id).startsWith('branch-custom-'));
    custom.forEach(item=>{ if(!Array.from(branchFilter.options).some(option=>option.value===item.id)){ const option=document.createElement('option');option.value=item.id;option.textContent=`${item.city||''} ${item.name||''} · ${['live','active'].includes(item.lifecycle)?'Canlı':item.lifecycle==='onboarding'?'Onboarding':'Demo'}`.trim();branchFilter.insertBefore(option,branchFilter.querySelector('option[value="all"]')); } });
    const scopeValue=document.getElementById('erpScopeValue');
    if(scopeValue&&document.getElementById('erpScopeLevel')?.value==='branch'){
      scopeValue.innerHTML='<option value="all">Tüm canlı şubeler</option>'+known.map(item=>`<option value="${escape(item.id)}">${escape(`${item.city||''} ${item.name||''}`.trim())} · ${['live','active'].includes(item.lifecycle)?'Canlı':item.lifecycle==='onboarding'?'Onboarding':'Demo'}</option>`).join('');
      scopeValue.value=currentBranchId();
    }
    const count=document.querySelector('#erpGoogleSync')?.parentElement?.querySelector('.chip.ok');
    if(count) count.textContent=`${known.filter(item=>item.lifecycle==='live'||item.id===liveBranchId).length||1} Canlı · ${known.filter(item=>item.lifecycle!=='live'&&item.id!==liveBranchId).length||2} Demo/Onboarding`;
  };
  const originalFiltered=typeof window.getFilteredReviews === 'function' ? window.getFilteredReviews : () => REVIEWS;
  window.getFilteredReviews=()=>originalFiltered().filter(row=>{
    if(branchFilter.value==='all') return true;
    if(branchFilter.value==='live') return !row.demo && (row.branchId===liveBranchId || !row.branchId);
    if(String(branchFilter.value).startsWith('branch-')) return row.branchId===branchFilter.value || row.branch_id===branchFilter.value;
    return row.demo&&row.store===branchFilter.value;
  });
  branchFilter.onchange=()=>{SELECTED.clear();SEL=null;const value=branchFilter.value==='live'? 'live' : branchFilter.value==='Kocaeli Gebze' ? 'gebze' : branchFilter.value==='Bursa İnegöl' ? 'inegol' : branchFilter.value;window.OTOTRReviewLiveViews?.setScope?.(value);hydrateLiveBranch();renderReviews();};
  window.addEventListener('ototr-branch-registry-ready',refreshBranchControls);
  refreshBranchControls();
  const originalRender=window.renderReviews;
  window.renderReviews=(...args)=>{
    const result=originalRender(...args),row=liveRow(SEL),box=document.getElementById('draftBox');
    const filtered=getFilteredReviews();
    document.querySelectorAll('#rvList .row2').forEach((node,index)=>{node.textContent+=' · '+(filtered[index]?.demo?'Demo':'Canlı');});
    const selected=REVIEWS.find(r=>r.id===SEL),meta=document.querySelector('#rvDetail .meta');
    if(selected&&meta){const badge=document.createElement('span');badge.className='chip '+(selected.demo?'warn':'ok');badge.textContent=selected.demo?'Demo · Google’a gönderilmez':'Bursa · Canlı Google kaydı';meta.prepend(badge);}
    if(!row||!box)return result;
    const item=currentItem(row),edit=dirty.get(row.id);
    const editable=Boolean(edit) || (!row.replyDate && row.status!=='gonderildi' && ['approval_pending','publish_failed'].includes(item?.status));
    box.readOnly=!editable;
    box.maxLength=4000;
    if(edit)box.value=edit.text;
    else if(item && row.status!=='gonderildi')box.value=item.reply_text||'';
    box.oninput=()=>{dirty.set(row.id,{text:box.value,version:edit?.version ?? item?.version});pendingApproval=null;lockEditing();};
    const actions=document.querySelector('#rvTab-detail .actions');
    if(actions && row.status!=='gonderildi'){
      actions.innerHTML=`<button class="btn p" onclick="openEmail(${row.id})" ${editable?'':'disabled'}>✓ Onayla</button><button class="btn" onclick="regenDraft(${row.id})">↻ ${item?.reply_text?'Yeniden':'Taslak hazırla'}</button><button class="btn" onclick="saveLiveDraft(${row.id})" ${editable?'':'disabled'}>Kaydet</button>${['publishing','publish_unknown','publish_failed'].includes(item?.status)?`<button class="btn" onclick="verifyLiveReply(${row.id})">Yayın sonucunu kontrol et</button>`:''}`;
    } else if(actions){
      actions.innerHTML=`<div class="review-action-group"><h4>Yanıt</h4><div><button class="btn" onclick="editSentReply(${row.id})">Yanıtı düzenle</button><button class="btn" onclick="regenDraft(${row.id})">Alternatif AI</button><button class="btn p" onclick="sendUpdatedReply(${row.id})">Güncel yanıtı gönder</button></div></div><div class="review-action-group"><h4>Takip</h4><div><button class="btn" onclick="addInternalNote(${row.id})">Not ekle</button><button class="btn" onclick="requestHumanApproval(${row.id})">İnsan onayı iste</button><button class="btn" onclick="routeReview(${row.id},'complaint')">Müşteri Şikayeti</button><button class="btn" onclick="verifyLiveReply(${row.id})">Google’da kontrol et</button></div></div><div class="review-action-group"><h4>Yönlendir</h4><div><button class="btn" onclick="escalateRegion(${row.id})">Bölge</button><button class="btn" onclick="routeReview(${row.id},'store')">Şube</button><button class="btn" onclick="routeReview(${row.id},'legal')">Hukuk</button></div></div>`;
    }
    const label=document.querySelector('.draft-label .chip');
    if(label)label.textContent=row.status==='gonderildi'?'Google yanıtı':item?`${item.draft_source==='openai'?'OpenAI':item.draft_source==='manual'?'Elle düzenlenen':'Şablon'} · ${item.review_snapshot?.rejection ? 'Reddedildi · yeniden düzenleyin' : item.status}`:'ERP taslağı bekleniyor';
    return result;
  };
  const originalOverview = window.renderOverview;
  window.renderOverview = (...args) => {
    const result = originalOverview(...args);
    const alerts=document.getElementById('ovAlerts');if(alerts)alerts.textContent=parentApi?'Bursa canlı; Gebze ve İnegöl örnek verileri ayrı tutulur.':'Canlı veriyi görmek için ERP içinden giriş yapın.';
    const rows = REVIEWS.filter(r => !r.demo), answered = rows.filter(r => r.status === 'gonderildi');
    const timed = answered.filter(r => r.replyDate && r.createdAt);
    const within = timed.filter(r => Date.parse(r.replyDate) - Date.parse(r.createdAt) <= 86400000);
    const overdue = rows.filter(r => r.status !== 'gonderildi' && r.createdAt && Date.now()-Date.parse(r.createdAt)>86400000);
    const metrics = [['Bursa · Yorum',rows.length,'ERP’den alınan kayıtlar'],['Bursa · Puan',rows.length?(rows.reduce((s,r)=>s+r.stars,0)/rows.length).toFixed(1):'—','Alınan yorumların ortalaması'],['Bursa · Yanıt',rows.length?Math.round(answered.length/rows.length*100)+'%':'—','Google’da yanıtı bulunan'],['Bursa · SLA',timed.length?Math.round(within.length/timed.length*100)+'%':'—','Yanıt tarihi bilinen kayıtlar · 24 sa'],['Bursa · Bekleyen',rows.length-answered.length,'Henüz Google yanıtı yok'],['Bursa · Geciken',overdue.length,'24 saati aşan yanıtsız kayıtlar']];
    const box=document.getElementById('ovKpis');
    if(box) box.innerHTML=metrics.map(([label,value,note])=>`<div class="kpi"><div class="kl">${label}</div><div class="kv">${value}</div><div class="kd">${note}</div></div>`).join('');
    const watch=document.getElementById('ovWatchlist');
    if(watch) watch.innerHTML=rows.filter(r=>r.risk>=50&&r.status!=='gonderildi').slice(0,5).map(r=>`<div class="watch-row"><div class="info"><b>${r.author}</b><small>Bursa Nilüfer · ${r.stars} yıldız</small></div><button class="btn sm ghost" onclick="openReviewFromStore(${r.id})">Detay →</button></div>`).join('') || '<div class="empty">Alınan Bursa kayıtlarında yanıtsız kritik yorum yok.</div>';
    const sla=document.getElementById('ovSla');
    if(sla) sla.innerHTML=`<div class="watch-row"><div class="info"><b>Nilüfer</b><small>Bursa · canlı</small></div><div class="metric">${timed.length?Math.round(within.length/timed.length*100)+'%':'—'}</div><span class="chip">${timed.length?'Yanıt tarihi bilinen kayıtlar':'Yanıt tarihi sağlanmadı'}</span></div>` + BRANCHES.filter(b=>b.demo).map(b=>`<div class="watch-row"><div class="info"><b>${b.name}</b><small>Demo</small></div><div class="metric">%${b.slaRate}</div></div>`).join('');
    return result;
  };
  const originalCharts=window.initCharts;
  window.initCharts=()=>{
    originalCharts();
    const chartRegistry = window.__ototrCharts || (typeof charts !== 'undefined' ? charts : null);
    if(!chartRegistry)return;
    const rows=REVIEWS.filter(r=>!r.demo), now=new Date();
    const months=Array.from({length:12},(_,i)=>new Date(now.getFullYear(),now.getMonth()-11+i,1));
    const volumes=months.map(m=>rows.filter(r=>{const d=new Date(r.createdAt);return d.getFullYear()===m.getFullYear()&&d.getMonth()===m.getMonth();}).length);
    if(chartRegistry.chartTrend){const liveTarget=Math.max(1,Number(BRANCHES.find(b=>b.live)?.target)||200);const monthlyTarget=liveTarget/12;const targetSeries=chartRegistry.chartTrend.data.datasets.find(dataset=>/hedef/i.test(dataset.label||''));const actualSeries=chartRegistry.chartTrend.data.datasets.find(dataset=>/gerçek|alınan/i.test(dataset.label||''));chartRegistry.chartTrend.data.labels=months.map(m=>m.toLocaleDateString('tr-TR',{month:'short',year:'2-digit'}));if(targetSeries){targetSeries.data=months.map(()=>monthlyTarget);targetSeries.label='Bursa · aylık hedef';targetSeries.borderColor='#e11d48';targetSeries.borderWidth=3;targetSeries.borderDash=[10,5];targetSeries.pointRadius=3;targetSeries.pointBackgroundColor='#fff';targetSeries.pointBorderColor='#e11d48';targetSeries.pointBorderWidth=2;targetSeries.backgroundColor='transparent';targetSeries.order=2;}if(actualSeries){actualSeries.data=volumes;actualSeries.label='Bursa · alınan yorumlar';}chartRegistry.chartTrend.update();}
    if(chartRegistry.chartRating){chartRegistry.chartRating.data.datasets[0].data=[5,4,3,2,1].map(star=>rows.filter(r=>r.stars===star).length);chartRegistry.chartRating.update();}
    if(chartRegistry.chartResponse){const durations=rows.filter(r=>r.replyDate&&r.createdAt).map(r=>(Date.parse(r.replyDate)-Date.parse(r.createdAt))/3600000).filter(h=>h>=0);chartRegistry.chartResponse.data.datasets[0].data=[durations.filter(h=>h<2).length,durations.filter(h=>h>=2&&h<6).length,durations.filter(h=>h>=6&&h<24).length,durations.filter(h=>h>=24&&h<48).length,durations.filter(h=>h>=48).length];chartRegistry.chartResponse.update();}
  };
  const originalSimulate = window.openSimReview;
  window.openSimReview = () => {
    originalSimulate();
    document.querySelectorAll('#simBranch option').forEach(option => { if (option.value === 'Bursa Nilüfer') option.remove(); });
  };
  const originalSubmit = window.submitSim;
  window.submitSim = () => {
    const store = document.getElementById('simBranch')?.value;
    if (!['Kocaeli Gebze', 'Bursa İnegöl'].includes(store)) return toast('Simülasyon yalnızca demo şubelerde çalışır.', 'warn');
    const previous = new Set(REVIEWS.map(r => r.id));
    const result = originalSubmit();
    REVIEWS.filter(r => !previous.has(r.id)).forEach(r => { r.demo = true; });
    return result;
  };
  const originalDrawer = window.saveDrawer;
  window.saveDrawer = () => {
    if (typeof CURRENT_DRAWER !== 'undefined' && CURRENT_DRAWER === BRANCHES[0]) return toast('Bursa şube ayarları sunucu kaydıdır; demo formu canlı ayarları değiştirmez.', 'info');
    return originalDrawer();
  };
  const originalToggle = window.toggleAuto;
  window.toggleAuto = (id, val) => {
    if (id === BRANCHES[0]?.id) return toast('Bursa yayın politikası ERP sunucusunda yönetilir; yerel anahtar değiştiremez.', 'info');
    return originalToggle(id, val);
  };
  for (const [name, collection] of [['openCase',LEGAL_CASES],['advanceComplaint',COMPLAINTS],['approveApp',APPROVALS],['rejectApp',APPROVALS]]) {
    const original = window[name];
    window[name] = (id, ...args) => {
      const row = collection.find(row => row.id === id);
      if (row?.erpItemId) {
        if (getAI()?.['openItem']) return getAI()['openItem'](row.erpItemId);
        const review=REVIEWS.find(r=>!r.demo && currentItem(r)?.id===row.erpItemId);
        if(review){ switchView('reviews'); if (typeof selectReview === 'function') selectReview(review.id); else { SEL=review.id; renderReviews?.(); } }
        else toast('Bu canlı görev ERP kuyruğunda kayıtlıdır. Demo adımları canlı görevi değiştiremez.', 'info');
        return;
      }
      return original(id, ...args);
    };
  }
  if (typeof window.openCaseDetail !== 'function' && typeof window.openCase === 'function') window.openCaseDetail = window.openCase;
  const originalNewCase = window.saveCase;
  window.saveCase = () => {
    if (document.getElementById('lcBranch')?.value === '0') {
      toast('Bursa hukuki dosyası için canlı yorumu Hukuk birimine sevk edin.', 'info');
      return;
    }
    return originalNewCase();
  };
  const originalTarget=window.setTarget;
  window.setTarget=(id,val)=>id===BRANCHES[0]?.id?toast('Canlı şube hedefi sunucu ayarlarında korunuyor.','info'):originalTarget(id,val);
  const originalHold=window.toggleHold,originalAdvance=window.advanceCase;
  window.toggleHold=()=>LEGAL_CASES.find(c=>c.id===CURRENT_CASE)?.erpItemId?toast('Canlı hukuki kayıt üzerindeki hold demo formundan değiştirilemez.','warn'):originalHold();
  window.advanceCase=()=>LEGAL_CASES.find(c=>c.id===CURRENT_CASE)?.erpItemId?toast('Canlı kayıt demo adımlarıyla ilerletilemez.','warn'):originalAdvance();
  window.confirmGolive=()=>{closeModal('goliveModal');toast('Bu ekran yayın komutu çalıştırmaz. Dağıtım GitHub Actions üzerinden yapılır.','info');};
  if (typeof CHECKLIST !== 'undefined') CHECKLIST.forEach(c=>c.status='warn');
  const originalSaveAI=window.saveAI;
  window.saveAI=()=>{originalSaveAI();toast('Bu ayarlar yalnız demo için kaydedildi; canlı OpenAI yapılandırması sunucuda korunuyor.','info');};
  const originalSystem = window.renderSystem;
  window.renderSystem = (...args) => {
    const result=originalSystem(...args), workflow=getAI()?.getWorkflowState?.();
    document.getElementById('healthMetrics').innerHTML = `<div class="metric"><div class="ml">ERP kayıt bağlantısı</div><div class="mv">${workflow?.loaded && !workflow.error ? 'Hazır' : 'Doğrulanmadı'}</div><div class="md">${escape(workflow?.error || 'Yetkili ERP oturumu üzerinden')}</div></div>`;
    document.getElementById('svcGrid').innerHTML = '<div class="card">Google bağlantısı kontrol ediliyor…</div>';
    document.getElementById('quotaList').textContent = 'Kota, maliyet, SMTP, Slack ve WhatsApp sağlık ölçümleri bu ERP servisinden sağlanmıyor.';
    if(getAI()?.googleBusinessStatus) Promise.resolve(getAI().googleBusinessStatus()).then(status=>{
      document.getElementById('svcGrid').textContent = status?.connected ? 'Google: bağlı · OpenAI: ERP taslak servisinden çağrılır; her taslağın kaynağı kayıtta gösterilir.' : 'Google bağlantısı doğrulanamadı. Bağlantılar ekranını kontrol edin.';
    }).catch(()=>{document.getElementById('svcGrid').textContent='Google bağlantı sorgusu başarısız.';});
    return result;
  };
  // Keep the original layout while identifying views whose auxiliary data is synthetic.
  const originalView = window.switchView;
  window.switchView = (view, ...args) => {
    const result = originalView(view, ...args);
    let note = document.getElementById('erpDataScope');
    if (!note) { note = document.createElement('div'); note.id = 'erpDataScope'; note.className = 'chip warn'; document.getElementById('pageTitle')?.after(note); }
    note.textContent = ['reviews', 'overview','problems','legal','complaint','approval'].includes(view)
      ? (parentApi?'Bursa: canlı ERP verisi':'ERP oturumu yok · Bursa verisi alınmadı')+' · Gebze / İnegöl: demo. Diğer örnek analizler demo kapsamındadır.'
      : 'Bu bölümdeki örnek ayarlar ve raporlar demo kapsamındadır. Canlı kayıtlar ERP kuyruğunda yönetilir.';
    return result;
  };
  const controls=document.createElement('div');controls.className='pacts';
  controls.innerHTML='<label class="scope-label">Veri kapsamı <select id="erpScopeLevel" aria-label="Veri kapsamı"><option value="hq">Genel merkez</option><option value="region">Bölge</option><option value="city">İl</option><option value="branch">Şube</option></select></label><select id="erpScopeValue" aria-label="Kapsam seçimi"><option value="all">Tüm canlı şubeler</option><option value="Bursa Nilüfer">Bursa · Nilüfer · Canlı</option><option value="Kocaeli Gebze">Gebze · Demo</option><option value="Bursa İnegöl">İnegöl · Demo</option></select><span class="chip ok">1 Canlı · 2 Demo</span><button class="btn sm" id="erpGoogleSync">Bursa’yı yenile</button><button class="btn sm" id="erpGoogleQueue">Canlı yorumlar</button><button class="btn sm" id="erpGoogleConnect">Bağlantı durumu</button>';
  document.querySelector('main')?.prepend?.(controls);
  document.getElementById('erpGoogleSync').onclick=async()=>{
    if(!parentApi)return missing();
    if(isEditing())return toast('Önce açık taslağı kaydedin veya işlemi tamamlayın.','warn');
    try {await parentApi.syncGoogleReviewsForBranch(currentBranchId(),{quiet:true});hydrateLiveBranch();switchView(STATE.view||'overview');}catch(e){toast(e.message,'warn');}
  };
  document.getElementById('erpGoogleQueue').onclick=()=>switchView('reviews');
  document.getElementById('erpGoogleConnect').onclick=()=>switchView('system');
  const scopeLevel=document.getElementById('erpScopeLevel'),scopeValue=document.getElementById('erpScopeValue');
  const applyScopeFilter=()=>{
    const level=scopeLevel.value,value=scopeValue.value;
    FILTER_REGION=''; FILTER_CITY='';
    if(level==='city'&&value==='Bursa') FILTER_CITY='Bursa';
    if(level==='branch'&&value!=='all'){ branchFilter.value=value; window.OTOTRReviewLiveViews?.setScope?.(value); }
    if(level==='hq'||level==='region'||(level==='branch'&&value==='all')) branchFilter.value='live';
    SELECTED.clear(); renderNav(); switchView(STATE.view||'overview');
  };
  scopeLevel.onchange=()=>{ if(scopeLevel.value==='hq'||scopeLevel.value==='region') scopeValue.innerHTML='<option value="all">Tüm canlı şubeler</option>'; else if(scopeLevel.value==='city'){ const cities=[...new Set((window.OTOTRReviewLiveViews?.getBranchRegistry?.()||[]).map(item=>item.city).filter(Boolean))]; scopeValue.innerHTML=cities.map(city=>`<option value="${escape(city)}">${escape(city)}</option>`).join('')||'<option value="Bursa">Bursa</option>'; } else { scopeValue.innerHTML='<option value="all">Tüm canlı şubeler</option>'; refreshBranchControls(); } applyScopeFilter(); };
  scopeValue.onchange=applyScopeFilter;
  document.getElementById('emailModal')?.addEventListener?.('click',event=>{if(event.target.id==='emailModal'){pendingApproval=null;lockEditing();}});
  window.addEventListener('beforeunload',()=>getAI()?.setManagementEditing?.(false));
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'ototr-google-refresh') return;
    if(isEditing())return;
    hydrateLiveBranch();
    if (typeof switchView === 'function') switchView(STATE?.view || 'overview');
  });
  if (typeof switchView === 'function') switchView(STATE?.view || 'overview');
  // Workflow refresh uses the existing authenticated ERP gateway. No API secrets live here.
  if (getAI()?.refreshWorkflow) Promise.resolve(getAI().refreshWorkflow()).then(() => {
    hydrateLiveBranch(); switchView(STATE.view || 'overview');
  }).catch(() => toast('ERP kuyruğu alınamadı. Bağlantılar ekranını kontrol edin.', 'warn'));
})();
