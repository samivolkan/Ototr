(function(){
  'use strict';

  const modules = Object.freeze([
    {
      id:'arge-01', order:'01', name:'OTOTR Memnuniyet Merkezi',
      description:'Müşteri memnuniyeti sinyallerini ve kontrollü takip senaryolarını owner-only sandbox içinde doğrular.',
      category:'Müşteri Deneyimi', version:'v1', environment:'Sandbox',
      security:'Owner-only · dış mesaj kapalı', tests:'Sandbox doğrulandı', updatedAt:'2026-11-13',
      url:'https://ototr-memnuniyet-merkezi.samivolkan.chatgpt.site',
      gates:['Gerçek ERP veri bağlantısı','Dış mesaj onayı','Auth/RBAC kabulü','Staging UAT']
    },
    {
      id:'arge-02', order:'02', name:'OTOTR Kalite Orkestrasyon Merkezi',
      description:'Kalite sinyallerini, görev orkestrasyonunu ve rapor kapatma öncesi kontrol akışını sentetik verilerle sınar.',
      category:'Kalite & Orkestrasyon', version:'v2', environment:'Sandbox',
      security:'Owner-only · rapor kapatma kapalı', tests:'7/7 geçti', updatedAt:'2026-11-13',
      url:'https://ototr-kalite-sandbox.samivolkan.chatgpt.site',
      gates:['Gerçek ERP rapor kapatma adaptörü','Server-side yetki','Audit/correlation','Staging UAT']
    },
    ...Array.from({length:8},(_,index)=>({
      id:`arge-${String(index+3).padStart(2,'0')}`, order:String(index+3).padStart(2,'0'),
      name:`ARGE Modülü ${String(index+3).padStart(2,'0')}`, description:'Kapsam, sahibi ve kabul ölçütleri doğrulandıktan sonra bu alana eklenecek.',
      category:'Hazırlanıyor', version:'—', environment:'Planlama', security:'Bağlantı yok',
      tests:'Başlatılmadı', updatedAt:'—', url:null,
      gates:['Kapsam kararı','Güvenlik incelemesi','Sentetik test','Owner kabulü']
    }))
  ]);

  function esc(value){
    return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  function statusClass(module){
    return module.url ? 'ready' : 'pending';
  }

  function moduleCard(module){
    const link = module.url
      ? `<a class="arge-link" href="${esc(module.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(module.name)} owner-only sandbox alanını aç">Sandbox'ı aç <span aria-hidden="true">↗</span></a>`
      : '<span class="arge-link disabled" aria-disabled="true">Hazırlanıyor</span>';
    return `<article class="arge-module-card ${statusClass(module)}" data-arge-module="${esc(module.id)}">
      <div class="arge-module-top"><span class="arge-number">${esc(module.order)}</span><span class="arge-state">${module.url?'Sandbox hazır':'Hazırlanıyor'}</span></div>
      <div><p class="arge-category">${esc(module.category)}</p><h3>${esc(module.name)}</h3><p class="arge-description">${esc(module.description)}</p></div>
      <dl class="arge-meta">
        <div><dt>Sürüm</dt><dd>${esc(module.version)}</dd></div><div><dt>Ortam</dt><dd>${esc(module.environment)}</dd></div>
        <div><dt>Güvenlik</dt><dd>${esc(module.security)}</dd></div><div><dt>Test</dt><dd>${esc(module.tests)}</dd></div>
        <div><dt>Son güncelleme</dt><dd>${esc(module.updatedAt)}</dd></div>
      </dl>
      <div class="arge-gates"><b>Üretim kapıları</b>${module.gates.map(gate=>`<span>${esc(gate)}</span>`).join('')}</div>
      <div class="arge-card-actions">${link}</div>
    </article>`;
  }

  function page(){
    const active=modules.filter(module=>module.url).length;
    return `<div class="arge-center" data-erp-arge-center>
      <section class="arge-hero">
        <div><span class="arge-eyebrow">OTOTR Genel Merkez · ARGE Sandbox Portföyü</span><h2>ERP ARGE</h2><p>n8n, otomasyon ve karar destek prototiplerini üretime bağlamadan önce güvenlik, test ve entegrasyon kapılarıyla yöneten merkez.</p></div>
        <div class="arge-hero-stats"><div><b>${active}</b><span>doğrulanmış sandbox</span></div><div><b>${modules.length}</b><span>modül kapasitesi</span></div><div><b>0</b><span>üretim bağlantısı</span></div></div>
      </section>
      <section class="arge-warning" role="note"><b>Owner-only erişim</b><span>Canlı bağlantılar yalnız yetkili owner hesabında açılır. Yetkisiz kullanıcılar dış sandbox içeriğine erişemez. Bu merkez erişim yetkisi vermez; gerçek ERP verisi, dış mesaj ve rapor kapatma işlemi tetiklemez.</span></section>
      <section class="arge-summary" aria-label="ARGE güvenlik özeti"><div><span>Veri sınırı</span><b>Sentetik / sandbox</b></div><div><span>Dış mesaj</span><b>Kapalı</b></div><div><span>ERP yazma</span><b>Kapalı</b></div><div><span>Üretim</span><b>NO-GO</b></div></section>
      <section class="arge-grid">${modules.map(moduleCard).join('')}</section>
    </div>`;
  }

  window.OTOTR_ERP_ARGE=Object.freeze({modules,page});
})();
