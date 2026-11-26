// Read-only projection. Never includes customer names, phone, VIN, answers, tokens or evidence URLs.
export function projectWorkOrder(wo,ctx){
 const catalog=ctx.schema.packages||[];
 const packageCode=ctx.packageCode(wo.packageName);
 if((wo.livePackageCode&&String(wo.livePackageCode).toUpperCase()!==packageCode)||!catalog.some(p=>p.code===packageCode))throw Error('Seçilen paket şeması doğrulanamadı.');
 const groups=ctx.groups(wo), tasks=wo.tasks||[];
 const itemsFor=gs=>gs.flatMap(g=>g.items.map(i=>({id:i.id,label:i.name||i.title||i.id,required:i.isRequired!==false&&i.required!==false,applicable:true,done:ctx.answered(ctx.value(wo,i))})));
 const stationTask=(station,codes,title)=>{
  const gs=groups.filter(g=>codes.includes(g.taskTypeCode));
  const assigned=tasks.filter(t=>codes.includes(t.taskKey)||codes.includes(t.scope));
  const ownerIds=[...new Set(assigned.map(t=>t.ownerUserId||t.assignedUserId).filter(Boolean))];
  const names=[...new Set(assigned.map(t=>t.ownerDisplayName).filter(Boolean))];
  const state=assigned.length&&assigned.every(t=>t.liveStatus==='COMPLETED')?'completed':assigned.some(t=>['IN_PROGRESS','STARTED'].includes(t.liveStatus))?'active':assigned.length?'queued':'unknown';
  return {id:station,station,title,ownerId:ownerIds.join(', '),owner:names.join(', ')||(ownerIds.length?'Atanmış çalışan · ad kaydı yok':assigned.map(t=>t.owner).filter(Boolean).join(', ')||'Sorumlu doğrulanmadı'),status:state,waitReason:assigned.some(t=>t.liveStatus==='LOCKED')?'ERP ön koşulu / kilit bekleniyor':'',items:gs.length?itemsFor(gs):null,activeMs:null,waitingMs:null,sourceTaskIds:assigned.map(t=>t.id)};
 };
 const required=ctx.shortRequired.filter(n=>ctx.required(wo).includes(n));
 const intake={id:'intake',station:'intake',title:'Kısa İş Emri',ownerId:null,owner:'Sekreterya · kişi kaydı yok',status:'unknown',items:required.map(n=>({id:n,label:ctx.fieldLabels[n]||n,required:true,applicable:true,done:ctx.fieldComplete(wo,n)})),activeMs:null,waitingMs:null};
 const presentation={id:'presentation',station:'presentation',title:'Sunum',owner:null,ownerId:null,status:'unknown',waitReason:'Sunum olay kaydı bu kaynakta yok',items:null,activeMs:null,waitingMs:null};
 const gate=ctx.printGate(wo,ctx.completion(wo));
 return {id:wo.supabaseId,plate:wo.plate,branch:'Yetkili ERP şubesi',packageName:wo.packageName,openedAt:wo.openedAtISO||null,completedAt:wo.completedAtISO||null,tasks:[intake,stationTask('mechanical',['MOTOR_CHECKUP','MECHANICAL_CHECKUP'],'Motor ve Mekanik'),stationTask('body',['BODY_PAINT_CHECKUP'],'Kaporta'),presentation],erpProgress:ctx.completion(wo),gates:{print:gate.ready?'ERP baskı kontrolü uygun':'ERP baskı kontrolü bekliyor',presentation:'Ayrı sunum teyidi gerekli',delivery:'Ayrı teslim teyidi gerekli'}};
}
