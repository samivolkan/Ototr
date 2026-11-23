'use strict';
// Read-only, public-safe progress snapshots. No execution or write endpoint.
(function(root){
 const statuses={reviewing:'Kaynak inceleniyor',guard_pending:'Bağımsız denetim bekliyor',reviewed:'Denetim tamamlandı',blocked:'Bilgi bekliyor'};
 function validate(value){
  if(value?.version!==1||value.codeWriting!==false||!Number.isFinite(Date.parse(value.updatedAt))||!Array.isArray(value.runs)||value.runs.length>2)throw Error('Geçersiz inceleme kaydı');
  const ids=new Set();
  for(const run of value.runs){if(!['FIN','FRA'].includes(run.department)||ids.has(run.department)||!statuses[run.status]||!Array.isArray(run.events)||!Array.isArray(run.reports))throw Error('Geçersiz inceleme kapsamı');ids.add(run.department);
   for(const report of run.reports){for(const key of ['id','finding','recommendation','risk','effort','decision'])if(typeof report[key]!=='string'||!report[key].trim())throw Error('Eksik rapor alanı');if(!Array.isArray(report.evidence)||!report.evidence.length||report.evidence.some(e=>typeof e.file!=='string'||!Number.isInteger(e.start)||!Number.isInteger(e.end)||e.start<1||e.end<e.start))throw Error('Kanıtsız rapor');}
  }return value;
 }
 function label(run,updatedAt,now=Date.now()){return run.status==='reviewing'&&now-Date.parse(updatedAt)>120000?'Güncel çalışma durumu doğrulanamadı':statuses[run.status];}
 const api={validate,label};if(typeof module!=='undefined')module.exports=api;root.OfficeReview=api;
})(typeof window!=='undefined'?window:globalThis);
