(function () {
  'use strict';
  const BRANCH = 'branch-google-nilufer';
  let ai = null;
  try { if (window.parent !== window && window.parent.location.origin === location.origin) ai = window.parent.OTOTRGoogleReviewAI; } catch (_) {}
  const state = {loaded:false,loading:false,error:null,policy:null,audit:[],users:[],jobs:[],notifications:[],targets:[],templates:[],escalations:[],capabilities:{},settings:{}};
  const locks = new Set();
  const byId = id => document.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const liveScope = () => (window.OTOTRReviewLiveViews?.getScope?.() || 'live') === 'live';
  const items = () => ai?.getWorkflowItems?.() || [];
  const itemById = id => items().find(item => item.id === id && item.branch_id === BRANCH);
  const month = () => { const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit'}).formatToParts(new Date()); return `${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}-01`; };

  async function request(action, payload={}) {
    if (!ai?.googleBusinessRequest) throw new Error('Yetkili ERP oturumu gerekli. Canlı kayıt değiştirilmedi.');
    return ai.googleBusinessRequest(action, {...payload,branch_id:BRANCH});
  }
  function notifyReady() {
    window.OTOTRReviewBridge?.hydrate?.();
    const target = state.targets.find(row => row.month === month());
    if (typeof BRANCHES !== 'undefined' && BRANCHES[0] && target) BRANCHES[0].target = target.target;
    window.dispatchEvent(new CustomEvent('ototr-management-ready'));
    if (!window.OTOTRReviewBridge?.isEditing?.()) window.OTOTRReviewLiveViews?.rerender?.();
  }
  async function refresh() {
    if (state.loading) return state;
    state.loading = true;
    try {
      const data = await request('management_read');
      if (data?.branch_id !== BRANCH || !data.policy) throw new Error('Canlı yönetim verisi doğrulanamadı.');
      Object.assign(state,data,{loaded:true,error:null});
      try { state.targets = ((await request('targets_list')).items || []).filter(row=>row.branch_id===BRANCH && /^20\d{2}-(0[1-9]|1[0-2])-01$/.test(row.month) && Number.isInteger(row.target) && row.target>0 && Number.isInteger(row.version) && row.version>0); state.targetError = null; }
      catch (error) { state.targets = []; state.targetError = error.message; }
    } catch (error) { state.error = error.message || 'Canlı yönetim verileri alınamadı.'; }
    finally { state.loading = false; notifyReady(); }
    return state;
  }
  async function mutate(key, operation) {
    if (locks.has(key)) throw new Error('Bu kayıt için işlem sürüyor.');
    if (window.OTOTRReviewBridge?.isEditing?.()) throw new Error('Önce açık yanıt taslağını kaydedin veya kapatın.');
    locks.add(key);
    try {
      const result = await operation();
      if (result.item) {
        let refreshed = await ai.refreshWorkflow();
        for (let attempt=0; refreshed?.skipped && attempt<100; attempt++) {
          await new Promise(resolve=>setTimeout(resolve,100));
          refreshed=await ai.refreshWorkflow();
        }
        if(refreshed?.skipped || refreshed?.ok===false) throw new Error('İşlem kaydedildi, fakat güncel görev listesi alınamadı. Tekrar işlem yapmadan Bursa’yı yenileyin.');
      }
      await refresh();
      return result;
    } finally { locks.delete(key); }
  }
  async function savePolicy(hours) {
    if (!state.loaded || state.error || !state.policy?.updated_at) throw new Error('Önce canlı ayarları yenileyin.');
    const value = Number(hours);
    if (!Number.isInteger(value) || value < 1 || value > 168) throw new Error('SLA 1–168 saat arasında tam sayı olmalı.');
    return mutate('policy', () => request('management_update',{entity:'policy',expected_updated_at:state.policy.updated_at,default_sla_hours:value}));
  }
  async function saveTarget(value) {
    const target = Number(value);
    if (!state.loaded || state.error || state.targetError) throw new Error('Önce canlı hedef kaydını yenileyin.');
    if (!Number.isInteger(target) || target < 1 || target > 10000) throw new Error('Aylık hedef 1–10000 arasında tam sayı olmalı.');
    const current = state.targets.find(row => row.month === month());
    return mutate('target', () => request('target_save',{month:month(),target,expected_version:current?.version || 0}));
  }
  async function updateTask(id, patch, expectedVersion) {
    const item = itemById(id);
    if (!item || !['legal','complaint','branch'].includes(item.kind)) throw new Error('Canlı görev bulunamadı.');
    const version = expectedVersion ?? item.version;
    if (version !== item.version) throw new Error('Görev sürümü değişti; güncel kaydı açın.');
    return mutate(id, () => request('management_update',{...patch,entity:'task',item_id:id,expected_version:version}));
  }
  async function rejectDraft(id, reason, expectedVersion) {
    const item = itemById(id);
    if (!item || item.kind !== 'reply' || !['approval_pending','publish_failed'].includes(item.status)) throw new Error('Reddedilebilir taslak bulunamadı.');
    const note = String(reason || '').trim();
    if (!note || note.length > 1000) throw new Error('Red gerekçesi 1–1000 karakter olmalı.');
    const version = expectedVersion ?? item.version;
    if (version !== item.version) throw new Error('Taslak sürümü değişti; güncel kaydı inceleyin.');
    return mutate(id, () => request('reject_draft',{item_id:id,expected_version:version,reason:note}));
  }
  async function handle(operation, success) {
    try { const result = await operation(); toast(success || 'Canlı ERP kaydı güncellendi.','ok'); return result; }
    catch (error) { toast(error.message || 'İşlem tamamlanamadı.','warn'); return null; }
  }
  function openReview(item) {
    const review = REVIEWS.find(row => !row.demo && row.googleReviewId === item.review_id);
    if (!review) return toast('Kaynak yorum mevcut senkronizasyon listesinde yok. Bursa’yı yenileyin.','warn');
    if (byId('erpTaskModal')) closeModal('erpTaskModal');
    switchView('reviews'); selectReview(review.id);
  }
  function openTask(id) {
    const item = itemById(id); if (!item) return toast('Canlı görev bulunamadı.','warn');
    let modal = byId('erpTaskModal');
    if (!modal) { modal=document.createElement('div'); modal.className='mbd'; modal.id='erpTaskModal'; document.body.append(modal); modal.addEventListener('click',event=>{if(event.target===modal)closeModal('erpTaskModal');}); }
    const held = item.review_snapshot?.legal_hold === true;
    modal.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="erpTaskTitle"><div class="mhead"><h3 id="erpTaskTitle">${item.kind==='legal'?'Hukuk':item.kind==='complaint'?'Şikayet':'Şube'} görevi · Bursa</h3><button class="btn sm" data-close>Kapat</button></div><div class="mbody"><div class="chip ${item.status==='done'?'ok':'warn'}">${item.status==='done'?'Tamamlandı':'Açık'}${held?' · Hukuki bekletme aktif':''}</div><p>${escape(item.review_snapshot?.reviewer_name || 'Google kullanıcısı')}</p><div class="cd-review">${escape(item.review_snapshot?.comment || 'Yalnız yıldız değerlendirmesi')}</div><p class="mono">Kayıt: ${escape(item.id)} · Sürüm ${item.version}</p><label for="erpTaskNote">Görev notu</label><textarea id="erpTaskNote" rows="5" maxlength="2000" style="width:100%">${escape(item.note || '')}</textarea><p data-result role="status"></p></div><div class="mfoot"><button class="btn" data-review>Kaynak yorum</button>${item.kind==='legal'?`<button class="btn" data-hold>${held?'Bekletmeyi kaldır':'Hukuki bekletme uygula'}</button>`:''}<button class="btn" data-save>Notu kaydet</button><button class="btn p" data-status ${held?'disabled':''}>${item.status==='done'?'Yeniden aç':'Görevi tamamla'}</button></div></div>`;
    modal.querySelector('[data-close]').onclick=()=>closeModal('erpTaskModal');
    modal.querySelector('[data-review]').onclick=()=>openReview(item);
    const submit=async patch=>{
      modal.querySelectorAll('button').forEach(button=>button.disabled=true);
      const result=await handle(()=>updateTask(item.id,{...patch,note:byId('erpTaskNote').value},item.version));
      if(result)openTask(item.id);
      else { modal.querySelectorAll('button').forEach(button=>button.disabled=false); if(held)modal.querySelector('[data-status]').disabled=true; modal.querySelector('[data-result]').textContent='Kaydedilemedi. Girdiğiniz not korundu; güncel kaydı kontrol edin.'; }
    };
    modal.querySelector('[data-save]').onclick=()=>submit({});
    modal.querySelector('[data-status]').onclick=()=>submit({status:item.status==='done'?'open':'done'});
    const hold=modal.querySelector('[data-hold]'); if(hold)hold.onclick=()=>submit({hold:!held});
    openModal('erpTaskModal');
  }

  window.OTOTRReviewManagement = {state,refresh,request,savePolicy,saveTarget,updateTask,rejectDraft,openTask};
  for (const [name,collection] of [['openCase',LEGAL_CASES],['advanceComplaint',COMPLAINTS]]) {
    const original=window[name]; window[name]=(id,...args)=>{const row=collection.find(row=>row.id===id);return row?.erpItemId?openTask(row.erpItemId):original?.(id,...args);};
  }
  const originalApprove=window.approveApp,originalReject=window.rejectApp;
  window.approveApp=id=>{const row=APPROVALS.find(row=>row.id===id);if(!row?.erpItemId)return originalApprove(id);const item=itemById(row.erpItemId);if(item)openReview(item);};
  window.rejectApp=id=>{const row=APPROVALS.find(row=>row.id===id);if(!row?.erpItemId)return originalReject(id);const item=itemById(row.erpItemId);if(!item)return;const reason=prompt('Taslağın red gerekçesi (yanıt Google’a gönderilmez):');if(reason)handle(()=>rejectDraft(item.id,reason,item.version),'Taslak reddedildi; metin ve gerekçe kayıtta korundu.');};
  const originalTarget=window.setTarget;
  window.setTarget=(id,value)=>id===BRANCHES[0]?.id?handle(()=>saveTarget(value),'Bursa aylık hedefi kaydedildi.'):originalTarget(id,value);
  const originalDrawer=window.openDrawer,originalSaveDrawer=window.saveDrawer;
  window.openDrawer=(id,...args)=>{
    const result=originalDrawer(id,...args);
    if(typeof CURRENT_DRAWER!=='undefined' && CURRENT_DRAWER===BRANCHES[0]){
      ['dTone','dGbp','dLifecycle'].forEach(id=>{if(byId(id)){byId(id).disabled=true;byId(id).title='Mevcut ERP yapılandırması; bu formdan değiştirilemez.';}});
      if(state.policy && byId('dSla')){byId('dSla').innerHTML='<option></option>';byId('dSla').firstElementChild.value=state.policy.default_sla_hours;byId('dSla').firstElementChild.textContent=state.policy.default_sla_hours+' saat';for(const hours of [12,24,48,72,168])if(hours!==state.policy.default_sla_hours){const option=document.createElement('option');option.value=hours;option.textContent=hours+' saat';byId('dSla').append(option);}}
    }
    return result;
  };
  window.saveDrawer=async()=>{
    if(typeof CURRENT_DRAWER==='undefined' || CURRENT_DRAWER!==BRANCHES[0])return originalSaveDrawer();
    const hours=Number(byId('dSla')?.value),target=Number(byId('dTarget')?.value);
    const currentTarget=state.targets.find(row=>row.month===month());
    if(hours!==Number(state.policy?.default_sla_hours) && !await handle(()=>savePolicy(hours),'Bursa SLA kaydedildi.'))return;
    if(target!==currentTarget?.target && !await handle(()=>saveTarget(target),'Bursa aylık hedefi kaydedildi.'))return;
    closeDrawer(); window.OTOTRReviewLiveViews?.rerender?.();
  };
  const originalAI=window.saveAI;
  window.saveAI=()=>liveScope()?toast('Canlı OpenAI mevcut ERP servisinden kullanılır. Bu ekranda değiştirilebilir ayarları Şube → SLA/Hedef üzerinden kaydedin.','info'):originalAI();
  const syncButton=byId('erpGoogleSync'),originalSync=syncButton?.onclick;
  if(syncButton)syncButton.onclick=async()=>{
    if(window.OTOTRReviewBridge?.isEditing?.())return toast('Önce açık taslağı kaydedin veya kapatın.','warn');
    syncButton.disabled=true;
    try { await originalSync?.(); await ai?.refreshWorkflow?.(); await refresh(); }
    catch(error){toast(error.message || 'Canlı kayıtlar yenilenemedi.','warn');}
    finally{syncButton.disabled=false;}
  };
  if(ai)refresh();
})();
