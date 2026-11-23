// Validated domain contract, not a deployed worker or permission grant.
const terminal=new Set(['done','cancelled']);
const highRisk=new Set(['para','veri','yetki','şema']);
export function createWork({id,branchId,owner,manager,risk,source,mode='demo',reviewer='BEK-01'}){
 if(![id,branchId,owner,manager,source].every(x=>typeof x==='string'&&x.trim())||!['para','veri','yetki','şema','tasarım','düşük'].includes(risk)||!['demo','live'].includes(mode))throw Error('İşin kimliği, şubesi, sahibi ve kaynağı zorunlu.');
 if(!reviewer||reviewer===owner)throw Error('Denetçi üreticiden ayrı olmalı.');
 return {id,branchId,owner,manager,reviewer,risk,source,mode,state:'assigned',version:0,events:[],evidence:[],handoff:null,review:null};
}
export function applyWorkEvent(work,event){
 if(!event||!event.id||!event.actor||!event.type||!Number.isFinite(Date.parse(event.at)))throw Error('Olay kimliği, yapan ve zaman gerekli.');
 const previous=work.events.find(e=>e.id===event.id);
 if(previous){if(JSON.stringify(previous)!==JSON.stringify(event))throw Error('Aynı olay kimliği farklı içerikle kullanıldı.');return work;}
 if(event.branchId!==work.branchId||event.mode!==work.mode)throw Error('Şube veya demo/canlı kapsamı uyuşmuyor.');
 if(event.expectedVersion!==work.version)throw Error('Eski iş sürümü; yeniden oku.');
 if(terminal.has(work.state))throw Error('Kapanmış iş otomatik değiştirilemez.');
 const n=structuredClone(work);const owner=event.actor===work.owner,manager=event.actor===work.manager;
 switch(event.type){
  case 'accept':if(!owner||work.state!=='assigned')throw Error('Yalnız alıcı görevi kabul eder.');n.state='accepted';break;
  case 'start':if(!owner||work.state!=='accepted')throw Error('Önce görev kabulü gerekli.');n.state='in_progress';break;
  case 'block':if(!owner||!['accepted','in_progress'].includes(work.state)||!event.reason?.trim())throw Error('Engel nedeni ve iş sahibi gerekli.');n.resumeState=work.state;n.state='blocked';n.blockedReason=event.reason;break;
  case 'resume':if(!owner||work.state!=='blocked'||!event.evidence?.reference)throw Error('Engelin çözüm kanıtı gerekli.');n.state=work.resumeState;n.blockedReason=null;break;
  case 'handoff':if(!owner||!['accepted','in_progress'].includes(work.state)||!event.recipient||event.recipient===work.owner||event.recipient===work.reviewer||!event.acceptance?.trim())throw Error('Alıcı ve kabul koşulu gerekli; denetçi üretici olamaz.');n.handoff={from:work.owner,to:event.recipient,acceptance:event.acceptance,previous:work.state};n.state='handoff_pending';break;
  case 'accept_handoff':if(work.state!=='handoff_pending'||event.actor!==work.handoff.to)throw Error('Devir yalnız alıcı tarafından kabul edilir.');n.owner=work.handoff.to;n.state='accepted';n.handoff=null;break;
  case 'submit':if(!owner||work.state!=='in_progress'||!event.evidence?.reference||!event.evidence?.version)throw Error('Teslim için kaynak ve sürüm kanıtı gerekli.');n.evidence.push(event.evidence);n.producer=work.owner;n.review=null;n.state='review_pending';break;
  case 'review':if(work.state!=='review_pending'||event.actor===work.producer||event.actor!==work.reviewer||!event.evidence?.reference||!['passed','rejected'].includes(event.result))throw Error('Bağımsız, atanmış denetçi ve kanıt gerekli.');n.review={reviewer:event.actor,result:event.result,evidence:event.evidence};n.state=event.result==='passed'?'manager_pending':'in_progress';break;
  case 'close':if(!manager||work.state!=='manager_pending'||!n.evidence.length||n.review?.result!=='passed'||(highRisk.has(work.risk)&&n.review.reviewer===n.producer))throw Error('Yönetici kabulü ve bağımsız denetim gerekli.');n.state='done';break;
  case 'cancel':if(!manager||!event.reason?.trim())throw Error('Yönetici ve iptal nedeni gerekli.');n.state='cancelled';break;
  default:throw Error('Bu işlem tanımlı değil; rapor/mali kural/mesaj işlemi yok.');
 }
 n.version++;n.events.push(structuredClone(event));return n;
}
