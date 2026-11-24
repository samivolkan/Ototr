'use strict';
// Read-only, public-safe progress snapshots. No execution or write endpoint.
(function(root){
 const statuses={reviewing:'Kaynak inceleniyor',guard_pending:'Bağımsız denetim bekliyor',reviewed:'Tarihsel denetim tamamlandı',blocked:'Bilgi bekliyor'};
 function validate(value){
  if(value?.version!==1||value.codeWriting!==false||!Number.isFinite(Date.parse(value.updatedAt))||!Array.isArray(value.runs)||value.runs.length>2)throw Error('Geçersiz inceleme kaydı');
  const ids=new Set();
  for(const run of value.runs){if(!['FIN','FRA'].includes(run.department)||ids.has(run.department)||!statuses[run.status]||!Array.isArray(run.events)||!Array.isArray(run.reports))throw Error('Geçersiz inceleme kapsamı');ids.add(run.department);
   for(const report of run.reports){for(const key of ['id','finding','recommendation','risk','effort','decision'])if(typeof report[key]!=='string'||!report[key].trim())throw Error('Eksik rapor alanı');if(!Array.isArray(report.evidence)||!report.evidence.length||report.evidence.some(e=>typeof e.file!=='string'||!Number.isInteger(e.start)||!Number.isInteger(e.end)||e.start<1||e.end<e.start))throw Error('Kanıtsız rapor');}
  }return value;
 }
 function label(run,updatedAt,now=Date.now()){return run.status==='reviewing'&&now-Date.parse(updatedAt)>120000?'Güncel çalışma durumu doğrulanamadı':statuses[run.status];}
 function evidenceLabel(snapshot,run,releaseCommit,baselineCommit){
  const unknown='Kanıt güncelliği doğrulanamadı';
  if(snapshot?.version!==1||snapshot.kind!=='source_evidence_comparison'||snapshot.independentReviewPerformed!==false||!Number.isFinite(Date.parse(snapshot.checkedAt))||!/^[a-f0-9]{7,40}$/.test(releaseCommit||'')||!/^[a-f0-9]{40}$/.test(snapshot.checkedCommit||'')||!snapshot.checkedCommit.startsWith(releaseCommit)||snapshot.baselineCommit!==baselineCommit||!Array.isArray(snapshot.reports))return unknown;
  const rows=snapshot.reports.filter(r=>r.department===run.department),ids=new Set(rows.map(r=>r.id));
  if(rows.length!==run.reports.length||ids.size!==rows.length||run.reports.some(r=>!ids.has(r.id))||rows.some(r=>!['unchanged','changed','review_changed','unavailable'].includes(r.status)))return unknown;
  if(rows.some(r=>r.status==='unavailable'))return unknown;
  return rows.some(r=>r.status!=='unchanged')?'Kaynak veya rapor değişti · yeniden inceleme gerekli':'Kanıt dosyaları bu yayında değişmemiş';
 }
 const api={validate,label,evidenceLabel};if(typeof module!=='undefined')module.exports=api;root.OfficeReview=api;
})(typeof window!=='undefined'?window:globalThis);
