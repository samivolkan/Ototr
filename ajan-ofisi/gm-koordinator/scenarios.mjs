import {createDemo,dispatch,FIXTURES,replay,summary,managementBrief} from './model.mjs';
const assert=(value,message='Beklenen koşul sağlanmadı')=>{if(!value)throw Error(message);};
const throws=fn=>{let failed=false;try{fn();}catch{failed=true;}assert(failed,'Geçersiz işlem kabul edildi');};
function rig(){let s=createDemo(),seq=0;const commands=[];return {get state(){return s;},get commands(){return commands;},send(type,payload={},actor='COO-01'){const c={id:'cmd-'+(++seq),actor,type,payload,expectedRevision:s.revision};s=dispatch(s,c);commands.push(c);return s;},seed(){this.send('seed');return this;},find(id){return s.tasks.find(t=>t.eventId===id);},approve(id){const t=this.find(id);this.send('approve',{taskId:t.id,version:t.version,decision:'approved',note:'Demo kapsamı ve kanıtı incelendi.'},'SAMI-DEMO');},reviewAll(){for(const t of s.tasks.filter(t=>t.status==='review'))this.send('review',{taskId:t.id,version:t.version,result:'passed',note:'Demo teslim kaydı bağımsız kontrol edildi.'},'BEK-01');}};}
const cases=[
 ['Yedi ekibe tekil sahiplik',()=>{const r=rig().seed();assert(r.state.tasks.length===10);assert(new Set(r.state.tasks.map(t=>t.dept)).size===7);assert(r.state.tasks.every(t=>t.owner!==t.reviewer&&t.acceptance));}],
 ['Tekrar olay yeni iş açmaz',()=>{const r=rig().seed();r.send('seed');assert(r.state.tasks.length===10);}],
 ['Aynı olay kimliği farklı içerikle reddedilir',()=>{const r=rig().seed();throws(()=>r.send('ingest',{event:{...FIXTURES[0],title:'Farklı başlık'}}));assert(r.state.tasks.length===10);}],
 ['Komut tekrarı aynı sonucu verir',()=>{const r=rig().seed(),s=dispatch(r.state,r.commands[0]);assert(s.revision===r.state.revision&&s.tasks.length===10);}],
 ['Komut kimliği çakışması reddedilir',()=>{const r=rig().seed();throws(()=>dispatch(r.state,{...r.commands[0],type:'cycle'}));}],
 ['Eski sekme sürümü yazamaz',()=>{const r=rig().seed();throws(()=>dispatch(r.state,{id:'stale',actor:'COO-01',type:'cycle',expectedRevision:0}));}],
 ['Uzman insan onayı veremez',()=>{const r=rig().seed(),t=r.find('collection');throws(()=>r.send('approve',{taskId:t.id,version:t.version,decision:'approved',note:'Deneme onay'},'FIN-02'));}],
 ['Koordinatör kendi onayını veremez',()=>{const r=rig().seed();throws(()=>r.send('approve',{taskId:r.find('blog').id,version:1,decision:'approved',note:'Kendi onayı'}));}],
 ['Onaysız harici işlem yürütülmez',()=>{const r=rig().seed();r.send('cycle');assert(['collection','blog','review'].every(id=>r.find(id).status==='approval'));assert(r.state.outbox.every(o=>!['GM-003','GM-005','GM-006'].includes(o.taskId)));}],
 ['Eski veri ve zayıf benchmark engellenir',()=>{const r=rig().seed();r.send('cycle');assert(r.find('stale').status==='blocked'&&r.find('benchmark').status==='blocked');}],
 ['Bağımlılık bitmeden franchise başlamaz',()=>{const r=rig().seed();r.send('cycle');assert(r.find('opening').status==='blocked');}],
 ['Revizyon eski onayı iptal eder',()=>{const r=rig().seed();r.approve('blog');r.send('revise',{taskId:r.find('blog').id,title:'Güncellenmiş demo blog başlığı'});assert(r.find('blog').status==='approval'&&!r.find('blog').approval);}],
 ['Eski onay sürümü kabul edilmez',()=>{const r=rig().seed(),t=r.find('blog');r.send('revise',{taskId:t.id,title:'Revize edilmiş demo başlık'});throws(()=>r.send('approve',{taskId:t.id,version:1,decision:'approved',note:'Eski sürüm onayı'},'SAMI-DEMO'));}],
 ['Süresi dolan onay kullanılamaz',()=>{const r=rig().seed();r.approve('blog');r.send('clock',{hours:25});r.send('cycle');assert(!r.state.outbox.some(o=>o.taskId===r.find('blog').id));}],
 ['Reddedilen iş yeniden çalıştırılmaz',()=>{const r=rig().seed();r.send('approve',{taskId:r.find('blog').id,version:1,decision:'rejected',note:'İçerik kapsamı uygun değil'},'SAMI-DEMO');r.send('cycle');assert(r.find('blog').status==='rejected');}],
 ['Bağımsız olmayan kontrol reddedilir',()=>{const r=rig().seed();r.send('cycle');const t=r.find('complaint');throws(()=>r.send('review',{taskId:t.id,version:t.version,result:'passed',note:'Kendi teslimim'},t.owner));}],
 ['Teslimsiz iş kapanamaz',()=>{const r=rig().seed();throws(()=>r.send('review',{taskId:r.find('complaint').id,version:1,result:'passed',note:'Kanıtsız kapatma'},'BEK-01'));}],
 ['Kontrol reddi yeni sürüm oluşturur',()=>{const r=rig().seed();r.send('cycle');const t=r.find('complaint');r.send('review',{taskId:t.id,version:1,result:'rejected',note:'Teslim yeniden hazırlanmalı'},'BEK-01');assert(r.find('complaint').version===2&&!r.find('complaint').evidence);r.send('cycle');assert(r.find('complaint').evidence.version===2);}],
 ['Teslim sonrası kesinti mükerrer uygulama yapmaz',()=>{const r=rig().seed(),t=r.find('complaint');r.send('failure',{taskId:t.id,mode:'after'});r.send('cycle');assert(r.find('complaint').status==='retry');r.send('clock',{hours:1});r.send('cycle');assert(r.find('complaint').status==='review');assert(r.state.outbox.filter(o=>o.taskId===t.id).length===1);assert(r.find('complaint').attempts===1);}],
 ['Tekrar deneme saati beklenir',()=>{const r=rig().seed(),t=r.find('complaint');r.send('failure',{taskId:t.id,mode:'before'});r.send('cycle');r.send('cycle');assert(r.find('complaint').attempts===1);}],
 ['Üç hata sonrası sınırsız döngü engellenir',()=>{const r=rig().seed(),t=r.find('complaint');r.send('failure',{taskId:t.id,mode:'before'});for(let i=0;i<6;i++){r.send('cycle');r.send('clock',{hours:1});}assert(r.find('complaint').attempts===3&&r.find('complaint').status==='blocked');}],
 ['Yönetici müdahalesiyle toparlanma',()=>{const r=rig().seed(),t=r.find('complaint');r.send('failure',{taskId:t.id,mode:'before'});for(let i=0;i<4;i++){r.send('cycle');r.send('clock',{hours:1});}r.send('retry',{taskId:t.id,note:'Demo bağlantı düzeltildi'});r.send('cycle');assert(r.find('complaint').status==='review');}],
 ['Durdurma yeni yürütmeyi engeller',()=>{const r=rig().seed();r.send('pause',{paused:true});throws(()=>r.send('cycle'));assert(r.state.outbox.length===0);r.send('pause',{paused:false});r.send('cycle');assert(r.state.outbox.length>0);}],
 ['Çevrimdışı kaynak güvenli durur',()=>{const r=rig().seed();r.approve('collection');r.send('source',{dept:'FIN',online:false});r.send('cycle');assert(r.find('collection').status==='blocked');r.send('source',{dept:'FIN',online:true});r.send('cycle');assert(r.find('collection').status==='review');}],
 ['Bağlantı dönüşü eski veriyi güncel yapmaz',()=>{const r=rig().seed();r.send('source',{dept:'FIN',online:false});r.send('source',{dept:'FIN',online:true});assert(r.find('stale').status==='blocked');}],
 ['Karar kuyruğu 10 ile sınırlı',()=>{const r=rig();for(let i=0;i<14;i++)r.send('ingest',{event:{...FIXTURES[4],id:'blog-'+i}});assert(summary(r.state).approvals===10);assert(r.state.tasks.filter(t=>t.status==='queued').length===4);}],
 ['Ekip kapasitesi aşılamaz',()=>{const r=rig();for(let i=0;i<5;i++)r.send('ingest',{event:{...FIXTURES[0],id:'com-'+i}});r.send('cycle');assert(r.state.tasks.filter(t=>t.status==='review').length===2);r.send('cycle');assert(r.state.tasks.filter(t=>t.status==='review').length===2);}],
 ['Günlük inceleme bütçesi korunur',()=>{const r=rig();for(let i=0;i<7;i++)r.send('ingest',{event:{...FIXTURES[0],id:'budget-'+i,dept:['FIN','HR','COM','REV','SALE','FRA','SEO'][i],effort:10}});r.send('cycle');assert(r.state.usage.daily===40);assert(r.state.tasks.filter(t=>t.status==='review').length===4);}],
 ['Türkiye günü değişince günlük bütçe sıfırlanır',()=>{const r=rig().seed();r.send('cycle');assert(r.state.usage.daily>0);r.send('clock',{hours:24});assert(r.state.usage.daily===0&&r.state.usage.weekly>0);}],
 ['Etki ölçümü erken yapılamaz',()=>{const r=rig().seed();r.send('cycle');r.reviewAll();throws(()=>r.send('outcome',{taskId:r.find('complaint').id,value:22,reference:'demo:measure',note:'Erken ölçüm'},'BEK-01'));}],
 ['Geciken iş için tek açık olay',()=>{const r=rig().seed();r.send('clock',{hours:10});r.send('cycle');r.send('cycle');assert(r.state.incidents.filter(i=>i.key==='overdue:'+r.find('complaint').id).length===1);}],
 ['Canlı kaynak ve bilinmeyen işlem reddedilir',()=>{const r=rig();throws(()=>r.send('ingest',{event:{...FIXTURES[0],source:'live:customer'}}));throws(()=>r.send('payment'));throws(()=>r.send('policy'));assert(r.state.tasks.length===0);}],
 ['Geçersiz sayı ve veri şeması reddedilir',()=>{const r=rig();throws(()=>r.send('ingest',{event:{...FIXTURES[0],confidence:NaN}}));throws(()=>r.send('ingest',{event:{...FIXTURES[0],effort:-2}}));throws(()=>r.send('clock',{hours:-1}));}],
 ['Günlükten yeniden oluşturma tutarlı',()=>{const r=rig().seed();r.send('cycle');const s=replay({schema:1,start:createDemo().now,commands:r.commands});assert(JSON.stringify(s)===JSON.stringify(r.state));throws(()=>replay({schema:9,start:0,commands:[]}));}],
 ['Tam akış: 10 iş, 3 karar, kontrol ve etki',()=>{
   const r=rig().seed();for(const id of ['collection','blog','review'])r.approve(id);
   for(const id of ['stale','benchmark'])r.send('refresh',{taskId:r.find(id).id,reference:'demo:validated/'+id,comparable:true});
   for(let i=0;i<4;i++){r.send('cycle');r.reviewAll();}
   assert(summary(r.state).completed===10,'Bütün demo işler kapanmadı');assert(r.state.outbox.length===10,'Mükerrer veya eksik teslim');
   r.send('clock',{hours:168});const t=r.find('complaint');r.send('outcome',{taskId:t.id,value:23,reference:'demo:week-1',note:'Demo dönem ölçümü; diğer etkiler ayrıştırılmadı.'},'BEK-01');
   assert(summary(r.state).successful===1);assert(managementBrief(r.state).includes('SENTETİK DEMO'));
 }]
];
export const acceptanceCases=cases;
export function runAcceptance(){return cases.map(([name,fn])=>{try{fn();return {name,pass:true,detail:'Beklenen sonuç doğrulandı.'};}catch(e){return {name,pass:false,detail:e.message};}});}
