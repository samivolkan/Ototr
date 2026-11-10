(function(){
  'use strict';

  const dashboards = [
    ['ceo','CEO Kokpiti','Genel merkez','Ciro, büyüme, risk ve icra özeti','layout-dashboard'],
    ['region','Bölge Müdürü','Bölge','Şube karşılaştırması, hedef ve alarm takibi','map'],
    ['branch','Şube Karnesi','Şube','Operasyon, kalite, satış ve memnuniyet skoru','building-2'],
    ['finance','Finans & Royalty','Genel merkez','Tahsilat, royalty, marj ve vade riski','banknote'],
    ['reviews','Google Yorum Trendi','Şube / Bölge','Puan, hacim, yanıt SLA ve konu eğilimi','star'],
    ['franchise','Franchise Satış Hunisi','Genel merkez','Başvurudan açılışa dönüşüm ve kayıp nedenleri','funnel'],
    ['hr','İK & Academy Uyumu','Şube / Bölge','Kadro, onboarding, eğitim ve sertifika uyumu','graduation-cap'],
    ['quality','Kalite & CAPA','Şube / Bölge','Denetim bulguları, kök neden ve kapanış SLA','shield-check'],
    ['legal','Hukuki Risk Haritası','Genel merkez','Dosya, ihtar, sözleşme ve parasal risk dağılımı','scale']
  ];

  const esc = value => String(value == null ? '' : value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const state = {active:null, busy:false};

  function page(){
    return `<section class="looker-hub" data-looker-hub>
      <header class="looker-hero">
        <div><span>OTOTR · EMBEDDED ANALYTICS</span><h2>Looker Canlı Yönetim Panoları</h2><p>Mevcut ERP kokpiti korunur; ağır analizler yetki kapsamıyla Looker üzerinden açılır.</p></div>
        <div class="looker-security"><b>Sunucu kontrollü erişim</b><small>İmzalı URL · tek kullanımlık · şube/bölge veri sınırı</small></div>
      </header>
      <div class="looker-scope-note" role="note"><b>Etkin veri kapsamı ERP oturumundan belirlenir.</b><span>Tarayıcıdan gönderilen şube, bölge veya rol değeri yetki kaynağı olarak kullanılmaz.</span></div>
      <div class="looker-grid">${dashboards.map(card).join('')}</div>
      <section class="looker-viewer" data-looker-viewer hidden>
        <header><div><span data-looker-scope></span><h3 data-looker-title></h3></div><div><button class="btn" type="button" data-looker-reload>Yenile</button><button class="btn" type="button" data-looker-close>Kapat</button></div></header>
        <div class="looker-status" data-looker-status role="status"></div>
        <iframe data-looker-frame title="Looker yönetim panosu" referrerpolicy="strict-origin-when-cross-origin" allow="fullscreen" hidden></iframe>
      </section>
    </section>`;
  }

  function card(item){
    const [id,title,scope,description,icon] = item;
    return `<button class="looker-card" type="button" data-looker-dashboard="${esc(id)}"><span class="looker-card-icon" data-lucide="${esc(icon)}"></span><small>${esc(scope)}</small><b>${esc(title)}</b><p>${esc(description)}</p><em>Panoyu aç →</em></button>`;
  }

  async function openDashboard(id){
    if(state.busy) return;
    const item=dashboards.find(row=>row[0]===id);
    if(!item) return;
    state.active=id; state.busy=true;
    const viewer=document.querySelector('[data-looker-viewer]');
    const frame=viewer?.querySelector('[data-looker-frame]');
    const status=viewer?.querySelector('[data-looker-status]');
    if(!viewer||!frame||!status){ state.busy=false; return; }
    viewer.hidden=false; frame.hidden=true; frame.removeAttribute('src');
    viewer.querySelector('[data-looker-title]').textContent=item[1];
    viewer.querySelector('[data-looker-scope]').textContent=item[2]+' veri kapsamı';
    status.className='looker-status loading';
    status.textContent='Güvenli Looker oturumu hazırlanıyor…';
    viewer.scrollIntoView({behavior:'smooth',block:'start'});
    try{
      const response=await fetch('/api/looker/embed-url',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({dashboard:id})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(payload.message||'Looker oturumu oluşturulamadı.');
      const secureUrl=/^https:\/\//i.test(payload.url||'');
      const localTestUrl=/^http:\/\/127\.0\.0\.1(?::\d+)?\//i.test(payload.url||'');
      if(!secureUrl&&!localTestUrl) throw new Error('Sunucu geçerli bir HTTPS Looker URL’si döndürmedi.');
      frame.src=payload.url;
      frame.hidden=false;
      status.className='looker-status ready';
      status.textContent=`${payload.scopeLabel||item[2]} · Oturum hazır`;
    }catch(error){
      status.className='looker-status error';
      status.innerHTML=`<b>Looker bağlantısı henüz yapılandırılmadı.</b><span>${esc(error.message)}</span><small>Looker alan adı, Embed lisansı, dashboard kimliği ve sunucu kimlik bilgileri tamamlandığında pano burada açılacak.</small>`;
    }finally{ state.busy=false; }
  }

  document.addEventListener('click',event=>{
    const trigger=event.target.closest('[data-looker-dashboard]');
    if(trigger){ event.preventDefault(); openDashboard(trigger.dataset.lookerDashboard); return; }
    if(event.target.closest('[data-looker-reload]')&&state.active){ event.preventDefault(); openDashboard(state.active); return; }
    if(event.target.closest('[data-looker-close]')){
      event.preventDefault(); const viewer=document.querySelector('[data-looker-viewer]'); const frame=viewer?.querySelector('[data-looker-frame]');
      if(frame){ frame.removeAttribute('src'); frame.hidden=true; } if(viewer) viewer.hidden=true; state.active=null;
    }
  });

  window.OTOTRLooker={page,openDashboard,dashboards:dashboards.map(row=>({id:row[0],title:row[1],scope:row[2]}))};
})();
