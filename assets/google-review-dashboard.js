(function () {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function dayKey(value) {
    const d = new Date(value);
    if (!Number.isFinite(d.getTime())) return '';
    const p = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
    const get = key => p.find(x => x.type === key).value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }
  const monthKey = value => dayKey(value).slice(0,7);
  function monthsEnding(month, count=6) {
    const [y,m] = month.split('-').map(Number);
    return Array.from({length:count}, (_,i) => {const d = new Date(Date.UTC(y,m-count+i,1)); return d.toISOString().slice(0,7);});
  }
  const monthLabel = month => new Date(`${month}-01T12:00:00Z`).toLocaleDateString('tr-TR',{month:'long',year:'numeric',timeZone:'Europe/Istanbul'});
  const metric = v => v == null ? '—' : Number(v).toLocaleString('tr-TR',{maximumFractionDigits:1});
  function model(branches, reviews, targets, month, now=new Date()) {
    const today=dayKey(now),current=today.slice(0,7),[y,m]=month.split('-').map(Number),days=new Date(Date.UTC(y,m,0)).getUTCDate();
    const elapsed=month<current?days:month>current?0:Number(today.slice(-2));
    const seen=new Set();
    const valid=reviews.filter(r=>{const k=`${r.branchId}:${r.id}`,date=dayKey(r.reviewDate); if(seen.has(k)||!date||new Date(r.reviewDate)>now)return false;seen.add(k);return true;});
    const rows=branches.map(b=>{
      const all=valid.filter(r=>r.branchId===b.id),inMonth=all.filter(r=>monthKey(r.reviewDate)===month);
      const known=Boolean(b.synced),complete=known&&b.reviewListComplete===true&&!b.syncError;
      const stored=targets.find(t=>t.branch_id===b.id&&t.month===`${month}-01`);
      const target=Number.isSafeInteger(stored?.target)&&stored.target>0?stored.target:null;
      const count=known?inMonth.length:null,pct=target&&count!=null?Math.round(count/target*100):null;
      const remaining=target&&count!=null?Math.max(0,target-count):null;
      const projection=complete&&elapsed?Math.round(inMonth.length/elapsed*days):null;
      const need=remaining==null?null:month<current?null:Math.ceil(remaining/Math.max(1,days-elapsed+1));
      return {branch:b,all,inMonth,known,complete,target,count,pct,remaining,projection,need,version:stored?.version||0};
    });
    const complete=rows.every(r=>r.complete),known=rows.every(r=>r.known),hasTargets=rows.length>0&&rows.every(r=>r.target!=null);
    const total=known?rows.reduce((n,r)=>n+r.count,0):null,target=hasTargets?rows.reduce((n,r)=>n+r.target,0):null;
    return {rows,days,elapsed,current,complete,known,total,target,projection:complete&&elapsed?Math.round(total/elapsed*days):null,need:target&&known&&month>=current?Math.ceil(Math.max(0,target-total)/Math.max(1,days-elapsed+1)):null};
  }
  let view='dashboard',month=monthKey(new Date()),items=[],loaded=false,busy=false,error='',message='';
  const drafts=new Map();
  const rerender=()=>window.OTOTRGoogleReputation?.render?.();
  async function load() {
    if(busy)return;busy=true;error='';rerender();
    try {const result=await window.OTOTRGoogleReviewAI.googleBusinessRequest('targets_list');if(!Array.isArray(result.items))throw new Error('Hedef yanıtı okunamadı.');items=result.items;loaded=true;}
    catch(e){error=e.message||'Hedefler alınamadı.';}
    finally{busy=false;rerender();}
  }
  async function save(branchId) {
    if(busy||!loaded||error)return;
    const saveMonth=month,key=`${branchId}:${saveMonth}`,text=drafts.get(key),target=Number(text);
    if(!text||!Number.isSafeInteger(target)||target<1||target>10000){message='1–10000 arasında tam sayı hedef girin.';rerender();return;}
    const previous=items.find(t=>t.branch_id===branchId&&t.month===`${saveMonth}-01`);
    busy=true;message='';rerender();
    try {
      const result=await window.OTOTRGoogleReviewAI.googleBusinessRequest('target_save',{branch_id:branchId,month:`${saveMonth}-01`,target,expected_version:previous?.version||0});
      if(!result.item||result.item.branch_id!==branchId||result.item.month!==`${saveMonth}-01`)throw new Error('Kaydedilen hedef doğrulanamadı.');
      items=items.filter(t=>!(t.branch_id===branchId&&t.month===`${saveMonth}-01`));items.push(result.item);drafts.delete(key);message='Hedef genel merkez için kaydedildi.';
    }catch(e){error=e.message||'Hedef kaydedilemedi.';}
    finally{busy=false;rerender();}
  }
  function navigation(){return `<nav class="google-dashboard-nav" aria-label="Yorum merkezi görünümleri">${[['dashboard','Dashboard'],['reviews','Yorumlar ve yanıtlar'],['targets','Hedefler']].map(([id,label])=>`<button type="button" data-google-view="${id}" aria-pressed="${view===id}" class="${view===id?'active':''}">${label}</button>`).join('')}</nav>`;}
  function chart(data) {
    if(!data.known)return '<p class="google-empty">Grafik için şube yorumlarının alınması bekleniyor.</p>';
    const cumulative=Array.from({length:data.elapsed+1},(_,day)=>data.rows.reduce((n,r)=>n+r.inMonth.filter(v=>Number(dayKey(v.reviewDate).slice(-2))<=day).length,0));
    const max=Math.max(1,data.target||0,data.projection||0,...cumulative),x=day=>36+day/data.days*590,y=n=>178-n/max*145;
    const points=cumulative.map((n,i)=>`${x(i)},${y(n)}`).join(' ');
    return `<svg class="google-goal-chart" viewBox="0 0 660 210" role="img" aria-label="${esc(monthLabel(month))}: ${metric(data.total)} alınan yorum${data.target?`, hedef ${data.target}`:''}"><line x1="36" y1="178" x2="626" y2="178" stroke="currentColor" opacity=".2"/>${data.target?`<line x1="36" y1="178" x2="626" y2="${y(data.target)}" stroke="currentColor" opacity=".5" stroke-dasharray="6 5"/>`:''}${data.elapsed?`<polyline points="${points}" fill="none" stroke="#805e27" stroke-width="3"/><circle cx="${x(data.elapsed)}" cy="${y(data.total)}" r="4" fill="#805e27"/>`:''}${data.projection!=null&&data.elapsed<data.days?`<line x1="${x(data.elapsed)}" y1="${y(data.total)}" x2="626" y2="${y(data.projection)}" stroke="#2a6e51" stroke-width="2" stroke-dasharray="3 5"/>`:''}<g fill="currentColor" font-size="12"><text x="8" y="35">${max}</text><text x="18" y="181">0</text><text x="36" y="201">1. gün</text><text x="565" y="201">${data.days}. gün</text></g></svg><p class="google-dashboard-note">Dolu çizgi: alınan yorumlar · Kesikli çizgi: hedef · Noktalı çizgi: doğrusal tahmin. Tahmin garanti değildir; eksik listede hesaplanmaz.</p>`;
  }
  function render(branches,reviews,selected) {
    if(view==='reviews')return '';
    const scope=selected==='all'?branches:branches.filter(b=>b.id===selected),data=model(scope,reviews,items,month);
    const notice=error?`<p role="alert" class="google-ai-warning">${esc(error)} Kaydetmeden önce hedefleri yenileyin.</p>`:!loaded?'<p role="status">Hedefler henüz yüklenmedi. Hedefleri yenile düğmesine basın.</p>':'';
    const head=`<header class="google-dashboard-head"><div><h2>${view==='targets'?'Aylık hedefler':'Dashboard'}</h2><p>${selected==='all'?'Tüm şubeler':esc(scope[0]?.name||'')} · ${esc(monthLabel(month))}</p></div><label>Ay <input type="month" min="2000-01" max="2099-12" data-google-goal-month value="${month}" ${busy?'disabled':''}></label><button type="button" class="google-action-btn" data-google-target-reload ${busy?'disabled':''}>${busy?'İşleniyor…':'Hedefleri yenile'}</button></header>${notice}${message?`<p role="status" class="google-api-note">${esc(message)}</p>`:''}`;
    const editors=data.rows.map(r=>{const key=`${r.branch.id}:${month}`,value=drafts.has(key)?drafts.get(key):r.target||'';return `<div class="google-target-editor"><div><strong>${esc(r.branch.name.replace('OTOTR Oto Ekspertiz ',''))}</strong><small>${r.target?`Kayıtlı hedef: ${r.target}`:'Bu ay için hedef belirlenmedi'}</small></div><label>Aylık yorum hedefi<input type="number" min="1" max="10000" step="1" data-google-goal-input="${esc(r.branch.id)}" value="${esc(value)}" ${busy||!loaded||error?'disabled':''}></label><button type="button" class="google-action-btn" data-google-goal-save="${esc(r.branch.id)}" ${busy||!loaded||error?'disabled':''}>Kaydet</button></div>`;}).join('');
    if(view==='targets')return `<section class="google-dashboard">${head}<section class="google-premium-card"><h3>Şube hedefleri</h3><p class="google-dashboard-note">Hedefler seçilen ay için genel merkez hesabında ortak kaydedilir. Yeni ayın hedefi otomatik atanmaz; geçmiş aylar korunur.</p>${editors}</section></section>`;
    const pct=data.target&&data.total!=null?Math.round(data.total/data.target*100):null;
    const cards=[['Bu ay alınan',data.total],['Aylık hedef',data.target],['Ay sonu tahmini',data.projection],['Günlük gereken',data.need]];
    const progress=data.rows.map(r=>`<article class="google-goal-branch"><strong>${esc(r.branch.name.replace('OTOTR Oto Ekspertiz ',''))}</strong><div class="google-goal-total">${metric(r.count)} <small>/ ${metric(r.target)}</small></div><progress max="100" value="${Math.min(100,r.pct||0)}" aria-label="${esc(r.branch.name)} hedef ilerlemesi"></progress><p>${r.pct==null?'Hedef belirlenmedi':`%${r.pct} tamamlandı`}${!r.complete?' · Eksik veya eski veri':''}</p><small>${r.need==null?'Günlük ihtiyaç hesaplanmadı':`Günde ${r.need} yorum gerekiyor`}</small></article>`).join('');
    const history=monthsEnding(month).map(key=>{const m=model(scope,reviews,items,key);return `<tr><th scope="row">${esc(monthLabel(key))}</th>${m.rows.map(r=>`<td>${metric(r.count)} / ${metric(r.target)}${r.pct!=null?`<small>%${r.pct}</small>`:''}</td>`).join('')}</tr>`;}).join('');
    const performance=data.rows.map(r=>{const answered=r.all.filter(v=>v.isReplied).length,rate=r.known&&r.all.length?Math.round(answered/r.all.length*100):null;return `<tr><th scope="row">${esc(r.branch.name.replace('OTOTR Oto Ekspertiz ',''))}</th><td>${metric(r.branch.googleRating)} / 5</td><td>${metric(r.branch.googleReviewCount)}</td><td>${r.known?r.all.filter(v=>!v.isReplied).length:'—'}</td><td>${rate==null?'—':`%${rate}`}</td></tr>`;}).join('');
    return `<section class="google-dashboard">${head}<section class="google-premium-card google-goal-hero"><div class="google-goal-ring" style="--goal-progress:${Math.min(100,pct||0)}%"><span>${pct==null?'—':`%${pct}`}</span></div><div><h2>Bu ayın hedefi</h2><p>${data.elapsed}/${data.days} gün · ${pct==null?'Hedefleri girerek ilerlemeyi izleyin.':`${metric(data.total)} / ${metric(data.target)} yorum`}</p><button type="button" class="google-action-btn" data-google-view="targets">Hedefleri düzenle</button></div></section><div class="google-dashboard-kpis">${cards.map(([label,value])=>`<article><span>${label}</span><strong>${metric(value)}</strong></article>`).join('')}</div>${!data.complete?'<p class="google-api-note">Alınan yorumlar üzerinden gösterilir. Eksik veya güncellenemeyen şubeler bulunduğunda tahmin üretilmez.</p>':''}<section class="google-premium-card"><h3>Kümülatif ilerleme</h3>${chart(data)}</section><section class="google-premium-card"><h3>Şubelere göre hedef durumu</h3><div class="google-goal-branches">${progress}</div></section><section class="google-premium-card"><h3>Şube performansı</h3><div class="google-table-scroll"><table><thead><tr><th>Şube</th><th>Puan</th><th>Toplam</th><th>Cevap bekleyen</th><th>Yanıt bulunan</th></tr></thead><tbody>${performance}</tbody></table></div><p class="google-dashboard-note">Yanıt oranı alınan yorumlardaki mevcut işletme yanıtlarına dayanır; moderasyon onayı anlamına gelmez.</p></section><section class="google-premium-card"><h3>Son 6 ay · gerçekleşen / hedef</h3><div class="google-table-scroll"><table><thead><tr><th>Ay</th>${scope.map(b=>`<th>${esc(b.name.replace('OTOTR Oto Ekspertiz ',''))}</th>`).join('')}</tr></thead><tbody>${history}</tbody></table></div><p class="google-dashboard-note">Geçmiş sayılar mevcut Google listesindeki yorum tarihlerinden hesaplanır. Silinmiş yorumlar dahil değildir; kaydedilmemiş hedefler “—” görünür.</p></section></section>`;
  }
  document.addEventListener('click',e=>{
    const v=e.target.closest('[data-google-view]');if(v){view=v.dataset.googleView;message='';rerender();if(!loaded&&!busy)load();return;}
    if(e.target.closest('[data-google-target-reload]')){load();return;}
    const saveButton=e.target.closest('[data-google-goal-save]');if(saveButton)save(saveButton.dataset.googleGoalSave);
  });
  document.addEventListener('input',e=>{if(e.target.dataset.googleGoalInput)drafts.set(`${e.target.dataset.googleGoalInput}:${month}`,e.target.value);});
  document.addEventListener('change',e=>{if(e.target.matches('[data-google-goal-month]')&&/^20\d{2}-(0[1-9]|1[0-2])$/.test(e.target.value)){month=e.target.value;message='';rerender();}});
  window.OTOTRGoogleDashboard={render,navigation,load,get view(){return view;},model,dayKey,monthsEnding};
  if(window.OTOTRGoogleReputation?.selectBranch)window.OTOTRGoogleReputation.selectBranch('all');else rerender();
  // Targets are requested only inside an authorized ERP session by the existing API client.
  setTimeout(()=>{if(window.OTOTRGoogleReviewAI?.googleBusinessRequest)load();},500);
})();
