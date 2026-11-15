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
    const target = BRANCHES[0];
    if (target) {
      target.actual = Number(live?.googleReviewCount ?? reviews.length);
      target.rating = Number(live?.googleRating ?? 0);
      target.target = Number(live?.monthlyTarget ?? 0);
      target.slaRate = 0;
      target.responseRate = reviews.length ? Math.round(reviews.filter(r => r.isReplied).length / reviews.length * 100) : 0;
      target.criticalRate = reviews.length ? Math.round(reviews.filter(r => r.rating <= 2).length / reviews.length * 100) : 0;
      target.lastSync = live?.lastSyncedAt ? new Date(live.lastSyncedAt).toLocaleString('tr-TR') : 'Senkronizasyon bekleniyor';
    }
    const mapped = reviews.filter(review => !review.demo && review.id && review.branchId === liveBranchId).map(review => {
      if (!liveIds.has(review.id)) liveIds.set(review.id, nextId--);
      const item = items.find(i => i.kind === 'reply' && i.branch_id === liveBranchId && i.review_id === review.googleReviewId);
      return ({
      id: liveIds.get(review.id),
      erpReviewId: review.id,
      demo: false,
      googleReviewId: review.googleReviewId,
      store: 'Bursa Nilüfer',
      author: escape(review.reviewerName || 'Google kullanıcısı'),
      stars: Math.max(1, Math.min(5, Number(review.rating) || 1)),
      risk: Number(review.starRating || review.rating || 0) <= 2 ? 85 : Number(review.starRating || review.rating || 0) === 3 ? 45 : 8,
      tag: Number(review.starRating || review.rating || 0) <= 2 ? 'Kritik' : Number(review.starRating || review.rating || 0) === 3 ? 'Takip' : 'Olumlu',
      text: escape(review.comment || ''),
      drafts: [escape(review.isReplied ? review.replyText || '' : item?.reply_text || 'ERP üzerinden taslak hazırlamak için Yeniden düğmesini kullanın.')],
      status: review.isReplied ? 'gonderildi' : 'bekliyor',
      time: review.reviewDate ? new Date(review.reviewDate).toLocaleString('tr-TR') : 'Canlı Google kaydı',
      slaH: 12,
      escalated: false,
      createdAt: review.reviewDate || null,
      replyDate: review.replyDate || null,
      pipeline: {routedTo:null, stages:{received:{done:true,ts:review.reviewDate || null},classified:{done:Boolean(item),ts:item?.created_at || null},draft:{done:Boolean(item?.reply_text),ts:item?.created_at || null},routed:{done:false,ts:null},responded:{done:Boolean(review.isReplied),ts:review.replyDate || null},closed:{done:false,ts:null}}},
    }); });
    REVIEWS.splice(0, REVIEWS.length, ...mapped, ...REVIEWS.filter(review => review.demo));
    const replace = (collection, kind, convert) => {
      const demo = collection.filter(row => !row.erpItemId);
      const liveItems = items.filter(item => item.branch_id === liveBranchId && item.kind === kind);
      collection.splice(0, collection.length, ...liveItems.map(item => {
        if (!workIds.has(item.id)) workIds.set(item.id, `ERP-${workIds.size + 1}`);
        return {id:workIds.get(item.id), erpItemId:item.id, branchIdx:0,
          customer:escape(item.review_snapshot?.reviewer_name || 'Google kullanıcısı'),
          text:escape(item.reply_text || item.note || ''), ...convert(item)};
      }), ...demo);
    };
    replace(LEGAL_CASES, 'legal', item => ({category:'Google yorum incelemesi',assignee:'ERP hukuk kuyruğu',status:item.status === 'done' ? 'closed' : 'open',hold:item.status !== 'done',opened:String(item.created_at || '').slice(0,10),sla:7,review:escape(item.review_snapshot?.comment || '')}));
    replace(COMPLAINTS, 'complaint', item => ({category:'Google müşteri deneyimi',assignee:'ERP şikayet kuyruğu',status:item.status === 'done' ? 'resolved' : 'received',severity:'normal',openedAt:Date.parse(item.created_at),slaH:24}));
    replace(APPROVALS, 'reply', item => ({type:'ERP yanıtı · '+escape(item.status),level:1,total:1,assignedTo:'ERP yetkili onayı',slaH:24,openedAt:Date.parse(item.created_at)}));
    for (let i=APPROVALS.length-1;i>=0;i--) {
      const item=items.find(item=>item.id===APPROVALS[i].erpItemId);
      if(item && item.status==='published') APPROVALS.splice(i,1);
    }
  }

  function markEnvironment() {
    document.documentElement.dataset.erpEmbedded = embedded ? 'true' : 'false';
    const env = document.querySelector('.env');
    if (env) env.innerHTML = '<i></i>' + (parentApi ? 'Bursa ERP bağlantısı · Gebze/İnegöl demo' : 'ERP oturumu yok · canlı işlemler kapalı');
    document.querySelectorAll('option').forEach(option => {
      if (/Gebze|İnegöl/.test(option.textContent || '') && !/Demo/.test(option.textContent || '')) option.textContent += ' · Demo';
    });
    if (embedded) {
      STATE.onboarded = true;
      const tour = document.getElementById('tourOverlay');
      if (tour) tour.style.display = 'none';
      const role = document.getElementById('roleSelect');
      if (role) { role.disabled = true; role.title = 'Yetkiler ERP hesabınızdan doğrulanır'; }
    }
  }

  applyScope();
  hydrateLiveNilufer();
  markEnvironment();
  const missing = () => toast('Canlı işlem için ERP oturumu ve Google bağlantısı gerekli.', 'warn');
  const liveRow = id => REVIEWS.find(r => r.id === id && !r.demo);
  for (const name of ['openEmail', 'regenDraft', 'closeRouting']) {
    const original = window[name];
    window[name] = function(id, ...args) {
      const row = liveRow(id);
      if (!row) return original(id, ...args);
      if (!ai) return missing();
      if (name === 'closeRouting') return parentApi.setCenterView('inbox', 'waiting');
      return ai.generate(row.erpReviewId);
    };
  }
  const originalRoute = window.routeReview;
  window.routeReview = async (id, target) => {
    const row = liveRow(id);
    if (!row) return originalRoute(id, target);
    if (!ai) return missing();
    const item = await ai.createTask(row.erpReviewId, target === 'store' ? 'branch' : target);
    if (item) { hydrateLiveNilufer(); renderReviews(); }
  };
  const originalBulk = window.bulkAction;
  window.bulkAction = action => {
    if ([...SELECTED].some(id => liveRow(id)) && action !== 'clear') {
      toast('Canlı yorumlar ERP onay kuyruğunda tek tek incelenir.', 'info');
      return parentApi?.setCenterView('inbox', 'waiting');
    }
    return originalBulk(action);
  };
  const originalRender = window.renderReviews;
  window.renderReviews = (...args) => {
    const result = originalRender(...args);
    if (liveRow(SEL)) { const box = document.getElementById('draftBox'); if (box) box.readOnly = true; }
    return result;
  };
  const originalOverview = window.renderOverview;
  window.renderOverview = (...args) => {
    const result = originalOverview(...args);
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
  const originalCharts=window.initOverviewCharts;
  window.initOverviewCharts=()=>{
    originalCharts();
    if(typeof charts==='undefined')return;
    const rows=REVIEWS.filter(r=>!r.demo), now=new Date();
    const months=Array.from({length:12},(_,i)=>new Date(now.getFullYear(),now.getMonth()-11+i,1));
    const volumes=months.map(m=>rows.filter(r=>{const d=new Date(r.createdAt);return d.getFullYear()===m.getFullYear()&&d.getMonth()===m.getMonth();}).length);
    if(charts.chartTrend){charts.chartTrend.data.labels=months.map(m=>m.toLocaleDateString('tr-TR',{month:'short',year:'2-digit'}));charts.chartTrend.data.datasets[0].data=[];charts.chartTrend.data.datasets[1].data=volumes;charts.chartTrend.data.datasets[1].label='Bursa · alınan yorumlar';charts.chartTrend.update();}
    if(charts.chartRating){charts.chartRating.data.datasets[0].data=[5,4,3,2,1].map(star=>rows.filter(r=>r.stars===star).length);charts.chartRating.update();}
    if(charts.chartResponse){const durations=rows.filter(r=>r.replyDate&&r.createdAt).map(r=>(Date.parse(r.replyDate)-Date.parse(r.createdAt))/3600000).filter(h=>h>=0);charts.chartResponse.data.datasets[0].data=[durations.filter(h=>h<2).length,durations.filter(h=>h>=2&&h<6).length,durations.filter(h=>h>=6&&h<24).length,durations.filter(h=>h>=24&&h<48).length,durations.filter(h=>h>=48).length];charts.chartResponse.update();}
  };
  const originalSimulate = window.openSimulateReview;
  window.openSimulateReview = () => {
    originalSimulate();
    document.querySelectorAll('#simBranch option').forEach(option => { if (option.value === 'Bursa Nilüfer') option.remove(); });
  };
  const originalSubmit = window.submitSimReview;
  window.submitSimReview = () => {
    const store = document.getElementById('simBranch')?.value;
    if (!['Kocaeli Gebze', 'Bursa İnegöl'].includes(store)) return toast('Simülasyon yalnızca demo şubelerde çalışır.', 'warn');
    const previous = new Set(REVIEWS.map(r => r.id));
    const result = originalSubmit();
    REVIEWS.filter(r => !previous.has(r.id)).forEach(r => { r.demo = true; });
    return result;
  };
  const originalDrawer = window.saveDrawer;
  window.saveDrawer = () => {
    if (typeof CURRENT_DRAWER !== 'undefined' && CURRENT_DRAWER === BRANCHES[0]) return parentApi ? parentApi.setCenterView('goals') : missing();
    return originalDrawer();
  };
  const originalToggle = window.toggleAuto;
  window.toggleAuto = (id, val) => {
    if (id === BRANCHES[0]?.id) return toast('Bursa yayın politikası ERP sunucusunda yönetilir; yerel anahtar değiştiremez.', 'info');
    return originalToggle(id, val);
  };
  for (const [name, collection] of [['openCaseDetail',LEGAL_CASES],['advanceComplaint',COMPLAINTS],['approveApp',APPROVALS],['rejectApp',APPROVALS]]) {
    const original = window[name];
    window[name] = (id, ...args) => {
      const row = collection.find(row => row.id === id);
      if (row?.erpItemId) return ai ? ai.openItem(row.erpItemId) : missing();
      return original(id, ...args);
    };
  }
  const originalNewCase = window.saveLegalCase;
  window.saveLegalCase = () => {
    if (document.getElementById('lcBranch')?.value === '0') {
      toast('Bursa hukuki dosyası için canlı yorumu Hukuk birimine sevk edin.', 'info');
      return;
    }
    return originalNewCase();
  };
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
    note.textContent = ['reviews', 'overview','legal','complaint','approval'].includes(view)
      ? 'Bursa: ERP verisi · Gebze / İnegöl: demo · Genel KPI ve zaman grafikleri yalnızca alınan Bursa kayıtlarını gösterir; diğer örnek analizler demo kapsamındadır.'
      : 'Bu bölümdeki örnek ayarlar ve raporlar demo kapsamındadır. Canlı kayıtlar ERP kuyruğunda yönetilir.';
    return result;
  };
  const env = document.querySelector('.env');
  if (env) {
    const controls = document.createElement('div');
    controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:8px 0';
    controls.innerHTML = '<button class="btn sm" id="erpGoogleSync">Bursa’yı yenile</button> <button class="btn sm" id="erpGoogleQueue">Canlı onaylar</button> <button class="btn sm" id="erpGoogleConnect">Bağlantılar</button>';
    document.getElementById('pageTitle')?.after(controls);
    document.getElementById('erpGoogleSync').onclick = async () => {
      if (!parentApi) return missing();
      await parentApi.syncGoogleReviewsForBranch(liveBranchId, {quiet: true});
      hydrateLiveNilufer(); switchView(STATE.view || 'overview');
    };
    document.getElementById('erpGoogleQueue').onclick = () => parentApi ? parentApi.setCenterView('inbox', 'waiting') : missing();
    document.getElementById('erpGoogleConnect').onclick = () => parentApi ? parentApi.setCenterView('connections') : missing();
  }
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'ototr-google-refresh') return;
    hydrateLiveNilufer();
    if (typeof switchView === 'function') switchView(STATE?.view || 'overview');
  });
  if (typeof switchView === 'function') switchView(STATE?.view || 'overview');
  // Workflow refresh uses the existing authenticated ERP gateway. No API secrets live here.
  if (ai?.refreshWorkflow) Promise.resolve(ai.refreshWorkflow()).then(() => {
    hydrateLiveNilufer(); switchView(STATE.view || 'overview');
  }).catch(() => toast('ERP kuyruğu alınamadı. Bağlantılar ekranını kontrol edin.', 'warn'));
})();
