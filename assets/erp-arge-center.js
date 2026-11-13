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
    {
      id:'arge-03', order:'03', name:'Genel Müdürlük / Otomasyon Kontrol Merkezi', shortName:'Otomasyon Kontrol',
      description:'n8n otomasyonlarını, çalışma durumlarını ve kontrollü operasyon sinyallerini owner-only sandbox içinde izler.',
      category:'Genel Müdürlük & Otomasyon', version:'v2', environment:'Sandbox',
      security:'Owner-only · üretim tetikleri kapalı', tests:'7/7 geçti', updatedAt:'2026-11-13',
      url:'https://ototr-otomasyon-sandbox-03.samivolkan.chatgpt.site',
      gates:['Gerçek n8n credential kasası','Server-side RBAC','Audit/correlation','Staging UAT']
    },
    {
      id:'arge-04', order:'04', name:'Olumsuz Yorum ve Şikâyet Alarm Merkezi', shortName:'Şikâyet Alarmı',
      description:'Olumsuz yorum ve şikâyet sinyallerini insan onayı gerektiren vaka akışında owner-only olarak sınar.',
      category:'İtibar & Şikâyet', version:'v1', environment:'Sandbox',
      security:'Owner-only · dış yanıt kapalı', tests:'7/7 geçti', updatedAt:'2026-11-13',
      url:'https://ototr-vaka-merkezi-04.samivolkan.chatgpt.site',
      gates:['Canlı yorum adaptörü','İnsan onaylı yanıt','KVKK incelemesi','Staging UAT']
    },
    {
      id:'arge-05', order:'05', name:'Randevu Operasyon Merkezi', shortName:'Randevu Operasyonu',
      description:'Randevu yoğunluğu, takip ve operasyon senaryolarını sentetik veriyle owner-only sandbox ortamında doğrular.',
      category:'Randevu & Operasyon', version:'v2', environment:'Sandbox',
      security:'Owner-only · müşteri mesajı kapalı', tests:'5/5 geçti', updatedAt:'2026-11-13',
      url:'https://ototr-randevu-operasyon.samivolkan.chatgpt.site',
      gates:['Canlı CRM adaptörü','Mesaj onay akışı','Idempotency/audit','Staging UAT']
    },
    {
      id:'arge-06', order:'06', name:'ERP–POS–Banka Tahsilat Mutabakatı', shortName:'Tahsilat Mutabakatı',
      description:'ERP, POS ve banka tahsilat eşleşmelerini finansal işlem yapmadan owner-only sandbox içinde karşılaştırır.',
      category:'Finans & Mutabakat', version:'v1', environment:'Sandbox',
      security:'Owner-only · finansal yazma kapalı', tests:'4/4 geçti', updatedAt:'2026-11-13',
      url:'https://ototr-tahsilat-mutabakat-06.samivolkan.chatgpt.site',
      gates:['Salt-okunur finans adaptörleri','Yetki ayrılığı','Audit/idempotency','Finans UAT']
    },
    {
      id:'arge-07', order:'07', name:'Cihaz Bakım ve Kalibrasyon', shortName:'Cihaz & Kalibrasyon',
      description:'Cihaz bakım, kalibrasyon ve yaklaşan kontrol sinyallerini owner-only sandbox ortamında izler.',
      category:'Cihaz Operasyonu', version:'v2', environment:'Sandbox',
      security:'Owner-only · cihaz komutu kapalı', tests:'7/7 geçti', updatedAt:'2026-11-13',
      url:'https://ototr-cihaz-operasyon-07.samivolkan.chatgpt.site',
      gates:['Cihaz envanter adaptörü','Servis yetki matrisi','Kanıt/audit kaydı','Staging UAT']
    },
    {
      id:'arge-08', order:'08', name:'Franchise Aday Değerlendirme', shortName:'Aday Değerlendirme',
      description:'Franchise aday sinyallerini karar vermeden, açıklanabilir değerlendirme önerisi olarak owner-only sandbox içinde sunar.',
      category:'Franchise & Değerlendirme', version:'v2', environment:'Sandbox',
      security:'Owner-only · karar insan onaylı', tests:'5/5 geçti', updatedAt:'2026-11-13',
      url:'https://ototr-franchise-arge-08.samivolkan.chatgpt.site',
      gates:['Canlı aday adaptörü','Açıklanabilir skor','İnsan karar onayı','KVKK/UAT']
    },
    {
      id:'arge-09', order:'09', name:'Yeni Şube Açılış Kontrolü', shortName:'Şube Açılış Kontrolü',
      description:'Yeni şube açılış hazırlığını kontrol listeleri ve kanıt kapılarıyla owner-only sandbox içinde doğrular.',
      category:'Franchise & Açılış', version:'v1', environment:'Sandbox',
      security:'Owner-only · canlı açılış işlemi kapalı', tests:'5/5 geçti', updatedAt:'2026-11-13',
      url:'https://ototr-franchise-control-09.samivolkan.chatgpt.site',
      gates:['Şube kimlik sözleşmesi','Kanıt zorunluluğu','Çoklu onay','Staging UAT']
    },
    {
      id:'arge-10', order:'10', name:'Personel Onboarding ve Erişim Kontrolü', shortName:'Onboarding & Erişim',
      description:'Personel onboarding ve erişim kontrol adımlarını gerçek hesap açmadan owner-only sandbox içinde sınar.',
      category:'İK & Erişim', version:'v2', environment:'Sandbox',
      security:'Owner-only · hesap/yetki yazma kapalı', tests:'8/8 geçti', updatedAt:'2026-11-13',
      url:'https://ototr-personel-erisim-sandbox.samivolkan.chatgpt.site',
      gates:['Canlı İK kimliği','Least-privilege matrisi','KVKK/audit','Staging UAT']
    }
  ]);
  modules[0].shortName='Memnuniyet Merkezi';
  modules[1].shortName='Kalite Orkestrasyonu';

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

  function routeFor(moduleOrId){
    const id=typeof moduleOrId==='string'?moduleOrId:moduleOrId?.id;
    return `erp-arge/${id||modules[0].id}`;
  }
  function parseRoute(value){
    const match=String(value||'').replace(/^#\/?/,'').match(/^erp-arge\/(arge-(?:0[1-9]|10))$/);
    return match&&modules.some(module=>module.id===match[1])?match[1]:null;
  }
  function moduleDetail(module){
    const action=module.url
      ? `<a class="arge-link" href="${esc(module.url)}" target="_blank" rel="noopener noreferrer">Denemeyi Aç <span aria-hidden="true">↗</span></a>`
      : '<span class="arge-link disabled" aria-disabled="true">Canlı deneme henüz açılmadı</span>';
    return `<section class="arge-detail ${statusClass(module)}" data-arge-detail="${esc(module.id)}">
      <a class="arge-back" href="#erp-arge">← Tüm ARGE modülleri</a>
      <div class="arge-detail-head"><div><span class="arge-number">${esc(module.order)}</span><p class="arge-category">${esc(module.category)}</p><h2>${esc(module.name)}</h2><p>${esc(module.description)}</p></div><span class="arge-state">${module.url?'Owner-only sandbox hazır':'Hazırlanıyor'}</span></div>
      <div class="arge-detail-grid"><div class="arge-detail-panel"><h3>Mevcut durum</h3><dl class="arge-meta"><div><dt>Sürüm</dt><dd>${esc(module.version)}</dd></div><div><dt>Ortam</dt><dd>${esc(module.environment)}</dd></div><div><dt>Güvenlik</dt><dd>${esc(module.security)}</dd></div><div><dt>Test / entegrasyon</dt><dd>${esc(module.tests)}</dd></div><div><dt>Son güncelleme</dt><dd>${esc(module.updatedAt)}</dd></div></dl></div>
      <div class="arge-detail-panel"><h3>Üretim kapıları</h3><div class="arge-gate-list">${module.gates.map((gate,index)=>`<div><span>${index+1}</span><b>${esc(gate)}</b><em>Bekliyor</em></div>`).join('')}</div></div></div>
      <div class="arge-warning" role="note"><b>Güvenli deneme sınırı</b><span>Bu ekran gerçek ERP verisi yazmaz; dış mesaj, finans veya rapor kapatma işlemi tetiklemez. ${module.url?'Dış deneme yalnız yetkili owner hesabında açılır.':'Doğrulanmış bir dış sandbox bağlantısı bulunmadığı için URL üretilmemiştir.'}</span></div>
      <div class="arge-detail-actions">${action}<a class="arge-secondary-link" href="#erp-arge">Portföye dön</a></div>
    </section>`;
  }
  function page(activeId){
    const selected=modules.find(module=>module.id===activeId);
    if(selected) return moduleDetail(selected);
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

  window.OTOTR_ERP_ARGE=Object.freeze({modules,page,routeFor,parseRoute});
})();
