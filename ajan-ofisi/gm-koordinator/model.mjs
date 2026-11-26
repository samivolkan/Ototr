// Synthetic, deterministic demo. This module grants no production authority.
import {dossierFor} from './dossiers.mjs';
export const VERSION = 1;
export const DEPARTMENTS = [
  {id:'FIN',name:'Finans',owner:'FIN-02',color:'#8b7cdd',capacity:2,href:'../finance-health.html'},
  {id:'HR',name:'İnsan kaynakları',owner:'HR-02',color:'#d69ac0',capacity:2,href:'../../ik-ototr/'},
  {id:'COM',name:'Müşteri deneyimi',owner:'COM-01',color:'#e6a45f',capacity:2,href:'../../gm-sikayet/'},
  {id:'REV',name:'Yorum ekibi',owner:'REV-01',color:'#69bac8',capacity:2,href:'../review-team.html'},
  {id:'SALE',name:'Saha satış',owner:'SALE-01',color:'#b2bd68',capacity:2,href:'../../saha-satis/'},
  {id:'FRA',name:'Franchise',owner:'FRA-03',color:'#63b894',capacity:2,href:'../franchise-specialist.html'},
  {id:'SEO',name:'SEO ve içerik',owner:'SEO-03',color:'#80aef2',capacity:2,href:'../seo-workspace.html'}
];
export const STATUS = {queued:'Sırada',blocked:'Engelli',approval:'Onay bekliyor',ready:'Hazır',running:'Çalışıyor',retry:'Tekrar denenecek',review:'Kontrol bekliyor',done:'Doğrulandı',rejected:'Reddedildi',cancelled:'İptal'};
export const ACTORS = ['COO-01','SAMI-DEMO','BEK-01',...DEPARTMENTS.map(d=>d.owner)];
const hour=3600000;
const clone=x=>structuredClone(x);
const ensure=(condition,message)=>{if(!condition)throw Error(message);};
const day=now=>new Date(now+3*hour).toISOString().slice(0,10);
const week=now=>{const d=new Date(now+3*hour);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);};
const policy={version:1,queueLimit:10,dailyMinutes:45,weeklyMinutes:840,cycleBudget:30,taskCost:1,maxAttempts:3,approvalHours:24};
const terminal=t=>['done','rejected','cancelled'].includes(t.status);
const event=(id,dept,title,action='internal',extra={})=>({id,dept,title,action,source:'demo:'+id,ageHours:1,confidence:.9,priority:2,effort:2,baseline:20,target:12,unit:'saat',direction:'lower',...extra});
export const FIXTURES = [
 event('complaint','COM','Nilüfer Demo · Tekrarlayan bekleme şikâyeti','internal',{priority:1,baseline:42,target:25,unit:'dk'}),
 event('training','HR','Nilüfer Demo · Yoğun saatler için eğitim planı','internal',{baseline:62,target:90,unit:'%',direction:'higher'}),
 event('collection','FIN','Demo Bayi A · Geciken alacak incelemesi','money',{baseline:18,target:10,unit:'gün'}),
 event('opening','FRA','Demo Aday B · Açılış hazırlık dosyası','internal',{dependsOn:['training','collection'],baseline:65,target:100,unit:'%',direction:'higher'}),
 event('blog','SEO','Ekspertiz süreci · Demo blog yayını','publish',{baseline:12,target:18,unit:'talep',direction:'higher'}),
 event('review','REV','Demo yorum · Yanıt değerlendirmesi','message',{baseline:16,target:8}),
 event('sales','SALE','Demo galeri · Ziyaret sonrası takip','internal',{baseline:15,target:25,unit:'%',direction:'higher'}),
 event('seo','SEO','Yerel görünürlük · Teknik inceleme','internal',{baseline:24,target:12,unit:'hata'}),
 event('stale','FIN','Demo finans raporu · Güncellik kontrolü','internal',{ageHours:80}),
 event('benchmark','SEO','Benchmark · İçerik sıklığını ikiye katlama','internal',{confidence:.35,comparable:false,baseline:12,target:18,unit:'talep',direction:'higher'})
];
export function createDemo(now=Date.parse('2026-11-26T06:00:00Z')) {
 ensure(Number.isFinite(now),'Geçerli saat gerekli.');
 return {schema:VERSION,mode:'demo',revision:0,now,paused:false,policy:clone(policy),tasks:[],events:[],receipts:[],audit:[],outbox:[],incidents:[],usage:{day:day(now),week:week(now),daily:0,weekly:0,total:0},sources:Object.fromEntries(DEPARTMENTS.map(d=>[d.id,{online:true}])),lastSummary:null};
}
function audit(s,actor,type,subject,detail){s.audit.push({id:'A'+(s.audit.length+1),at:new Date(s.now).toISOString(),actor,type,subject,detail});}
function normalizeUsage(s){if(s.usage.day!==day(s.now)){s.usage.day=day(s.now);s.usage.daily=0;}if(s.usage.week!==week(s.now)){s.usage.week=week(s.now);s.usage.weekly=0;}}
function incident(s,key,reason){if(!s.incidents.some(i=>i.key===key&&i.status==='open'))s.incidents.push({id:'I'+(s.incidents.length+1),key,reason,status:'open',at:s.now});}
function requireActor(actor,allowed){ensure(allowed.includes(actor),'Bu demo rolü bu işlemi yapamaz.');}
function taskOf(s,id){const t=s.tasks.find(t=>t.id===id);ensure(t,'İş bulunamadı.');return t;}
function sourceFresh(s,t){return s.sources[t.dept].online&&s.now-t.observedAt<=24*hour&&s.now>=t.observedAt;}
export function actionSnapshot(t){return JSON.stringify({title:t.title,action:t.action,source:t.source,owner:t.owner,dependsOn:t.dependsOn,dossier:t.dossier});}
function approvalValid(s,t){return t.approval?.decision==='approved'&&t.approval.version===t.version&&t.approval.snapshot===actionSnapshot(t)&&t.approval.policyVersion===s.policy.version&&t.approval.expires>s.now;}
function reasonFor(s,t){
 if(t.attempts>=s.policy.maxAttempts&&!s.outbox.some(r=>r.key===receiptKey(t)))return 'Deneme sınırı doldu; yönetici müdahalesi gerekli.';
 if(!sourceFresh(s,t))return 'Kaynak çevrimdışı veya veri 24 saatten eski.';
 if(t.confidence<.7||t.comparable===false)return 'Benchmark kanıtı yetersiz; karşılaştırılabilir ek veri gerekli.';
 if(t.dependsOn.some(id=>s.tasks.find(x=>x.eventId===id)?.status!=='done'))return 'Bağımlı işlerin bağımsız kontrolü tamamlanmadı.';
 return null;
}
function route(s,t){
 if(terminal(t)||['running','retry','review'].includes(t.status))return;
 const reason=reasonFor(s,t);
 if(reason){t.status='blocked';t.reason=reason;return;}
 if(t.action!=='internal'&&!approvalValid(s,t)){
   const waiting=s.tasks.filter(x=>x.id!==t.id&&x.status==='approval').length;
   t.status=waiting>=s.policy.queueLimit?'queued':'approval';
   t.reason=waiting>=s.policy.queueLimit?'Sami karar kuyruğu dolu.':'İşlem ve sürüm için demo insan onayı gerekli.';
 }else{t.status='ready';t.reason=null;}
}
function validateEvent(e){
 ensure(e&&/^[a-z0-9-]{1,64}$/.test(e.id)&&DEPARTMENTS.some(d=>d.id===e.dept),'Geçersiz olay veya departman.');
 ensure(typeof e.title==='string'&&e.title.trim().length>5&&e.title.length<=240,'Başlık 6–240 karakter olmalı.');
 ensure(['internal','money','publish','message','employment','contract'].includes(e.action),'Tanımsız işlem reddedildi.');
 ensure(typeof e.source==='string'&&e.source.startsWith('demo:')&&e.source.length<200,'Yalnız demo kaynak kabul edilir.');
 ensure(Number.isFinite(e.ageHours)&&e.ageHours>=0&&Number.isFinite(e.confidence)&&e.confidence>=0&&e.confidence<=1,'Geçersiz veri yaşı veya güven değeri.');
 ensure([1,2,3].includes(e.priority)&&Number.isInteger(e.effort)&&e.effort>=1&&e.effort<=45,'Geçersiz öncelik veya efor.');
 ensure([e.baseline,e.target].every(Number.isFinite)&&['higher','lower'].includes(e.direction)&&typeof e.unit==='string'&&e.unit.length<=20,'Geçersiz KPI.');
 ensure(!e.dependsOn||(Array.isArray(e.dependsOn)&&e.dependsOn.every(id=>typeof id==='string'&&id!==e.id)),'Geçersiz bağımlılık.');
}
function ingest(s,e){
 validateEvent(e);
 const previous=s.events.find(x=>x.id===e.id);
 if(previous){ensure(JSON.stringify(previous)===JSON.stringify(e),'Olay kimliği farklı içerikle tekrar kullanıldı.');return;}
 const dept=DEPARTMENTS.find(d=>d.id===e.dept);
 const t={id:'GM-'+String(s.tasks.length+1).padStart(3,'0'),eventId:e.id,dept:e.dept,title:e.title,action:e.action,source:e.source,owner:dept.owner,manager:'MGR-'+dept.id,reviewer:'BEK-01',version:1,status:'queued',reason:null,priority:e.priority,effort:e.effort,confidence:e.confidence,comparable:e.comparable??true,observedAt:s.now-e.ageHours*hour,dueAt:s.now+(e.priority===1?8:48)*hour,dependsOn:e.dependsOn||[],approval:null,attempts:0,evidence:null,outcome:null,failure:'none',nextAttempt:0,kpi:{baseline:e.baseline,target:e.target,unit:e.unit,direction:e.direction},acceptance:'Sürümlü demo çıktı ve bağımsız BEK-01 kontrolü; etki ayrıca ölçülür.'};
 t.dossier=clone(dossierFor(t));
 const nodes=[...s.tasks,t];
 function visit(id,path=[]){ensure(!path.includes(id),'Döngüsel iş bağımlılığı reddedildi.');const n=nodes.find(x=>x.eventId===id);if(n)for(const dep of n.dependsOn)visit(dep,[...path,id]);}
 visit(t.eventId);
 s.tasks.push(t);s.events.push(clone(e));route(s,t);audit(s,'COO-01','task.created',t.id,dept.owner+' sahibine yönlendirildi.');
}
function receiptKey(t){return t.id+':v'+t.version;}
function deliver(s,t){
 const key=receiptKey(t);
 let receipt=s.outbox.find(r=>r.key===key);
 if(!receipt){receipt={key,reference:'demo://receipt/'+key,version:t.version,taskId:t.id,owner:t.owner,at:s.now,simulated:true,snapshot:actionSnapshot(t)};s.outbox.push(receipt);}
 t.evidence=clone(receipt);t.status='review';t.reason='Demo teslim kaydı oluştu; bağımsız kontrol bekleniyor.';
}
function cycle(s){
 ensure(!s.paused,'Koordinatör durduruldu; önce devam ettirin.');
 normalizeUsage(s);
 let cost=0;
 const loads=Object.fromEntries(DEPARTMENTS.map(d=>[d.id,0]));
 for(const t of s.tasks.filter(t=>['running','retry','review'].includes(t.status)))loads[t.dept]++;
 for(const t of [...s.tasks].sort((a,b)=>a.priority-b.priority||a.dueAt-b.dueAt||a.id.localeCompare(b.id))){
   if(terminal(t))continue;
   if(s.now>t.dueAt)incident(s,'overdue:'+t.id,'SLA aşıldı: '+t.title);
   if(t.status==='review')continue;
   if(t.status==='retry'){
     if(t.nextAttempt>s.now)continue;
     // Reconcile uncertain delivery BEFORE considering a retry.
     if(s.outbox.some(r=>r.key===receiptKey(t))){deliver(s,t);audit(s,'COO-01','delivery.reconciled',t.id,'Kesinti öncesi teslim bulundu; tekrar uygulanmadı.');continue;}
     if(t.attempts>=s.policy.maxAttempts){t.status='blocked';t.reason='Deneme sınırı doldu; yönetici müdahalesi gerekli.';incident(s,'retry:'+t.id,t.reason);continue;}
     loads[t.dept]--;t.status='queued';
   }
   route(s,t);
   if(t.status==='blocked'&&t.attempts>=s.policy.maxAttempts)incident(s,'retry:'+t.id,t.reason);
   if(t.status!=='ready')continue;
   if(loads[t.dept]>=DEPARTMENTS.find(d=>d.id===t.dept).capacity){t.status='queued';t.reason='Ekip kapasitesi dolu; mevcut işler kontrol edilince devam eder.';continue;}
   if(s.usage.daily+t.effort>s.policy.dailyMinutes||s.usage.weekly+t.effort>s.policy.weeklyMinutes||cost+s.policy.taskCost>s.policy.cycleBudget){t.status='queued';t.reason='İnceleme veya çalışma bütçesi sınırında.';continue;}
   t.attempts++;loads[t.dept]++;cost+=s.policy.taskCost;s.usage.daily+=t.effort;s.usage.weekly+=t.effort;s.usage.total+=s.policy.taskCost;
   if(t.failure==='before'){t.status='retry';t.nextAttempt=s.now+hour;t.reason='Demo bağlantı kesintisi; en erken bir saat sonra yeniden denenecek.';}
   else {deliver(s,t);if(t.failure==='after'){t.evidence=null;t.status='retry';t.nextAttempt=s.now+hour;t.reason='Teslim yanıtı kayıp; tekrar öncesi mutabakat yapılacak.';}}
   audit(s,t.owner,'execution.demo',t.id,'Deneme '+t.attempts+' · gerçek harici işlem yok.');
 }
 s.lastSummary={at:s.now,executions:cost,waiting:s.tasks.filter(t=>t.status==='approval').length,blocked:s.tasks.filter(t=>t.status==='blocked').length};
 audit(s,'COO-01','cycle.finished','GM','Demo çalışma turu: '+cost+' işlem.');
}
export function dispatch(state,command){
 ensure(state?.schema===VERSION&&state.mode==='demo','Yalnız geçerli demo durumu işlenebilir.');
 ensure(command&&typeof command.id==='string'&&command.id.length>0&&command.id.length<=120&&ACTORS.includes(command.actor),'Komut kimliği ve bilinen demo rolü gerekli.');
 const previous=state.receipts.find(r=>r.id===command.id);
 if(previous){ensure(previous.body===JSON.stringify(command),'Komut kimliği çakıştı.');return clone(state);}
 ensure(command.expectedRevision===state.revision,'Başka sekmede değişiklik var; güncel durumu yükleyin.');
 const s=clone(state),actor=command.actor,p=command.payload||{};
 const type=command.type;
 if(['seed','ingest','cycle','refresh','clock','source','failure','revise','cancel','retry','resolve'].includes(type))requireActor(actor,['COO-01']);
 switch(type){
 case 'seed':FIXTURES.forEach(e=>ingest(s,e));break;
 case 'ingest':ingest(s,p.event);break;
 case 'cycle':cycle(s);break;
 case 'pause':requireActor(actor,['COO-01','SAMI-DEMO']);ensure(typeof p.paused==='boolean','Duraklama değeri gerekli.');s.paused=p.paused;break;
 case 'clock':ensure(Number.isFinite(p.hours)&&p.hours>0&&p.hours<=168,'Saat ilerlemesi 0–168 saat aralığında olmalı.');s.now+=p.hours*hour;normalizeUsage(s);s.tasks.forEach(t=>route(s,t));break;
 case 'source':ensure(DEPARTMENTS.some(d=>d.id===p.dept)&&typeof p.online==='boolean','Kaynak ve bağlantı durumu gerekli.');s.sources[p.dept].online=p.online;s.tasks.filter(t=>t.dept===p.dept).forEach(t=>route(s,t));break;
 case 'refresh':{const t=taskOf(s,p.taskId);ensure(!terminal(t)&&!['review','retry','running'].includes(t.status),'Teslim edilmiş işin kaynağı değiştirilemez.');ensure(typeof p.reference==='string'&&p.reference.startsWith('demo:'),'Demo kanıt kaynağı gerekli.');t.source=p.reference;t.observedAt=s.now;t.version++;t.approval=null;if(p.comparable===true){t.comparable=true;t.confidence=.85;}route(s,t);break;}
 case 'approve':{
   requireActor(actor,['SAMI-DEMO']);const t=taskOf(s,p.taskId);ensure(!s.paused,'Durdurulmuş sistemde onay işlenemez.');ensure(t.status==='approval'&&p.version===t.version,'Güncel onay bekleyen sürümü seçin.');ensure(['approved','rejected'].includes(p.decision)&&typeof p.note==='string'&&p.note.trim().length>=5,'Karar ve gerekçe gerekli.');
   ensure(!reasonFor(s,t),'Kaynak veya bağımlılık değişti; karar yenilenmeli.');
   t.approval={actor,decision:p.decision,version:t.version,snapshot:actionSnapshot(t),policyVersion:s.policy.version,expires:s.now+s.policy.approvalHours*hour,note:p.note.trim().slice(0,1000)};
   if(p.decision==='rejected'){t.status='rejected';t.reason=p.note;}else route(s,t);break;
 }
 case 'revise':{const t=taskOf(s,p.taskId);ensure(!terminal(t)&&!['review','running','retry'].includes(t.status),'Bu aşamada revizyon yapılamaz.');ensure(typeof p.title==='string'&&p.title.trim().length>5&&p.title.length<=240,'Geçerli başlık gerekli.');t.title=p.title.trim();t.version++;t.approval=null;route(s,t);break;}
 case 'failure':{const t=taskOf(s,p.taskId);ensure(!terminal(t)&&['none','before','after'].includes(p.mode),'Geçersiz hata senaryosu.');t.failure=p.mode;break;}
 case 'retry':{const t=taskOf(s,p.taskId);ensure(t.status==='blocked'&&t.attempts>=s.policy.maxAttempts&&p.note?.trim().length>=5,'Deneme sınırı ve müdahale gerekçesi gerekli.');t.attempts=0;t.failure='none';t.status='queued';route(s,t);break;}
 case 'review':{
   requireActor(actor,['BEK-01']);const t=taskOf(s,p.taskId);ensure(t.status==='review'&&t.evidence&&p.version===t.version,'Güncel teslim kanıtı gerekli.');
   const r=s.outbox.find(r=>r.key===receiptKey(t));ensure(r&&r.reference===t.evidence.reference&&r.version===t.version&&r.owner===t.owner&&r.snapshot===actionSnapshot(t),'Teslim kaydı eşleşmiyor.');
   ensure(['passed','rejected'].includes(p.result)&&p.note?.trim().length>=5,'Kontrol sonucu ve gerekçe gerekli.');
   t.review={actor,result:p.result,note:p.note.trim().slice(0,1000),at:s.now,version:t.version};
   if(p.result==='passed'){t.status='done';t.reason=null;t.completedAt=s.now;t.measureAt=s.now+7*24*hour;}
   else{t.status='queued';t.reason='Kontrol reddetti; yeni sürüm gerekli.';t.version++;t.approval=null;t.evidence=null;t.attempts=0;route(s,t);}break;
 }
 case 'outcome':{const t=taskOf(s,p.taskId);requireActor(actor,['BEK-01']);ensure(t.status==='done'&&s.now>=t.measureAt,'Etki ölçümü için tamamlanma ve 7 günlük dönem gerekli.');ensure(Number.isFinite(p.value)&&typeof p.reference==='string'&&p.reference.startsWith('demo:')&&p.note?.trim().length>=5,'Ölçüm, kaynak ve bağlam gerekli.');t.outcome={value:p.value,reference:p.reference,note:p.note.slice(0,1000),at:s.now,actor};break;}
 case 'cancel':{const t=taskOf(s,p.taskId);ensure(!terminal(t)&&!['review','retry','running'].includes(t.status)&&p.note?.trim().length>=5,'Teslim belirsizken iptal olmaz; gerekçe gerekli.');t.status='cancelled';t.reason=p.note;break;}
 case 'resolve':{const i=s.incidents.find(i=>i.id===p.id);ensure(i&&i.status==='open'&&p.note?.trim().length>=5,'Açık olay ve çözüm gerekçesi gerekli.');const id=i.key.split(':')[1],t=s.tasks.find(t=>t.id===id);ensure(!t||terminal(t),'Kaynak iş çözülmeden olay kapatılamaz.');i.status='resolved';i.resolution=p.note;break;}
 default:throw Error('Tanımsız işlem; yetki genişletme ve canlı işlem desteklenmez.');
 }
 audit(s,actor,type,p.taskId||'GM',p.note?.slice(0,1000)||'Demo komutu işlendi.');s.revision++;s.receipts.push({id:command.id,body:JSON.stringify(command)});return s;
}
export function summary(s){const completed=s.tasks.filter(t=>t.status==='done');return {total:s.tasks.length,completed:completed.length,approvals:s.tasks.filter(t=>t.status==='approval').length,blocked:s.tasks.filter(t=>t.status==='blocked').length,overdue:s.tasks.filter(t=>!terminal(t)&&s.now>t.dueAt).length,measured:completed.filter(t=>t.outcome).length,successful:completed.filter(t=>t.outcome&&(t.kpi.direction==='lower'?t.outcome.value<=t.kpi.target:t.outcome.value>=t.kpi.target)).length,remaining:Math.max(0,s.policy.dailyMinutes-s.usage.daily)};}
export function managementBrief(s){const k=summary(s);return ['OTOTR GM Koordinatör · SENTETİK DEMO',new Date(s.now).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}),`${k.total} iş · ${k.completed} doğrulandı · ${k.approvals} karar bekliyor · ${k.blocked} engelli`,`${k.measured} etki ölçümü · ${k.successful} hedef karşılandı · ${k.overdue} gecikmiş iş`,`Günlük inceleme: ${s.usage.daily}/${s.policy.dailyMinutes} dk`,...s.tasks.filter(t=>!terminal(t)).map(t=>`${t.id} · ${t.owner} · ${STATUS[t.status]} · ${t.title}${t.reason?' — '+t.reason:''}`),'Gerçek mesaj, yayın, para veya personel işlemi yapılmamıştır.'].join('\n');}
// Persist commands, not mutable business state; rebuild all derived state on load.
export function replay(log){ensure(log?.schema===VERSION&&Number.isFinite(log.start)&&Array.isArray(log.commands)&&log.commands.length<=5000,'Kayıt biçimi geçersiz.');let s=createDemo(log.start);for(const c of log.commands)s=dispatch(s,c);return s;}
