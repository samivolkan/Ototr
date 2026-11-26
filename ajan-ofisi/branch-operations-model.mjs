export const stations=[['intake','Sekreterya','Kısa İş Emri'],['mechanical','Lift 1','Motor ve Mekanik'],['body','Lift 2','Kaporta'],['presentation','Sunum Alanı','Sunum']];
export function progress(items){
 if(!Array.isArray(items))return {done:null,total:null,pct:null};
 const rows=[...new Map(items.filter(x=>x.required!==false&&x.applicable!==false).map(x=>[x.id,x])).values()];
 const done=rows.filter(x=>x.done===true).length;
 return {done,total:rows.length,pct:rows.length?Math.round(done/rows.length*100):null};
}
export function taskStatus(t){
 if(!t)return 'Kayıt yok';
 if(t.status==='completed')return 'Tamamlandı';
 if(t.waitReason)return 'Bekliyor';
 if(t.status==='active')return t.station==='presentation'?'Sunumda':'İşlemde';
 if(t.status==='unknown')return 'Durum doğrulanmadı';
 return t.ownerId||t.owner?'Sırada':'Atama bekliyor';
}
export function taskProgress(t){
 if(t?.station==='presentation')return {done:null,total:null,pct:t.status==='completed'?100:t.status==='queued'?0:null};
 return progress(t?.items);
}
export function reportProgress(c){
 if(Number.isFinite(c?.erpProgress?.pct)&&c.erpProgress.pct>=0&&c.erpProgress.pct<=100)return {...c.erpProgress,source:'ERP · dealerCompletion'};
 return {...progress(c?.reportItems),source:'Tamamlanan zorunlu rapor kalemi / uygulanabilir zorunlu rapor kalemi × 100'};
}
export function duration(ms){return Number.isFinite(ms)?Math.max(0,Math.floor(ms/60000))+' dk':'Kayıt yok';}
export function elapsed(c,now=Date.now()){const start=Date.parse(c?.openedAt),end=c?.completedAt?Date.parse(c.completedAt):now;return Number.isFinite(start)&&Number.isFinite(end)&&end>=start?end-start:null;}
export function taskTimes(t,now=Date.now()){
 // Active and waiting durations require separate event evidence. Never use assignment as start.
 const span=(base,since,running)=>Number.isFinite(base)?base+(running&&Number.isFinite(Date.parse(since))?Math.max(0,now-Date.parse(since)):0):null;
 return {active:span(t?.activeMs,t?.activeSince,t?.status==='active'&&!t?.waitReason),waiting:span(t?.waitingMs,t?.waitingSince,t?.status!=='completed'&&(!!t?.waitReason||t?.status==='queued'))};
}
const itemSet=(prefix,total,done)=>Array.from({length:total},(_,i)=>({id:prefix+'-'+i,label:'Zorunlu kontrol '+(i+1),required:true,applicable:true,done:i<done}));
export function createDemo(now=Date.now()){
 const iso=m=>new Date(now-m*60000).toISOString();
 return ['16 OTR 260','16 OTR 420','16 OTR 515'].map((plate,i)=>{
  const tasks=[
   {id:'intake',station:'intake',ownerId:'demo-ilayda',owner:'İlayda',title:'Kısa İş Emri',status:i===2?'completed':'active',items:itemSet('intake',20,i===0?17:20),activeMs:240000,waitingMs:60000,activeSince:iso(0)},
   {id:'mechanical',station:'mechanical',ownerId:'demo-gurkan',owner:'Gürkan',title:'Motor ve Mekanik',status:i===2?'completed':'active',items:itemSet('mechanical',20,i===0?11:20),activeMs:720000,waitingMs:120000,activeSince:iso(0)},
   {id:'body',station:'body',ownerId:'demo-vedat',owner:'Vedat',title:'Kaporta',status:i===2?'completed':i===1?'queued':'active',waitReason:i===1?'Araç sorgusu yanıtı bekleniyor':'',items:itemSet('body',20,i===0?3:i===1?7:20),activeMs:180000,waitingMs:i===1?180000:0,waitingSince:iso(0),activeSince:iso(0)},
   {id:'presentation',station:'presentation',ownerId:'demo-ilayda',owner:'İlayda',title:'Sunum',status:'queued',waitReason:i===2?'Sunum sırası bekleniyor':'Güncel raporun baskı ve sunum uygunluğu bekleniyor',items:null,activeMs:0,waitingMs:i===2?420000:0,waitingSince:iso(0)}
  ];
  return {id:'demo-'+i,plate,branch:'Bursa Nilüfer · örnek şube',packageName:'Örnek paket · 124 zorunlu kalem',openedAt:iso(18+i*7),tasks,reportItems:[...tasks.flatMap(t=>t.items||[]),...itemSet('other',64,i===2?64:0)],gates:{print:i===2?'Örnek baskı teyidi var':'Baskı kontrolü bekliyor',presentation:i===2?'Sunum sırası bekliyor':'Baskı / rapor kontrolü bekliyor',delivery:'Teslim teyidi yok'}};
 });
}
export function advanceDemo(c,station){const t=c.tasks.find(t=>t.station===station);if(!t)return false;if(station==='presentation'){if(c.gates.print!=='Örnek baskı teyidi var')return false;t.status=t.status==='queued'?'active':'completed';t.waitReason='';t.activeSince=new Date().toISOString();return true;}const item=t.items.find(i=>!i.done);if(!item)return false;item.done=true;t.waitReason='';t.status=t.items.every(i=>i.done)?'completed':'active';return true;}
