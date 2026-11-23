export const sourceDefinitions=[
 {id:'franchise',name:'Franchise ve Finans devri',scope:'Yetkili ERP kapsamı',href:'franchise-specialist.html',fields:['case_count','approvals','finance_pending','finance_failed','finance_processed']},
 {id:'reviews',name:'Yorum yanıtları',scope:'Nilüfer bağlantısı · tüm şubeler değil',href:'review-team.html',fields:['preparing','waiting','human','published']},
 {id:'demo',name:'Kurgusal aday akışı',scope:'Bu yöneticiye ait demo kayıtlar',href:'franchise-specialist.html#web-demo-tasks',fields:[]}
];
export function validateSource(id,value){
 const def=sourceDefinitions.find(d=>d.id===id);if(!def||!value||typeof value!=='object')return false;
 if(id==='demo')return Array.isArray(value.tasks)&&value.tasks.every(t=>typeof t.task_id==='string'&&Number.isInteger(t.workflow_step)&&t.workflow_step>=0&&t.workflow_step<=4);
 return def.fields.every(f=>Number.isSafeInteger(value[f])&&value[f]>=0);
}
export function sourceState(id,value,receivedAt,now=Date.now(),error=null){
 const valid=validateSource(id,value),age=now-receivedAt;
 return {id,value:valid?value:null,receivedAt,status:error||!valid?'unavailable':!Number.isFinite(age)||age<0||age>180000?'stale':'verified'};
}
export function controlSummary(sources,now=Date.now()){
 const list=sourceDefinitions.map(d=>({...d,...sourceState(d.id,sources[d.id]?.value,sources[d.id]?.receivedAt,now,sources[d.id]?.error)}));
 const internal=[],decisions=[],demo=[];
 for(const s of list){
  if(s.status!=='verified'){internal.push({id:`source:${s.id}`,priority:1,title:`${s.name}: bağlantı ${s.status==='stale'?'eski':'doğrulanamadı'}`,owner:'Teknik sorumlu → ilgili yönetici',next:'Veriyi yeniden doğrula; bilinmeyen sayıları sıfır kabul etme.',href:s.href});continue;}
  if(s.id==='franchise'){
   if(s.value.finance_failed)internal.push({id:'finance:failure',priority:1,title:`${s.value.finance_failed} Finans devri inceleme bekliyor`,owner:'Finans yöneticisi',next:'Hata kaydını ve devir kimliğini incele; tekrar tahsilat oluşturma.',href:s.href});
   if(s.value.finance_pending)internal.push({id:'finance:pending',priority:2,title:`${s.value.finance_pending} Finans devri bekliyor`,owner:'Franchise ve Finans yöneticileri',next:'Alıcı kabulünü ve bekleme nedenini kontrol et. Süre hedefi doğrulanmadı; gecikme varsayılmaz.',href:s.href});
   if(s.value.approvals)decisions.push({id:'franchise:board',priority:2,title:`${s.value.approvals} kurul kaydı onay bekliyor`,owner:'Yetkili kurul',next:'Yetkili karar ekranından incele. Bu sayı kişisel Sami kuyruğu değildir.',href:s.href});
  }
  if(s.id==='reviews'&&s.value.human)internal.push({id:'reviews:human',priority:2,title:`${s.value.human} yorum insan incelemesi bekliyor`,owner:'Yorum sorumlusu',next:'İlgili yorumları incele; toplu veya otomatik onay verme.',href:s.href});
  if(s.id==='demo')for(const t of s.value.tasks.filter(t=>t.workflow_step===4))demo.push({id:`demo:${t.task_id}`,title:'Örnek aday: iki karar başlığı',href:s.href});
 }
 internal.sort((a,b)=>a.priority-b.priority);decisions.sort((a,b)=>a.priority-b.priority);
 return {sources:list,internal,decisions:decisions.slice(0,10),demo,complete:list.every(s=>s.status==='verified'),checkedAt:now,
 budget:{queueLimit:10,dailyMinutes:45,weeklyMinutes:840,globalQueueVerified:false},
 message:list.every(s=>s.status==='verified')?'Bağlı kaynaklar okundu. Tüm ERP kapsamı değildir.':'Bazı kaynaklar doğrulanamadı; genel durum bilinmiyor.'};
}
export function managerBrief(summary){return ['OTOTR · Koordinatör durum özeti',new Date(summary.checkedAt).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'}),summary.message,
 'Bağlantı kapsamı: '+summary.sources.map(s=>`${s.name}: ${s.status} (${s.scope})`).join('; '),
 'Yöneticide çözülecek: '+(summary.internal.map(i=>`${i.title} / ${i.owner} / ${i.next}`).join('\n')||'Bağlı kaynaklarda işaretlenen kayıt yok.'),
 'Yetkili karar incelemesi: '+(summary.decisions.map(i=>i.title).join('; ')||'Bağlı kaynaklarda işaretlenen kayıt yok.'),
 `Demo: ${summary.demo.length} aday; gerçek işlerle birleştirilmedi.`,
 'Bilinmeyenler: genel Sami kuyruğu, çalışan görev olayları ve harcanan inceleme süresi henüz ortak kaynağa bağlı değil.',
 'Sonraki iş: kaynak eksiklerini yöneticilerle doğrula; ortak görev kabul ve tamamlanma kanıtını bağla.',
 'Bu dosya okuma anının özetidir; arka plan çalışanı veya dışarı gönderilmiş rapor değildir.'
 ].join('\n\n');}
