(function () {
  'use strict';

  const embedded = new URLSearchParams(location.search).get('embedded') === '1' && window.parent !== window;
  let parentApi = null;
  try { if (embedded && window.parent.location.origin === location.origin) parentApi = window.parent.OTOTRGoogleReputation; } catch (_) {}
  const ai = parentApi ? window.parent.OTOTRGoogleReviewAI : null;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const liveIds = new Map();
  let nextId = -1; // Demo forms allocate positive IDs; keep the namespaces disjoint.
  const workIds = new Map();
  const liveBranchId = 'branch-google-nilufer';
  const allowedNames = new Set(['Bursa Nilüfer', 'Kocaeli Gebze', 'Bursa İnegöl']);

  function branchFullName(branch) {
    return `${branch.city || ''} ${branch.name || ''}`.trim();
  }

  function applyScope() {
    if (typeof BRANCHES === 'undefined' || !Array.isArray(BRANCHES)) return;
    BRANCHES.forEach((branch, index) => {
      const fullName = branchFullName(branch);
      branch.hidden = !allowedNames.has(fullName);
      branch.live = index === 0;
      branch.demo = index === 1 || index === 2;
      if (branch.demo) {
        branch.gbp = '';
        branch.lastSync = 'Demo veri · dış gönderim kapalı';
      }
    });
    BRANCHES.splice(3);
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
    const live = parentApi?.getBranchById?.(liveBranchId);
    const reviews = parentApi?.fetchGoogleReviews?.(liveBranchId) || [];
    const items = ai?.getWorkflowItems?.() || [];
    const policy = window.OTOTRReviewManagement?.state?.policy;
    const slaHours = Number(policy?.default_sla_hours) || 24;
    const target = BRANCHES[0];
    if (target) {
      target.actual = Number(live?.googleReviewCount ?? reviews.length);
      target.rating = Number(live?.googleRating ?? 0);
      target.target = Number(live?.monthlyTarget ?? 0);
      target.slaH = slaHours;
      target.autoreply = policy?.auto_reply_enabled === true;
      target.gbp = live?.googleLocationId || live?.locationId || '';
      target.slaRate = 0;
      target.responseRate = reviews.length ? Math.round(reviews.filter(r => r.isReplied).length / reviews.length * 100) : 0;
      target.criticalRate = reviews.length ? Math.round(reviews.filter(r => r.rating <= 2).length / reviews.length * 100) : 0;
      target.lastSync = live?.lastSyncedAt ? new Date(live.lastSyncedAt).toLocaleString('tr-TR') : 'Senkronizasyon bekleniyor';
    }
    const mapped = reviews.filter(review => !review.demo && review.id && review.branchId === liveBranchId).map(review => {
      if (!liveIds.has(review.id)) liveIds.set(review.id, nextId--);
      const item = items.find(i => i.kind === 'reply' && i.branch_id === liveBranchId && i.review_id === review.googleReviewId);
      const task = items.find(i => i.kind !== 'reply' && i.status === 'open' && i.branch_id === liveBranchId && i.review_id === review.googleReviewId);
      const routedTo = task?.kind === 'branch' ? 'store' : task?.kind || null;
      const replyDate = review.replyUpdatedAt || review.replyDate || null;
      return ({
      id: liveIds.get(review.id),
      erpReviewId: review.id,
      demo: false,
      googleReviewId: review.googleReviewId,
      store: 'Bursa Nilüfer',
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
      const liveItems = items.filter(item => item.branch_id === liveBranchId && item.kind === kind);
      collection.splice(0, collection.length, ...liveItems.map(item => {
        if (!workIds.has(item.id)) workIds.set(item.id, `ERP-${workIds.size + 1}`);
        return {id:workIds.get(item.id), erpItemId:item.id, branchIdx:0, version:item.version, googleReviewId:item.review_id,
          customer:escape(item.review_snapshot?.reviewer_name || 'Google kullanıcısı'),
          text:escape(item.reply_text || item.note || ''), ...convert(item)};
      }), ...demo);
    };
    replace(LEGAL_CASES, 'legal', item => ({category:'Google yorum incelemesi',assignee:'ERP hukuk kuyruğu',status:item.status === 'done' ? 'closed' : 'open',hold:item.review_snapshot?.legal_hold === true,opened:String(item.created_at || '').slice(0,10),sla:slaHours/24,review:escape(item.review_snapshot?.comment || '')}));
    replace(COMPLAINTS, 'complaint', item => ({category:'Google müşteri deneyimi',assignee:'ERP şikayet kuyruğu',status:item.status === 'done' ? 'resolved' : 'received',severity:Number(item.review_snapshot?.rating) <= 2 ? 'high' : 'normal',openedAt:Date.parse(item.created_at),slaH:slaHours,review:escape(item.review_snapshot?.comment || '')}));
    replace(APPROVALS, 'reply', item => ({type:'ERP yanıtı · '+escape(item.review_snapshot?.rejection ? 'Reddedildi' : item.status),level:1,total:1,assignedTo:'ERP yetkili onayı',slaH:slaHours,openedAt:Date.parse(item.created_at)}));
    for (let i=APPROVALS.length-1;i>=0;i--) {
      const item=items.find(item=>item.id===APPROVALS[i].erpItemId);
      if(item && (!['approval_pending','publish_failed','publish_unknown'].includes(item.status) || item.review_snapshot?.rejection)) APPROVALS.splice(i,1);
    }
  }

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
      if (role) { role.disabled = true; role.title = 'Yetkiler ERP hesabınızdan doğrulanır'; role.options[0].textContent='ERP oturumu'; }
    }
  }

  const avatar=document.getElementById('userAvatar');if(avatar)avatar.textContent='ERP';
  applyScope();
  hydrateLiveNilufer();
  markEnvironment();
  const missing = () => toast('Canlı işlem için ERP oturumu ve Google bağlantısı gerekli.', 'warn');
  const liveRow = id => REVIEWS.find(r => r.id === id && !r.demo);
  const dirty = new Map();
  let pendingApproval = null, busy = false;
  const currentItem = row => ai?.getWorkflowItems?.().find(i=>i.kind==='reply' && i.branch_id===liveBranchId && i.review_id===row.googleReviewId);
  const isEditing = () => dirty.size>0 || Boolean(pendingApproval) || busy;
  window.OTOTRReviewBridge = {hydrate:hydrateLiveNilufer,isEditing};
  const lockEditing = () => ai?.setManagementEditing?.(isEditing());
  async function act(id, action, extra={}) {
    const row=liveRow(id); if(!row || !ai?.manageReview) return missing();
    if(busy)return;
    busy=true;lockEditing();
    try {
      const item=currentItem(row);
      const result=await ai.manageReview(row.erpReviewId,action,{version:item?.version,...extra});
      dirty.delete(id);
      if(['publish','verify'].includes(action)) {
        toast(result.status==='published'?'Google yayını doğrulandı.':'Yayın sonucu: '+result.status,result.status==='published'?'ok':'warn');
      } else toast(result.status==='draft_failed'?'Taslak üretilemedi; yeniden deneyebilirsiniz.':'ERP kaydı güncellendi.',result.status==='draft_failed'?'warn':'ok');
      hydrateLiveNilufer();renderReviews();
      return result;
    } catch(e) {toast(e.message || 'ERP işlemi başarısız; kayıt korunuyor.','warn');}
    finally {busy=false;lockEditing();}
  }
  const originalEmail=window.openEmail, originalConfirm=window.confirmEmail, originalRegen=window.regenDraft;
  window.openEmail=id=>{
    const row=liveRow(id);if(!row)return originalEmail(id);
    const item=currentItem(row);
    if(dirty.has(id))return toast('Önce düzenlediğiniz taslağı kaydedin.','warn');
    if(item?.review_snapshot?.rejection)return toast('Bu taslak reddedildi. Önce düzenleyip yeniden kaydedin.','warn');
    if(!item?.reply_text || !['approval_pending','publish_failed'].includes(item.status))return toast('Önce geçerli bir taslak hazırlayın.','warn');
    pendingApproval={id,version:item.version,text:item.reply_text};lockEditing();
    document.getElementById('emailFrom').textContent='Bursa Nilüfer · canlı Google yayını';
    document.getElementById('emailTo').textContent='Google yorumu';
    document.getElementById('emailReview').textContent=parentApi.getReviewById(row.erpReviewId)?.comment || '';
    document.getElementById('emailResp').textContent=item.reply_text;
    openModal('emailModal');
  };
  window.confirmEmail=async()=>{
    if(!pendingApproval)return originalConfirm();
    const approved={...pendingApproval};
    const result=await act(approved.id,'publish',{version:approved.version,text:approved.text,approved:true});
    if(result){pendingApproval=null;closeModal('emailModal');lockEditing();}
  };
  const originalClose=window.closeModal;
  window.closeModal=id=>{if(id==='emailModal'){pendingApproval=null;lockEditing();}return originalClose(id);};
  window.regenDraft=id=>liveRow(id)?act(id,currentItem(liveRow(id))?.reply_text?'regenerate':'prepare'):originalRegen(id);
  window.saveLiveDraft=id=>{const edit=dirty.get(id);if(edit)return act(id,'save',{text:edit.text,version:edit.version});};
  window.verifyLiveReply=id=>act(id,'verify');
  const originalRoute=window.routeReview;
  window.routeReview=(id,target)=>liveRow(id)?act(id,target==='store'?'branch':target):originalRoute(id,target);
  const originalCloseRoute=window.closeRouting;
  window.closeRouting=id=>liveRow(id)?toast('Canlı görev durumu ERP kaydı üzerinden takip edilir.','info'):originalCloseRoute(id);
  const originalBulk=window.bulkAction;
  window.bulkAction=action=>{
    if([...SELECTED].some(id=>liveRow(id))&&action!=='clear')return toast('Canlı yorumları ayrı ayrı inceleyip onaylayın. Demo toplu işlemler canlı kayıtları değiştirmez.','warn');
    return originalBulk(action);
  };
  const branchFilter=document.createElement('select');branchFilter.id='erpBranchFilter';branchFilter.setAttribute('aria-label','Şube ve veri ortamı');
  branchFilter.innerHTML='<option value="live">Bursa Nilüfer · Canlı</option><option value="Kocaeli Gebze">Gebze · Demo</option><option value="Bursa İnegöl">İnegöl · Demo</option><option value="all">Tümü · Canlı + Demo</option>';
  branchFilter.value=parentApi?'live':'all';
  document.getElementById('rvSort')?.after(branchFilter);
  const originalFiltered=window.getFilteredReviews;
  window.getFilteredReviews=()=>originalFiltered().filter(row=>branchFilter.value==='all'||(branchFilter.value==='live'?!row.demo:row.demo&&row.store===branchFilter.value));
  branchFilter.onchange=()=>{SELECTED.clear();SEL=null;renderReviews();};
  const originalRender=window.renderReviews;
  window.renderReviews=(...args)=>{
    const result=originalRender(...args),row=liveRow(SEL),box=document.getElementById('draftBox');
    const filtered=getFilteredReviews();
    document.querySelectorAll('#rvList .row2').forEach((node,index)=>{node.textContent+=' · '+(filtered[index]?.demo?'Demo':'Canlı');});
    const selected=REVIEWS.find(r=>r.id===SEL),meta=document.querySelector('#rvDetail .meta');
    if(selected&&meta){const badge=document.createElement('span');badge.className='chip '+(selected.demo?'warn':'ok');badge.textContent=selected.demo?'Demo · Google’a gönderilmez':'Bursa · Canlı Google kaydı';meta.prepend(badge);}
    if(!row||!box)return result;
    const item=currentItem(row),edit=dirty.get(row.id);
    const editable=!row.replyDate && row.status!=='gonderildi' && ['approval_pending','publish_failed'].includes(item?.status);
    box.readOnly=!editable;
    box.maxLength=4000;
    if(edit)box.value=edit.text;
    else if(item && row.status!=='gonderildi')box.value=item.reply_text||'';
    box.oninput=()=>{dirty.set(row.id,{text:box.value,version:edit?.version ?? item?.version});pendingApproval=null;lockEditing();};
    const actions=document.querySelector('#rvTab-detail .actions');
    if(actions && row.status!=='gonderildi'){
      actions.innerHTML=`<button class="btn p" onclick="openEmail(${row.id})" ${editable?'':'disabled'}>✓ Onayla</button><button class="btn" onclick="regenDraft(${row.id})">↻ ${item?.reply_text?'Yeniden':'Taslak hazırla'}</button><button class="btn" onclick="saveLiveDraft(${row.id})" ${editable?'':'disabled'}>Kaydet</button>${['publishing','publish_unknown','publish_failed'].includes(item?.status)?`<button class="btn" onclick="verifyLiveReply(${row.id})">Yayın sonucunu kontrol et</button>`:''}`;
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
    if(typeof charts==='undefined')return;
    const rows=REVIEWS.filter(r=>!r.demo), now=new Date();
    const months=Array.from({length:12},(_,i)=>new Date(now.getFullYear(),now.getMonth()-11+i,1));
    const volumes=months.map(m=>rows.filter(r=>{const d=new Date(r.createdAt);return d.getFullYear()===m.getFullYear()&&d.getMonth()===m.getMonth();}).length);
    if(charts.chartTrend){charts.chartTrend.data.labels=months.map(m=>m.toLocaleDateString('tr-TR',{month:'short',year:'2-digit'}));charts.chartTrend.data.datasets[0].data=[];charts.chartTrend.data.datasets[1].data=volumes;charts.chartTrend.data.datasets[1].label='Bursa · alınan yorumlar';charts.chartTrend.update();}
    if(charts.chartRating){charts.chartRating.data.datasets[0].data=[5,4,3,2,1].map(star=>rows.filter(r=>r.stars===star).length);charts.chartRating.update();}
    if(charts.chartResponse){const durations=rows.filter(r=>r.replyDate&&r.createdAt).map(r=>(Date.parse(r.replyDate)-Date.parse(r.createdAt))/3600000).filter(h=>h>=0);charts.chartResponse.data.datasets[0].data=[durations.filter(h=>h<2).length,durations.filter(h=>h>=2&&h<6).length,durations.filter(h=>h>=6&&h<24).length,durations.filter(h=>h>=24&&h<48).length,durations.filter(h=>h>=48).length];charts.chartResponse.update();}
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
      if (row?.erpItemId) { const review=REVIEWS.find(r=>!r.demo && currentItem(r)?.id===row.erpItemId); if(review){ switchView('reviews');selectReview(review.id); } else toast('Bu canlı görev ERP kuyruğunda kayıtlıdır. Demo adımları canlı görevi değiştiremez.', 'info'); return; }
      return original(id, ...args);
    };
  }
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
  CHECKLIST.forEach(c=>c.status='warn');
  const originalSaveAI=window.saveAI;
  window.saveAI=()=>{originalSaveAI();toast('Bu ayarlar yalnız demo için kaydedildi; canlı OpenAI yapılandırması sunucuda korunuyor.','info');};
  const originalSystem = window.renderSystem;
  window.renderSystem = (...args) => {
    const result=originalSystem(...args), workflow=ai?.getWorkflowState?.();
    document.getElementById('healthMetrics').innerHTML = `<div class="metric"><div class="ml">ERP kayıt bağlantısı</div><div class="mv">${workflow?.loaded && !workflow.error ? 'Hazır' : 'Doğrulanmadı'}</div><div class="md">${escape(workflow?.error || 'Yetkili ERP oturumu üzerinden')}</div></div>`;
    document.getElementById('svcGrid').innerHTML = '<div class="card">Google bağlantısı kontrol ediliyor…</div>';
    document.getElementById('quotaList').textContent = 'Kota, maliyet, SMTP, Slack ve WhatsApp sağlık ölçümleri bu ERP servisinden sağlanmıyor.';
    if(ai?.googleBusinessStatus) Promise.resolve(ai.googleBusinessStatus()).then(status=>{
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
  document.querySelector('main').prepend(controls);
  document.getElementById('erpGoogleSync').onclick=async()=>{
    if(!parentApi)return missing();
    if(isEditing())return toast('Önce açık taslağı kaydedin veya işlemi tamamlayın.','warn');
    try {await parentApi.syncGoogleReviewsForBranch(liveBranchId,{quiet:true});hydrateLiveNilufer();switchView(STATE.view||'overview');}catch(e){toast(e.message,'warn');}
  };
  document.getElementById('erpGoogleQueue').onclick=()=>switchView('reviews');
  document.getElementById('erpGoogleConnect').onclick=()=>switchView('system');
  const scopeLevel=document.getElementById('erpScopeLevel'),scopeValue=document.getElementById('erpScopeValue');
  const applyScopeFilter=()=>{
    const level=scopeLevel.value,value=scopeValue.value;
    FILTER_REGION=''; FILTER_CITY='';
    if(level==='city'&&value==='Bursa') FILTER_CITY='Bursa';
    if(level==='branch'&&value!=='all'){ branchFilter.value=value; }
    if(level==='hq'||level==='region'||(level==='branch'&&value==='all')) branchFilter.value='live';
    SELECTED.clear(); renderNav(); switchView(STATE.view||'overview');
  };
  scopeLevel.onchange=()=>{ if(scopeLevel.value==='hq'||scopeLevel.value==='region') scopeValue.innerHTML='<option value="all">Tüm canlı şubeler</option>'; else if(scopeLevel.value==='city') scopeValue.innerHTML='<option value="Bursa">Bursa</option>'; else scopeValue.innerHTML='<option value="all">Tüm canlı şubeler</option><option value="Bursa Nilüfer">Bursa · Nilüfer · Canlı</option><option value="Kocaeli Gebze">Gebze · Demo</option><option value="Bursa İnegöl">İnegöl · Demo</option>'; applyScopeFilter(); };
  scopeValue.onchange=applyScopeFilter;
  document.getElementById('emailModal')?.addEventListener('click',event=>{if(event.target.id==='emailModal'){pendingApproval=null;lockEditing();}});
  window.addEventListener('beforeunload',()=>ai?.setManagementEditing?.(false));
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'ototr-google-refresh') return;
    if(isEditing())return;
    hydrateLiveNilufer();
    if (typeof switchView === 'function') switchView(STATE?.view || 'overview');
  });
  if (typeof switchView === 'function') switchView(STATE?.view || 'overview');
  // Workflow refresh uses the existing authenticated ERP gateway. No API secrets live here.
  if (ai?.refreshWorkflow) Promise.resolve(ai.refreshWorkflow()).then(() => {
    hydrateLiveNilufer(); switchView(STATE.view || 'overview');
  }).catch(() => toast('ERP kuyruğu alınamadı. Bağlantılar ekranını kontrol edin.', 'warn'));
})();
