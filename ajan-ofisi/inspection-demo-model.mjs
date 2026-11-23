// Synthetic, in-memory rehearsal. No customer records, API calls or external actions.
export function newInspectionDemo(){return {id:'DEMO-OPS-001',branch:'demo-branch',mode:'demo',revision:0,events:[],intake:false,stations:{body:false,mechanical:false},queries:{vehicle:'waiting'},report:null,printed:false,presented:false,delivered:false,invitation:'disabled',cancelled:false};}
export function inspectDemo(s){
 if(s.cancelled)return {stage:'İptal edildi',owner:'Şube sorumlusu',next:'Yeni otomatik işlem yapılmaz.'};
 if(!s.intake)return {stage:'Kabul bilgisi bekleniyor',owner:'Sekreterya',next:'İş emri ve hizmet eşleşmesini doğrula.'};
 if(Object.values(s.stations).some(v=>!v))return {stage:'Test istasyonları çalışıyor',owner:'İlgili ustalar',next:'Eksik istasyon verisini ve kanıtını tamamla.'};
 if(Object.values(s.queries).some(v=>v!=='success'))return {stage:'Sorgu sonucu bekleniyor',owner:'Şube sorumlusu / entegrasyon',next:'Hata veya zaman aşımını çöz; boş sonucu temiz kayıt sayma.'};
 if(!s.report)return {stage:'Rapor insan onayında',owner:'Rapor kontrolörü',next:'Bulguları değiştirmeden onaylı sürümü doğrula.'};
 if(!s.printed||!s.presented)return {stage:'Baskı ve sunum bekleniyor',owner:'Sekreterya / sunum sorumlusu',next:'Aynı sürümün baskı ve sunum kanıtını ayrı doğrula.'};
 if(!s.delivered)return {stage:'Teslim teyidi bekleniyor',owner:'Teslim sorumlusu',next:'Teslim edilen rapor sürümünü ve teslim kanıtını doğrula.'};
 return {stage:'Teslim tamamlandı · iletişim kapalı',owner:'Müşteri deneyimi',next:'İletişim uygunluğu, şube linki ve insan onayı olmadan mesaj gönderilmez.'};
}
export function applyInspectionDemo(s,e){
 if(!e?.id||!e.actor||!e.evidence||!Number.isFinite(Date.parse(e.at)))throw Error('Olay, sorumlu, zaman ve kanıt gerekli.');
 if(e.caseId!==s.id||e.branch!==s.branch||e.mode!=='demo')throw Error('İş emri veya demo kapsamı uyuşmuyor.');
 const old=s.events.find(x=>x.id===e.id);if(old){if(JSON.stringify(old)!==JSON.stringify(e))throw Error('Olay kimliği farklı içerikle tekrarlandı.');return s;}
 if(e.expectedRevision!==s.revision)throw Error('Güncel iş sürümü gerekli.');
 if(s.cancelled)throw Error('İptal edilmiş iş ilerlemez.');
 const n=structuredClone(s),complete=Object.values(s.stations).every(Boolean)&&Object.values(s.queries).every(v=>v==='success');
 switch(e.type){
  case 'intake':if(s.intake)throw Error('Kabul zaten kayıtlı.');n.intake=true;break;
  case 'station':if(!s.intake||!Object.hasOwn(s.stations,e.key)||s.stations[e.key]||s.report)throw Error('İstasyon geçişi uygun değil.');n.stations[e.key]=true;break;
  case 'query':if(!s.intake||!Object.hasOwn(s.queries,e.key)||!['failed','success'].includes(e.result)||s.report)throw Error('Sorgu geçişi uygun değil.');n.queries[e.key]=e.result;break;
  case 'approve_report':if(!s.intake||!complete||s.report||!e.reportVersion)throw Error('Tüm zorunlu test/sorgular ve rapor sürümü gerekli.');n.report=e.reportVersion;break;
  case 'reopen_report':if(!s.report)throw Error('Onaylı rapor yok.');n.report=null;n.printed=false;n.presented=false;n.delivered=false;break;
  case 'print':case 'present':case 'deliver':
   if(!s.report||e.reportVersion!==s.report)throw Error('Onaylı rapor sürümü uyuşmuyor.');
   if(e.type==='deliver'&&(!s.printed||!s.presented))throw Error('Baskı ve sunum kanıtı gerekli.');
   n[e.type==='print'?'printed':e.type==='present'?'presented':'delivered']=true;break;
  case 'cancel':n.cancelled=true;break;
  default:throw Error('Gönderim, ücretli sorgu ve rapor değiştirme işlemi bu demoda yok.');
 }
 n.revision++;n.events.push(structuredClone(e));return n;
}
export const inspectionScenario=[
 {type:'intake',actor:'DEMO-Sekreterya',label:'İş emrini doğrula'},
 {type:'query',key:'vehicle',result:'failed',actor:'DEMO-Entegrasyon',label:'Sorgu kesintisini göster'},
 {type:'station',key:'body',actor:'DEMO-Kaporta ustası',label:'Kaporta istasyonunu tamamla'},
 {type:'station',key:'mechanical',actor:'DEMO-Mekanik ustası',label:'Mekanik istasyonunu tamamla'},
 {type:'query',key:'vehicle',result:'success',actor:'DEMO-Entegrasyon',label:'Sorgu sorununu çöz'},
 {type:'approve_report',reportVersion:'demo-v1',actor:'DEMO-Rapor kontrolörü',label:'İnsan rapor onayını canlandır'},
 {type:'print',reportVersion:'demo-v1',actor:'DEMO-Sekreterya',label:'Baskı teyidini kaydet'},
 {type:'present',reportVersion:'demo-v1',actor:'DEMO-Sunum sorumlusu',label:'Sunumu tamamla'},
 {type:'deliver',reportVersion:'demo-v1',actor:'DEMO-Teslim sorumlusu',label:'Teslim teyidini kaydet'}
];
