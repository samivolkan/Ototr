/* Isolated training scenarios. This module has no network or production-write API. */
(function (root) {
  'use strict';
  const labels = {queued:'Otomatik yanıt bekliyor',approval:'İnsan onayı bekliyor',legal:'Hukuk incelemesi',sent:'Simülasyonda gönderildi',failed:'Gönderim başarısız',paused:'Şube duraklatıldı',duplicate:'Mükerrer; işleme alınmadı',blocked:'İşlem engellendi',rejected:'Taslak reddedildi'};
  function classify(stars, text) {
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new Error('Yıldız 1–5 arasında tam sayı olmalı.');
    const t=String(text).toLocaleLowerCase('tr-TR');
    const legal=/avukat|dava|hukuk|mahkeme|tazminat|dolandır|kişisel veri|ayrımcılık/.test(t);
    const risk=legal || stars<=3 || /güvenlik|can güven|ücret iade|ciddi teknik|şikayet|şikâyet|kötü|bekledim/.test(t);
    return {legal,risk,automatic:stars>=4&&!risk};
  }
  function create(input={}, now=Date.now()) {
    const decision=classify(input.stars??5,input.text||'Hizmetten memnun kaldım.');
    return {demo:true,stars:input.stars??5,text:input.text||'Hizmetten memnun kaldım.',...decision,
      status:input.duplicate?'duplicate':input.paused?'paused':decision.legal?'legal':decision.automatic?'queued':'approval',
      hold:decision.legal,approved:false,version:1,createdAt:now,replyAt:null,slaHours:24,
      draft:'ÖRNEK YANIT — Geri bildiriminiz için teşekkür ederiz.',history:[{at:now,event:'Örnek yorum alındı'}]};
  }
  function step(current, action, options={}) {
    if(current.demo!==true)throw new Error('Yalnız test verisi işlenebilir.');
    if(options.version!==undefined && options.version!==current.version)throw new Error('Kayıt sürümü değişti.');
    const s=structuredClone(current), now=options.now??Date.now();
    const allowed=()=>{if(['duplicate','paused'].includes(s.status))throw new Error('Bu örnek işlem dışı.');};
    if(action==='edit'||action==='alternative'){
      allowed(); const text=action==='alternative'?'ÖRNEK ALTERNATİF — Deneyiminizi paylaştığınız için teşekkür ederiz.':String(options.text||'').trim();
      if(!text||text.length>2000)throw new Error('Yanıt 1–2000 karakter olmalı.');
      s.draft=text;s.approved=false;s.automatic=false;s.status=s.hold?'legal':'approval';
    } else if(action==='release') {
      if(options.role!=='legal')throw new Error('Hukuk yetkisi gerekli.');
      s.hold=false;s.status='approval';s.approved=false;
    } else if(action==='approve') {
      allowed();if(s.hold)throw new Error('Hukuki bekletme kaldırılmalı.');
      if(options.role!=='admin')throw new Error('Onay yetkisi gerekli.');
      s.approved=true;s.status='approval';
    } else if(action==='reject') {
      allowed();if(options.role!=='admin'||!String(options.reason||'').trim())throw new Error('Yetki ve red gerekçesi gerekli.');
      s.status='rejected';s.approved=false;s.automatic=false;
    } else if(action==='send') {
      allowed();if(s.status==='sent')return s;
      if(s.hold||(!s.automatic&&!s.approved)||s.status==='rejected')throw new Error('Yayın koşulları karşılanmadı; insan onayı gerekli.');
      s.status=options.failure?'failed':'sent';if(!options.failure)s.replyAt=now;
    } else throw new Error('Geçersiz işlem.');
    s.version++;s.history.push({at:now,event:action==='send'?(options.failure?'Örnek gönderim başarısız':'Örnek gönderim doğrulandı'):action});return s;
  }
  function collection(input) {
    if(!input.completed)return 'service_incomplete';
    if(!input.consent||input.optOut)return 'permission_missing';
    if(input.duplicate)return 'duplicate';
    if(input.cooldown)return 'cooldown';
    if(!input.provider)return 'provider_missing';
    return 'demo_queued';
  }
  function progress(actual,target){if(!Number.isInteger(target)||target<1||target>10000)throw new Error('Hedef 1–10000 arası tam sayı olmalı.');return Math.round(1000*actual/target)/10;}
  function overdue(s,now=Date.now()){return !s.replyAt&&now-s.createdAt>s.slaHours*3600000;}
  const scenarios=[
    ['five','5 yıldız · risksiz otomatik',()=>step(create({stars:5}),'send').status==='sent'],
    ['four','4 yıldız · risksiz otomatik',()=>step(create({stars:4}),'send').status==='sent'],
    ['three','3 yıldız · insan onayı',()=>create({stars:3}).status==='approval'],
    ['low','1–2 yıldız · onay zorunlu',()=>[1,2].every(stars=>create({stars}).status==='approval')],
    ['risk','5 yıldız · riskli içerik',()=>create({stars:5,text:'Can güvenliği konusunda şikayetim var.'}).status==='approval'],
    ['legal','Hukuki ifade · yayın kilidi',()=>create({stars:5,text:'Avukat inceleyecek.'}).hold],
    ['hold','Hukuk kilidiyle yayın engeli',()=>blocked(()=>step(create({text:'Dava açacağım.'}),'send'))],
    ['approval','Onay → örnek gönderim',()=>step(step(create({stars:2}),'approve',{role:'admin'}),'send').status==='sent'],
    ['reject','Red → yayın engeli',()=>blocked(()=>step(step(create({stars:3}),'reject',{role:'admin',reason:'Revizyon'}),'send'))],
    ['edit','Yayınlanmış yanıtı düzeltme → yeni onay',()=>step(step(create(),'send'),'edit',{text:'Düzeltilmiş örnek yanıt'}).status==='approval'],
    ['alternate','Alternatif taslak → yeni onay',()=>step(create(),'alternative').automatic===false],
    ['retry','Gönderim hatası → kontrollü tekrar',()=>step(step(create(),'send',{failure:true}),'send').status==='sent'],
    ['dedupe','Mükerrer yorum → engelle',()=>blocked(()=>step(create({duplicate:true}),'send'))],
    ['pause','Duraklatılan şube → engelle',()=>blocked(()=>step(create({paused:true}),'send'))],
    ['version','Eski sürümle kayıt → çakışma',()=>blocked(()=>step(create(),'approve',{role:'admin',version:99}))],
    ['role','Yetkisiz onay → engelle',()=>blocked(()=>step(create({stars:2}),'approve',{role:'viewer'}))],
    ['sla','SLA aşımı → gecikme',()=>overdue(create({},1),25*3600000)],
    ['goal','Hedef gerçekleşmesi · 25 / 205',()=>progress(25,205)===12.2],
    ['consent','İletişim izni yok → mesaj yok',()=>collection({completed:true,consent:false,provider:true})==='permission_missing'],
    ['cooldown','Tekrar gönderim aralığı',()=>collection({completed:true,consent:true,cooldown:true,provider:true})==='cooldown'],
    ['provider','Mesaj sağlayıcısı yok → gönderim yok',()=>collection({completed:true,consent:true})==='provider_missing'],
    ['all','Memnuniyet ayrımı olmadan yorum isteği',()=>[1,2,3,4,5].every(stars=>collection({completed:true,consent:true,provider:true,stars})==='demo_queued')]
  ];
  function blocked(fn){try{fn();return false;}catch(_){return true;}}
  function runAll(){return scenarios.map(([id,title,run])=>{try{return{id,title,passed:run()===true};}catch(e){return{id,title,passed:false,error:e.message};}});}
  const exports={classify,create,step,collection,progress,overdue,runAll};
  if(typeof module==='object'&&module.exports)module.exports=exports;
  if(!root?.document)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sessions=new Map();
  root.OTOTRReviewSandbox={...exports,mount(host,branch){
    if(!branch?.onboarding?.test){host.textContent='Test alanı yalnız örnek şubede açılır.';return;}
    let s=sessions.get(branch.id)||create(),results=[],error='';
    function render(){
      sessions.set(branch.id,s);
      host.innerHTML='<div class="card workspace-sandbox"><div class="head"><div><h3>Senaryo laboratuvarı</h3><p>Yerel simülasyon · Google ve müşteriye gönderim yapmaz.</p></div><span class="chip warn">TEST</span></div><p class="v2-chart-note">Örnek yanıtlar OpenAI çıktısı değildir. Buradaki denemeler canlı raporlara veya onay kuyruğuna yazılmaz; sayfa yenilendiğinde sıfırlanır.</p><div class="workspace-form-grid"><label>Örnek puan<select id="sandboxStars">'+[5,4,3,2,1].map(n=>'<option '+(s.stars===n?'selected':'')+'>'+n+'</option>').join('')+'</select></label><label>Yorum metni<textarea id="sandboxText" maxlength="2000">'+esc(s.text)+'</textarea></label><label>Test rolü<select id="sandboxRole"><option value="admin">Yönetici</option><option value="legal">Hukuk</option><option value="viewer">Görüntüleyici</option></select></label></div><div class="workspace-actions"><button class="btn" data-sim="create">Örnek yorumu oluştur</button><button class="btn p" data-sim="all">22 senaryoyu çalıştır</button></div><hr><strong role="status">'+esc(labels[s.status])+(s.approved?' · Onaylı':'')+'</strong><label class="workspace-sandbox-draft">Örnek yanıt<textarea id="sandboxDraft" maxlength="2000" rows="3">'+esc(s.draft)+'</textarea></label><div class="workspace-actions"><button class="btn" data-sim="edit">Örnek taslağı kaydet</button><button class="btn" data-sim="alternative">Örnek alternatif</button><button class="btn" data-sim="approve">Onayla</button><button class="btn" data-sim="release">Hukuk kilidini kaldır</button><button class="btn" data-sim="send">Gönderimi dene</button><button class="btn" data-sim="failure">Gönderim hatasını dene</button></div>'+(error?'<p class="workspace-error" role="alert">'+esc(error)+'</p>':'')+'<details><summary>Deneme işlem geçmişi · '+s.history.length+'</summary><ol>'+s.history.map(h=>'<li>'+esc(new Date(h.at).toLocaleTimeString('tr-TR'))+' · '+esc(h.event)+'</li>').join('')+'</ol></details><div id="sandboxResults">'+(results.length?'<h4>'+results.filter(r=>r.passed).length+' / '+results.length+' senaryo başarılı</h4><div class="workspace-scenario-grid">'+results.map(r=>'<div><span class="chip '+(r.passed?'ok':'err')+'">'+(r.passed?'✓':'!')+'</span> '+esc(r.title)+'</div>').join('')+'</div>':'')+'</div></div>';
    }
    host.onclick=e=>{const b=e.target.closest('[data-sim]');if(!b)return;error='';const action=b.dataset.sim;
      try{if(action==='all')results=runAll();else if(action==='create')s=create({stars:Number(host.querySelector('#sandboxStars').value),text:host.querySelector('#sandboxText').value});else s=step(s,action==='failure'?'send':action,{failure:action==='failure',text:host.querySelector('#sandboxDraft').value,role:host.querySelector('#sandboxRole').value});}catch(e){error=e.message;}
      render();
    };render();
  }};
})(typeof window==='undefined'?null:window);
