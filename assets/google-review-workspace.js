/* Single review workspace. All writes use the existing authenticated ERP API. */
(function (root) {
  'use strict';
  const NILUFER = 'branch-google-nilufer';
  const LEGACY_DEMOS = new Set(['branch-google-gebze', 'branch-google-inegol']);
  const SAMPLE_ID = 'branch-custom-onboarding-example-20261119';
  function operationalBranches(items) {
    return items.filter(b => b.active !== false && !b.onboarding?.test &&
      (b.id === NILUFER || (!LEGACY_DEMOS.has(b.id) && ['live','active'].includes(b.lifecycle) && Boolean(b.google_verified_at))));
  }
  function mapUrl(map, embed = true) {
    if (!map || map.lat == null || map.lng == null || map.lat === '' || map.lng === '') return null;
    const lat = Number(map.lat), lng = Number(map.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    const params = new URLSearchParams({ q: lat + ',' + lng, z: '14' });
    if (embed) params.set('output', 'embed');
    return 'https://maps.google.com/maps?' + params;
  }
  const GROUPS = [
    { id:'overview', label:'Genel Bakış', views:['overview'] },
    { id:'reviews', label:'Yorumlar', views:['reviews'] },
    { id:'tasks', label:'İş Takibi', views:['problems','approval','complaint','legal','risk'] },
    { id:'performance', label:'Performans', views:['performance','compare'] },
    { id:'branches', label:'Şubeler', views:['branches','store'] },
    { id:'settings', label:'Ayarlar', views:['ai','settings','system','golive'] }
  ];
  if (typeof module === 'object' && module.exports) module.exports = {operationalBranches,mapUrl,GROUPS};
  if (!root?.document) return;
  const doc = root.document, byId = id => doc.getElementById(id);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const api = () => root.OTOTRReviewManagement;
  const live = () => root.OTOTRReviewLiveViews;
  const registry = () => live()?.getBranchRegistry?.() || [];
  const baseline = {id:NILUFER,name:'Bursa Nilüfer',city:'Bursa',region:'Marmara',lifecycle:'live',active:true};
  const name = b => b.id === NILUFER ? 'Bursa Nilüfer' : (b.name.startsWith(b.city + ' ') ? b.name : b.city + ' ' + b.name);
  let selected = NILUFER, busy = false, loadError = '', setupError = '', formOpen = false;
  const checks = new Map();
  const niluferMap = {lat:40.204965,lng:28.9461524,address:'OTOTR Oto Ekspertiz Bursa Nilüfer · Google Haritalar konumu'};
  const sample = {id:SAMPLE_ID,name:'Örnek Kurulum Şubesi',city:'Bursa',region:'Marmara',target:30,sla_hours:24,interval_minutes:60,test_mode:true,map:{lat:40.19,lng:29.06,address:'Örnek konum · Bursa merkez. Gerçek bir işletme değildir.'}};
  const allowed = id => id === 'branches' ? ROLES[STATE.role].tabs.includes('settings') : ROLES[STATE.role].tabs.includes(id);
  const currentGroup = () => GROUPS.find(g => g.views.includes(STATE.view)) || GROUPS[0];
  const nav = doc.createElement('nav'); nav.className = 'workspace-subnav'; nav.setAttribute('aria-label','Bölüm menüsü');
  doc.querySelector('.ph')?.before(nav);
  const section = doc.createElement('section'); section.className = 'view'; section.id = 'view-branches';
  doc.querySelector('main')?.append(section);
  const titles = {problems:'Problemler',approval:'Onaylar',complaint:'Şikâyetler',legal:'Hukuk',risk:'Risk ve SLA',performance:'Hedefler',compare:'Karşılaştırma',ai:'Yapay zekâ',settings:'Kurallar ve bağlantılar',system:'Sistem ve denetim',golive:'Devreye alma'};
  root.renderNav = function () {
    const group = currentGroup();
    byId('topnav').innerHTML = GROUPS.filter(g=>g.views.some(allowed)).map(g=>'<button type="button" data-workspace-group="'+g.id+'" class="'+(group.id===g.id?'on':'')+'" '+(group.id===g.id?'aria-current="page"':'')+'>'+g.label+'</button>').join('');
    byId('mobNav').innerHTML = '';
    nav.innerHTML = group.views.filter(id=>allowed(id)&&id!=='store').map(id=>'<button type="button" data-workspace-view="'+id+'" class="'+(id===STATE.view?'on':'')+'" '+(id===STATE.view?'aria-current="page"':'')+'>'+escape(titles[id]||group.label)+'</button>').join('');
    nav.hidden = nav.children.length < 2;
  };
  const previousSwitch = root.switchView;
  root.switchView = function (id) {
    if (formOpen && id !== 'branches') {
      root.toast('Önce şube formunu kaydedin veya iptal edin.', 'warn'); return;
    }
    if (id === 'branches') {
      if (!allowed(id)) return root.toast('Şube yönetimi için yönetici yetkisi gerekli.', 'warn');
      STATE.view = id; STATE.currentStore = null;
      doc.querySelectorAll('.view').forEach(n => n.classList.toggle('on',n===section));
      byId('pageTitle').textContent = 'Şubeler';
      byId('pageSub').textContent = 'Canlı şubeyi izleyin; yeni şubeyi adım adım hazırlayın.';
      byId('crumb').textContent = 'Yorum Yönetimi / Şubeler';
      root.renderNav(); renderBranches(); if (!busy) loadBranches();
    } else {
      previousSwitch.call(this,id);
      root.renderNav();
      if (id === 'settings') {
        const tab=doc.querySelector('#settingsTabs [data-t="integrations"]');
        if (doc.querySelector('#settingsTabs [data-t="stores"].on')) tab?.click();
      }
    }
    normalize();
  };
  function normalize() {
    const active = operationalBranches(registry());
    const options = active.length ? active : [baseline];
    const select=byId('erpGlobalScope');
    if (select) {
      const value=live()?.getBranchId?.() || NILUFER;
      const signature=options.map(b=>b.id+name(b)).join('|');
      if (select.dataset.workspaceOptions!==signature || select.options.length!==options.length) {
        select.innerHTML=options.map(b=>'<option value="'+escape(b.id===NILUFER?'live':b.id)+'">'+escape(name(b))+'</option>').join('');
        select.dataset.workspaceOptions=signature;
      }
      select.value=value===NILUFER?'live':value;
      if (!options.some(b=>b.id===value) && !root.OTOTRReviewBridge?.isEditing?.()) live()?.setScope?.('live');
    }
    const badge=doc.querySelector('.v2-scope > .chip, .v2-review-status > .chip'); if(badge && STATE.view !== 'performance') badge.textContent=options.length+' canlı şube';
    const isBranch=STATE.view==='branches';
    const analyticsView=['overview','performance','compare','store'].includes(STATE.view);
    if(byId('crumb')) byId('crumb').hidden=true;
    if(byId('pageSub')) byId('pageSub').hidden=true;
    const period=byId('v2Period')?.parentElement; if(period) period.hidden=!analyticsView;
    if(byId('v2PeriodNote')) byId('v2PeriodNote').hidden=!analyticsView || STATE.view==='overview';
    doc.querySelectorAll('#settingsTabs [data-t="stores"]').forEach(n=>n.hidden=true);
    doc.querySelectorAll('.review-page-switch').forEach(n=>n.remove());
    doc.querySelectorAll('button[onclick="openSimReview()"]').forEach(n=>n.hidden=true);
  }
  doc.addEventListener('click', event => {
    const group=event.target.closest('[data-workspace-group]');
    const view=event.target.closest('[data-workspace-view]');
    if(group){const g=GROUPS.find(g=>g.id===group.dataset.workspaceGroup);root.switchView(g.views.find(allowed));root.closeReviewMenu?.();}
    if(view) root.switchView(view.dataset.workspaceView);
  });
  function visibleBranches() {
    const items=registry().filter(b=>!LEGACY_DEMOS.has(b.id) && b.active!==false && b.lifecycle!=='archived');
    const cached=typeof BRANCHES!=='undefined'?BRANCHES.find(b=>(b.erpBranchId||b.id)===NILUFER):null;
    return items.some(b=>b.id===NILUFER)?items:[{...cached,...baseline},...items];
  }
  function badge(b) { return b.onboarding?.test?'Test · gönderim kapalı':operationalBranches([b]).length?'Canlı':'Kurulum bekliyor'; }
  function date(value) { if(!value)return 'Henüz senkronize edilmedi';const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString('tr-TR'):String(value); }
  function mapPanel(b) {
    const map=b.onboarding?.map || (b.id===NILUFER?niluferMap:null), url=mapUrl(map);
    return '<div class="workspace-map"><div class="head"><div><h3>Şube konumu</h3><p>'+escape(map?.address||'Kurulum formundan enlem ve boylam ekleyin.')+'</p></div>'+(url?'<a class="btn sm" target="_blank" rel="noopener noreferrer" href="'+escape(mapUrl(map,false))+'">Haritada aç ↗</a>':'')+'</div>'+(url?'<iframe title="'+escape(name(b))+' konum haritası" src="'+escape(url)+'" loading="lazy" referrerpolicy="no-referrer" allowfullscreen></iframe>':'<div class="empty">Henüz konum eklenmedi.</div>')+'</div>';
  }
  function collectionTools() {
    return '<div class="card workspace-collection"><h3>Yorum toplama araçları</h3>' +
      '<div class="watch-row"><div class="info"><b>QR kod</b><small>Ekspertiz teslimatında müşteriye gösterilir.</small></div><button class="btn" data-branch-action="qr-open">Oluştur</button></div>' +
      '<div class="watch-row"><div class="info"><b>WhatsApp / SMS isteği</b><small>Rapor tesliminden sonra önerilen bekleme 2 saat.</small></div><button class="btn" data-branch-action="collection">Etkinleştir</button></div>' +
      '<form id="workspaceQrForm" hidden><label>Google yorum bağlantısı<input id="workspaceReviewLink" type="url" required placeholder="https://g.page/r/…/review"></label>' +
      '<button class="btn" type="submit">QR kodu üret</button><p id="workspaceQrError" role="alert"></p><div id="workspaceQrResult"></div></form></div>';
  }
  section.addEventListener('submit', event => {
    if (event.target.id !== 'workspaceQrForm') return;
    event.preventDefault();
    const error = byId('workspaceQrError'), result = byId('workspaceQrResult');
    result.replaceChildren();
    error.textContent = '';
    try {
      const url = new URL(byId('workspaceReviewLink').value.trim());
      const validPath = (url.hostname === 'g.page' && /^\/r\/[A-Za-z0-9_-]+\/review\/?$/.test(url.pathname)) ||
        (['search.google.com','www.google.com'].includes(url.hostname) &&
          ['/local/writereview','/maps'].some(path => url.pathname === path) && url.searchParams.has('placeid'));
      if (url.protocol !== 'https:' || url.username || url.password || !validPath || url.href.length > 600) {
        throw new Error('Google İşletme Profili’ndeki “Yorum iste” bağlantısını girin.');
      }
      const qr = root.qrcode(0, 'M');
      qr.addData(url.href);
      qr.make();
      const image = doc.createElement('img');
      image.src = qr.createDataURL(5);
      image.alt = 'Google yorum bağlantısının QR kodu';
      const download = doc.createElement('a');
      download.className = 'btn';
      download.download = 'ototr-yorum-qr.gif';
      download.href = image.src;
      download.textContent = 'QR kodu indir';
      result.append(image, download);
    } catch (e) { error.textContent = e.message || 'QR kodu oluşturulamadı.'; }
  });
  function heatmapCard() {
    const rows = root.OTOTRReviewAlternative?.branchHeatmap?.() || [];
    const cell = (value,warn,good,format) => value == null ? '<td>—</td>' :
      '<td><span class="workspace-heat '+(value>=good?'ok':value>=warn?'warn':'bad')+'">'+escape(format(value))+'</span></td>';
    const pct = number => '%'+Math.round(number);
    return '<div class="card workspace-heat-card"><h3>Şube ısı haritası</h3><p>Toplam yorumlar · Canlı ve demo ayrı etiketlenir.</p><div class="workspace-heat-scroll"><table><thead><tr><th>Şube</th><th>Yorum</th><th>Puan</th><th>Yanıt</th><th>SLA</th><th>Hedef</th></tr></thead><tbody>'+
      rows.map(row=>'<tr><th scope="row"><button type="button" class="btn sm ghost" '+(row.demo?'data-demo-branch':'data-select-branch')+'="'+escape(row.id)+'">'+escape(row.name)+'</button> <span class="chip '+(row.demo?'purple':'ok')+'">'+(row.demo?'Demo':'Canlı')+'</span></th><td>'+(row.count??'—')+'</td>'+
        cell(row.average,4,4.5,n=>n.toLocaleString('tr-TR',{minimumFractionDigits:1,maximumFractionDigits:1}))+cell(row.response,80,95,pct)+cell(row.sla,70,90,pct)+cell(row.progress,60,100,pct)+'</tr>').join('')+
      '</tbody></table></div><p>Renkler: yeşil hedefte, turuncu dikkat, kırmızı iyileştirme gerekli. Ölçülemeyen değerler —.</p></div>';
  }
  function renderBranches() {
    if(formOpen) return;
    const items=visibleBranches(), b=items.find(b=>b.id===selected)||items[0]; selected=b.id;
    const c=checks.get(b.id), liveBranch=operationalBranches([b]).length>0;
    const ck=c?.checklist || {};
    const checklist=[['Şube kimliği',true],['Harita konumu',Boolean(mapUrl(b.onboarding?.map||(b.id===NILUFER?niluferMap:null)))],['Aylık hedef',ck.target],['SLA ve kontrol sıklığı',ck.sla],['AI davranış ayarı',ck.ai],['Yorum toplama ayarı',ck.collection],['Google hesap ve konum',ck.google_account&&ck.store_code&&ck.location_id],['Google doğrulaması',ck.google_verified],['Canlı kapsam',liveBranch]];
    const state=api().state;
    const rows=root.OTOTRReviewAlternative?.scopedRows?.()||[];
    const metrics=b.id===live()?.getBranchId?.()?live()?.aggregateReviews?.(rows,{slaHours:state.policy?.default_sla_hours||24}):null;
    section.innerHTML='<div class="workspace-branch-head"><div><h2>Şube ağı</h2><p>Genel Merkez → Bölge → İl → Şube</p><p>'+operationalBranches(items).length+' canlı · '+items.filter(x=>!operationalBranches([x]).length).length+' kurulum / test</p></div><div><button class="btn" data-branch-action="sample" '+(busy?'disabled':'')+'>Örnek şubeyi dene</button> <button class="btn p" data-branch-action="new" '+(busy?'disabled':'')+'>＋ Şube ekle</button></div></div>'+
      (loadError?'<div class="alert warn" role="alert">'+escape(loadError)+' <button class="btn sm" data-branch-action="reload">Tekrar dene</button></div>':'')+
      '<div class="workspace-branches"><aside class="workspace-branch-list" aria-label="Şube listesi">'+items.map(x=>'<button class="workspace-branch '+(x.id===selected?'selected':'')+'" data-select-branch="'+escape(x.id)+'" aria-pressed="'+(x.id===selected)+'"><strong>'+escape(name(x))+'</strong><span>'+escape(x.region)+' · '+escape(x.city)+'</span><em>'+badge(x)+'</em></button>').join('')+'</aside><div class="workspace-branch-detail"><div class="card"><div class="head"><div><h2>'+escape(name(b))+'</h2><p>'+escape(b.region)+' / '+escape(b.city)+'</p></div><span class="chip '+(liveBranch?'ok':'warn')+'">'+badge(b)+'</span></div>'+
      (b.onboarding?.test?'<div class="alert info">Örnek şube gerçek bir işletme değildir. Canlı raporlara katılmaz; Google yanıtı ve müşteri mesajı gönderemez.</div>':'')+
      '<div class="workspace-metrics"><div><small>Ortalama puan</small><strong>'+(metrics?.average?.toFixed(1)??'—')+'</strong></div><div><small>Yanıt oranı</small><strong>'+(metrics?.responseRate==null?'—':Math.round(metrics.responseRate)+'%')+'</strong></div><div><small>SLA gerçekleşme</small><strong>'+(metrics?.slaRate==null?'—':Math.round(metrics.slaRate)+'%')+'</strong></div><div><small>Son veri</small><strong>'+escape(date(b.last_sync_at||b.lastSync))+'</strong></div><div><small>Alınan yorum</small><strong>'+(metrics?metrics.count:'—')+'</strong></div><div><small>SLA hedefi</small><strong>'+escape(b.id===NILUFER?state.policy?.default_sla_hours||'—':b.sla_hours||24)+' saat</strong></div><div><small>Kontrol sıklığı</small><strong>'+escape(b.interval_minutes||60)+' dk</strong></div></div>'+
      '<div class="workspace-checks">'+checklist.map(([label,ok])=>{
        const testClosed=b.onboarding?.test&&(label.startsWith('Google')||label==='Canlı kapsam');
        const status=testClosed?'Testte kapalı':label==='AI davranış ayarı'&&ok&&c?.sources?.ai==='erp'?'ERP varsayılanı':label==='Yorum toplama ayarı'&&c?.collection?.enabled===false?'Kapalı · gönderim yok':ok?'Hazır':loadError||setupError?'Doğrulanamadı':c?'Eksik':busy?'Kontrol ediliyor':'Kontrol bekliyor';
        return '<div><span class="'+(ok&&!testClosed?'done':'pending')+'">'+(testClosed?'—':ok?'✓':'○')+'</span><span>'+label+'</span><small>'+status+'</small></div>';
      }).join('')+'</div>'+
      (setupError?'<p role="alert" class="workspace-error">'+escape(setupError)+'</p>':'')+
      '<div class="workspace-actions">'+(liveBranch?'<button class="btn" data-branch-action="reviews">Yorumları izle</button><button class="btn" data-branch-action="performance">Hedef ve performans</button>':'<button class="btn" data-branch-action="edit" '+(busy?'disabled':'')+'>Kurulumu düzenle</button><button class="btn p" data-branch-action="activate" '+(busy||b.onboarding?.test||!b.account_id||!b.store_code||!b.location_id?'disabled':'')+'>Google’da doğrula ve canlıya al</button>')+
      '<button class="btn" data-branch-action="check" '+(busy?'disabled':'')+'>Kurulumu kontrol et</button></div><p class="v2-chart-note">AI ve bağlantılar mevcut ERP ayarlarından kullanılır. Yeni şubede müşteri mesajı gönderimi başlangıçta kapalıdır.</p></div>'+
      (!liveBranch&&c?'<div class="card"><h3>Şubenin çalışma hedefleri</h3><p class="v2-chart-note">Bu şubeye özel sunucu kaydı · '+escape(c.target_month?.slice(0,7)||'')+'</p><div class="workspace-form-grid"><label>Toplam yorum hedefi<input id="setupTarget" type="number" min="1" max="10000" step="1" value="'+escape(c.target?.target||b.target||30)+'"><span>Yıldız hedefi</span><input id="setupRatingTarget" type="number" min="1" max="5" step="0.1" value="'+escape(c.target?.rating_target??'')+'"><button class="btn" data-branch-action="save-target" '+(busy?'disabled':'')+'>Hedefi kaydet</button></label><label>Yanıt SLA (saat)<input id="setupSla" type="number" min="1" max="168" step="1" value="'+escape(b.sla_hours||24)+'"><button class="btn" data-branch-action="save-sla" '+(busy?'disabled':'')+'>SLA kaydet</button></label></div><p class="v2-chart-note">Kaydettiğiniz değerler yalnız bu şubeye uygulanır. Canlı Bursa hedefi ve SLA’sı değişmez.</p></div>':'')+
      (liveBranch?collectionTools():'')+(b.onboarding?.test?'<div id="workspaceSandbox"></div>':'')+mapPanel(b)+'</div></div>';
    section.querySelector('.workspace-branches')?.insertAdjacentHTML('beforebegin',heatmapCard());
    if(b.onboarding?.test)root.OTOTRReviewSandbox?.mount(byId('workspaceSandbox'),b);
  }
  async function loadBranches() {
    if(busy)return;
    busy=true;loadError='';setupError='';
    try {
      const result=await api().request('branch_list');
      live().setBranchRegistry(result.items||[]);
      await loadCheck(selected);
    } catch(e){loadError=e.message||'Şube listesi alınamadı.';}
    finally{busy=false;normalize();if(STATE.view==='branches')renderBranches();}
  }
  async function loadCheck(id) {
    try { const c=await api().request('branch_onboarding',{branch_id:id}); if(c.branch_id!==id)throw new Error('Şube kontrolü farklı bir kayda döndü.');checks.set(id,c); }
    catch(e){setupError=e.message||'Kurulum kontrolü alınamadı.';}
  }
  function openForm(b, example=false) {
    formOpen=true;
    const editing=Boolean(b && !example), v=b||{name:'',city:'',region:'',target:30,sla_hours:24,interval_minutes:60};
    const test=example||b?.onboarding?.test===true, map=v.map||v.onboarding?.map||{};
    const createId=example?SAMPLE_ID:'branch-custom-'+root.crypto.randomUUID();
    const field=(key,label,value='',extra='')=>'<label for="branch-'+key+'">'+label+'<input id="branch-'+key+'" name="'+key+'" value="'+escape(value)+'" '+extra+'></label>';
    section.innerHTML='<div class="card workspace-form-card"><div class="head"><div><h2>'+(editing?'Şube kurulumunu düzenle':test?'Örnek şube oluştur':'Yeni şube')+'</h2><p>Kimlik → konum → çalışma hedefleri → Google doğrulaması</p></div><span class="chip '+(test?'warn':'info')+'">'+(test?'Test · gönderim kapalı':'Kurulum')+'</span></div><form id="workspaceBranchForm"><fieldset><legend>1 · Şube kimliği</legend><div class="workspace-form-grid">'+
      field('name','Şube adı',v.name,'required minlength="2" maxlength="160"')+field('city','İl',v.city,'required minlength="2" maxlength="80"')+field('region','Bölge',v.region,'required minlength="2" maxlength="80"')+'</div></fieldset><fieldset><legend>2 · Harita konumu</legend><div class="workspace-form-grid">'+
      field('address','Konum açıklaması',map.address,'maxlength="300"')+field('lat','Enlem',map.lat??'','type="number" step="any" min="-90" max="90"')+field('lng','Boylam',map.lng??'','type="number" step="any" min="-180" max="180"')+'</div><p>Haritadaki işletme konumunu girin. Deneme için örnek konum kullanılır.</p><button type="button" class="btn sm" data-branch-action="preview">Haritayı önizle</button><div id="branchMapPreview"></div></fieldset><fieldset><legend>3 · Çalışma hedefleri</legend><div class="workspace-form-grid">'+
      field('target','Ulaşılacak toplam yorum sayısı',v.target,'type="number" min="1" max="10000" step="1" required '+(editing?'readonly':''))+field('sla_hours','Yanıt SLA hedefi (saat)',v.sla_hours,'type="number" min="1" max="168" step="1" required '+(editing?'readonly':''))+field('interval_minutes','Yorum kontrol sıklığı (dk)',v.interval_minutes,'type="number" min="5" max="1440" step="1" required '+(editing?'readonly':''))+'</div><p>Başlangıç değerleri şube açılışında kaydedilir. Canlıya alındıktan sonra Hedefler ve Ayarlar ekranlarından yönetilir.</p></fieldset>'+
      (test?'<div class="alert info">Bu örnek şube Google hesabına bağlanamaz. Test için gerçek müşteri veya Google kimliği gerekmez.</div>':'<fieldset><legend>4 · Google eşleştirmesi</legend><p>Mevcut ERP bağlantısını kullanır. Kimlikleri daha sonra tamamlayabilirsiniz.</p><div class="workspace-form-grid">'+field('account_id','Google hesap ID',v.account_id,'inputmode="numeric" pattern="[0-9]{1,32}"')+field('store_code','Google mağaza kodu',v.store_code,'inputmode="numeric" pattern="[0-9]{1,64}"')+field('location_id','Google konum ID',v.location_id,'inputmode="numeric" pattern="[0-9]{1,32}"')+'</div></fieldset>')+
      '<p id="branchFormError" class="workspace-error" role="alert"></p><div class="workspace-actions"><button class="btn p" type="submit">Şubeyi kaydet</button><button class="btn" type="button" data-branch-action="cancel">İptal</button></div></form></div>';
    byId('workspaceBranchForm').onsubmit=async event=>{
      event.preventDefault();if(busy)return;
      const form=event.currentTarget;
      if(!form.reportValidity())return;
      const values=Object.fromEntries(new FormData(form));
      const lat=values.lat,lng=values.lng;
      const payload={...values,target:Number(values.target),sla_hours:Number(values.sla_hours),interval_minutes:Number(values.interval_minutes),map:lat===''&&lng===''?null:{lat,lng,address:values.address}};
      delete payload.lat;delete payload.lng;delete payload.address;
      if(payload.map&&!mapUrl(payload.map)){byId('branchFormError').textContent='Geçerli enlem ve boylam birlikte gerekli.';return;}
      const action=editing?'branch_update':'branch_create';
      if(editing){payload.branch_id=b.id;payload.expected_updated_at=b.updated_at;}
      else {payload.id=createId;payload.test_mode=test;}
      busy=true;form.querySelectorAll('button,input').forEach(n=>n.disabled=true);
      try {
        const result=await api().request(action,payload);
        if(!result.item?.id)throw new Error('Şube kaydı doğrulanamadı.');
        selected=result.item.id;formOpen=false;
        root.toast('Şube kaydedildi. Kurulum listesi yenileniyor.','ok');
      } catch(e){byId('branchFormError').textContent=e.message||'Kaydedilemedi.';}
      finally {busy=false;if(formOpen)form.querySelectorAll('button,input').forEach(n=>n.disabled=false);else await loadBranches();}
    };
    byId('branch-name').focus();
  }
  section.addEventListener('click',async event=>{
    const demo=event.target.closest('[data-demo-branch]');
    if(demo) return root.OTOTRReviewAlternative?.openRegionalDemo?.(demo.dataset.demoBranch);
    const select=event.target.closest('[data-select-branch]'), button=event.target.closest('[data-branch-action]');
    if(select&&!busy){selected=select.dataset.selectBranch;setupError='';renderBranches();await loadCheck(selected);renderBranches();return;}
    if(!button||busy)return;
    const action=button.dataset.branchAction, b=visibleBranches().find(b=>b.id===selected);
    if(action==='qr-open'){
      const form=byId('workspaceQrForm');
      form.hidden=false;
      byId('workspaceReviewLink')?.focus();
      return;
    }
    if(action==='collection'){
      live().setScope(b.id===NILUFER?'live':b.id);
      root.switchView('settings');
      doc.querySelector('#settingsTabs [data-t="integrations"]')?.click();
      byId('reviewCollectionCard')?.scrollIntoView({block:'start'});
      byId('collectionEnabled')?.focus({preventScroll:true});
      return;
    }
    if(action==='new')return openForm(null);
    if(action==='sample'){
      const existing=registry().find(b=>b.id===SAMPLE_ID);
      if(existing){selected=existing.id;renderBranches();await loadCheck(selected);renderBranches();return;}
      return openForm(sample,true);
    }
    if(action==='cancel'){formOpen=false;return renderBranches();}
    if(action==='edit')return openForm(b);
    if(action==='save-target'||action==='save-sla'){
      const c=checks.get(b.id), targetAction=action==='save-target', input=byId(targetAction?'setupTarget':'setupSla');
      const ratingInput=targetAction?byId('setupRatingTarget'):null;
      if(!input.reportValidity() || (ratingInput && !ratingInput.reportValidity()))return;
      const value=Number(input.value);busy=true;button.disabled=true;setupError='';
      try{
        if(targetAction){if(!c?.target_month)throw new Error('Önce kurulum kontrolünü yenileyin.');await api().setupRequest('target_save',b.id,{month:c.target_month,target:value,rating_target:ratingInput?.value?Number(ratingInput.value):null,expected_version:c.target?.version||0});}
        else await api().setupRequest('management_update',b.id,{entity:'policy',default_sla_hours:value,expected_updated_at:b.updated_at});
        root.toast(targetAction?'Şube hedefi sunucuya kaydedildi.':'Şube SLA ayarı sunucuya kaydedildi.','ok');
        busy=false;return loadBranches();
      }catch(e){setupError=e.message;root.toast(e.message,'warn');}
      finally{busy=false;button.disabled=false;}
      return;
    }
    if(action==='preview'){
      const map={lat:byId('branch-lat').value,lng:byId('branch-lng').value,address:byId('branch-address').value};
      if(!mapUrl(map)){byId('branchFormError').textContent='Harita için geçerli enlem ve boylam girin.';return;}
      byId('branchFormError').textContent='';byId('branchMapPreview').innerHTML=mapPanel({id:'preview',name:'Konum önizlemesi',city:'',onboarding:{map}});return;
    }
    if(['reviews','performance'].includes(action)){live().setScope(b.id===NILUFER?'live':b.id);return root.switchView(action);}
    if(action==='reload')return loadBranches();
    if(action==='check'){busy=true;setupError='';await loadCheck(selected);busy=false;renderBranches();return;}
    if(action==='activate'){
      if(b.onboarding?.test)return;
      busy=true;button.disabled=true;
      try{await api().request('branch_activate',{branch_id:b.id});root.toast('Google konumu doğrulandı. Şube canlı kapsama açıldı.','ok');}
      catch(e){setupError=e.message;busy=false;renderBranches();return;}
      busy=false;return loadBranches();
    }
  });
  root.openNewStore=()=>{root.switchView('branches');openForm(null);};
  root.openSimReview=()=>root.toast('Canlı çalışma alanında örnek yorum oluşturulmaz. Şubeler bölümünde kurulum denemesini kullanın.','warn');
  root.addEventListener('ototr-management-ready',()=>{normalize();if(STATE.view==='branches')renderBranches();});
  root.addEventListener('ototr-branch-registry-ready',()=>{queueMicrotask(normalize);});
  // Old saved demo scope is never restored into the operational workspace.
  if(live()?.getBranchId?.()!==NILUFER)live()?.setScope?.('live');
  root.switchView('overview');
})(typeof window==='undefined'?null:window);
