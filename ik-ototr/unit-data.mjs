// Documents are physically isolated per unit; this projection is used for synthetic seeding only.
export function unitDocument(source,branch){
 const d=structuredClone(source), ids=new Set(d.employees.filter(e=>e.branch===branch).map(e=>e.id));
 const belongs=r=>r.employeeId?ids.has(r.employeeId):r.branch?r.branch===branch:r.participants?r.participants.some(id=>ids.has(id)):r.actor?ids.has(r.actor):true;
 const clean=r=>{if(Array.isArray(r))return r.map(clean);if(!r||typeof r!=='object')return r;const out={};for(const [k,v] of Object.entries(r)){
  if(['managerId','hrApprover','visaManager','replacementId','reviewerId'].includes(k))out[k]=ids.has(v)?v:'';
  else if(['participants','approvers'].includes(k)&&Array.isArray(v))out[k]=v.filter(id=>ids.has(id));
  else if(Array.isArray(v))out[k]=v.filter(x=>!x?.employeeId||ids.has(x.employeeId)).map(clean);
  else out[k]=clean(v);
 }return out;};
 for(const [k,v] of Object.entries(d))if(Array.isArray(v))d[k]=k==='employees'?v.filter(e=>ids.has(e.id)):v.filter(belongs);
 const result=clean(d);result.settings.branches=[branch];result.settings.notificationPreferences=Object.fromEntries(Object.entries(result.settings.notificationPreferences||{}).filter(([id])=>ids.has(id)));
 result.settings.hrApprover=result.employees[0]?.id||'';
 result.payrolls=result.payrolls.filter(p=>p.rows.length);result.revision=0;return result;
}
export function combineUnits(rows){
 if(!rows.length)throw Error('Bu hesap için İK OTOTR erişimi tanımlanmamış.');
 const d=structuredClone(rows[0].document);for(const [key,value]of Object.entries(d))if(Array.isArray(value)){
  const records=rows.flatMap(r=>r.document[key]||[]);d[key]=[...new Map(records.map(r=>[r?.id??JSON.stringify(r),r])).values()];
  if(key==='payrolls')d[key]=d[key].map(p=>({...p,rows:records.filter(x=>x.id===p.id).flatMap(x=>x.rows)}));
 }
 d.settings.branches=rows.map(r=>r.unit);d.settings.financialControls=rows.flatMap(r=>r.document.settings.financialControls||[]);d.revision=0;return d;
}
