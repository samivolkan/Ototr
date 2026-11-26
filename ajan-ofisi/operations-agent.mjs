// Assigned organizational role; this registry does not activate a background worker.
export const operationsAgent = Object.freeze({
 id:'OPS-01', department:'OPS', name:'Operasyon Ajanı', manager:'MGR-OPS', coordinator:'COO-01', reviewer:'BEK-01',
 status:'Ekibe dahil · salt okunur takip', execution:'Talep üzerine; bağımsız arka plan yürütücüsü bağlı değil',
 workspace:'branch-operations.html', plan:'OPERATIONS-AGENT-PLAN.md',
 scope:'Şube ve iş emri bazında aşama, sorumlu, bekleme, işlem süresi, eksik kontrol ve gecikme takibi.',
 deliverable:'Kaynak zamanı ve iş emri kimliğiyle şube özeti; engel, sorumlu, önerilen aksiyon ve GM eskalasyonu.',
 capabilities:Object.freeze({readProjection:true,writeERP:false,changeReport:false,sendCustomerMessage:false,approvePayment:false,backgroundExecution:false}),
 stages:Object.freeze(['Kabul','Personel atama','Ekspertiz kontrolleri','Kalite ve rapor kontrolü','Müşteriye sunum','Teslim']),
 escalation:Object.freeze({routine:'Şube operasyon sorumlusu',repeated:'MGR-OPS → COO-01',policy:'COO-01 → Sami',sourceFailure:'Kaynak sorumlusu; etkilenen işte değerlendirme durur'}),
 kpis:Object.freeze(['Bekleme süresi','Aktif işlem süresi','Aşama bazında gecikme','Eksik zorunlu kontrol','Yeniden açılan iş','Veri güncelliği']),
 readiness:Object.freeze({singleBranchView:'Mevcut ekran; demo ve oturumlu ERP okuyucu',multiBranchView:'Planlandı; yetkili şube listesi ve şube bazlı veri sözleşmesi gerekli',liveAcceptance:'Gerçek oturumla canlı kabul testi bekliyor'})
});
