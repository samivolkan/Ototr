export const sourceDefinitions=[
 {id:'delivery',name:'TASK2 teslim ve inceleme',scope:'Mevcut oturum kapsamı · kanıt içeriği ve kişi bilgisi içermez',href:'../isler/',fields:['total','not_submitted','submitted','rejected','reviewed','closed','stale','unverified_done']},
 {id:'franchise',name:'Franchise ve Finans devri',scope:'Yetkili ERP kapsamı',href:'franchise-specialist.html',fields:['case_count','approvals','finance_pending','finance_failed','finance_processed']},
 {id:'reviews',name:'Yorum yanıtları',scope:'Nilüfer bağlantısı · tüm şubeler değil',href:'review-team.html',fields:['preparing','waiting','human','published']},
 {id:'demo',name:'Kurgusal aday akışı',scope:'Bu yöneticiye ait demo kayıtlar',href:'franchise-specialist.html#web-demo-tasks',fields:[]},
 {id:'work',name:'Eski İşler v24 kayıtları',scope:'Eski kaynak · yeni TASK2 panosunu kapsamaz · kişi bilgisi içermez',href:'#legacy-work-source',fields:['total','open','in_progress','reported_done','owner_missing','owner_unresolved','past_due','due_missing','due_invalid','unknown_status']},
 {id:'task2',name:'TASK2 güncel görev panosu',scope:'Mevcut oturumun TASK2 kapsamı · kişi bilgisi içermez',href:'../isler/',fields:['accepted_open','acceptance_pending','acceptance_unavailable','review_pending','archived','total','open','in_progress','reported_done','owner_missing','owner_unresolved','past_due','due_missing','due_invalid','unknown_status']}
];
export function validateSource(id,value){
 const def=sourceDefinitions.find(d=>d.id===id);if(!def||!value||typeof value!=='object')return false;
 if(id==='delivery')return value.source==='task2_delivery'&&value.scope==='current_user_scope'&&Number.isFinite(Date.parse(value.observed_at))&&def.fields.every(f=>Number.isSafeInteger(value[f])&&value[f]>=0)&&['not_submitted','submitted','rejected','reviewed','closed','stale'].reduce((n,k)=>n+value[k],0)===value.total&&value.unverified_done<=value.total-value.closed;
 if(id==='demo')return Array.isArray(value.tasks)&&value.tasks.every(t=>typeof t.task_id==='string'&&Number.isInteger(t.workflow_step)&&t.workflow_step>=0&&t.workflow_step<=4);
 if(['work','task2'].includes(id)&&(value.source!==(id==='task2'?'task2':'isler24')||value.scope!=='current_user_scope'||value.acceptance_supported!==(id==='task2')||value.evidence_supported!==false||!Number.isFinite(Date.parse(value.observed_at))))return false;
 if(!def.fields.every(f=>Number.isSafeInteger(value[f])&&value[f]>=0))return false;
 if(['work','task2'].includes(id))return (id!=='task2'||(value.review_pending<=value.open&&value.accepted_open+value.acceptance_pending+value.acceptance_unavailable===value.open&&value.acceptance_unavailable===value.owner_missing+value.owner_unresolved))&& value.open+value.reported_done+value.unknown_status===value.total&&['in_progress','owner_missing','owner_unresolved','past_due','due_missing','due_invalid'].every(k=>value[k]<=value.open)&&value.owner_missing+value.owner_unresolved<=value.open;
 return true;
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
  if(s.id==='delivery'){
   for(const [key,label,next] of [['submitted','teslim bağımsız inceleme bekliyor','Kanıtı teslim eden kişiden farklı yetkili yönetici incelemeli.'],['rejected','iş düzeltme bekliyor','Çalışan inceleme gerekçesine göre yeniden teslim etmeli.'],['reviewed','iş yönetici kapanışı bekliyor','Güncel teslim ve incelemeyi doğrulayarak işi kapat.'],['stale','teslimin kaynak durumu değişmiş','Eski onayı kullanma; güncel görev ve teslimi incele.'],['unverified_done','bitti işaretli işte doğrulanmış kapanış yok','Bitti işaretini onay sayma; kanıtlı teslim akışını tamamla.']])if(s.value[key])internal.push({id:`delivery:${key}`,priority:2,title:`${s.value[key]} ${label}`,owner:'İlgili yönetici',next,href:s.href});
  }
  if(s.id==='franchise'){
   if(s.value.finance_failed)internal.push({id:'finance:failure',priority:1,title:`${s.value.finance_failed} Finans devri inceleme bekliyor`,owner:'Finans yöneticisi',next:'Hata kaydını ve devir kimliğini incele; tekrar tahsilat oluşturma.',href:s.href});
   if(s.value.finance_pending)internal.push({id:'finance:pending',priority:2,title:`${s.value.finance_pending} Finans devri bekliyor`,owner:'Franchise ve Finans yöneticileri',next:'Alıcı kabulünü ve bekleme nedenini kontrol et. Süre hedefi doğrulanmadı; gecikme varsayılmaz.',href:s.href});
   if(s.value.approvals)decisions.push({id:'franchise:board',priority:2,title:`${s.value.approvals} kurul kaydı onay bekliyor`,owner:'Yetkili kurul',next:'Yetkili karar ekranından incele. Bu sayı kişisel Sami kuyruğu değildir.',href:s.href});
  }
  if(s.id==='reviews'&&s.value.human)internal.push({id:'reviews:human',priority:2,title:`${s.value.human} yorum insan incelemesi bekliyor`,owner:'Yorum sorumlusu',next:'İlgili yorumları incele; toplu veya otomatik onay verme.',href:s.href});
  if(s.id==='demo')for(const t of s.value.tasks.filter(t=>t.workflow_step===4))demo.push({id:`demo:${t.task_id}`,title:'Örnek aday: iki karar başlığı',href:s.href});
  if(['work','task2'].includes(s.id)){
   if(s.id==='task2'&&s.value.acceptance_pending)internal.push({id:'task2:acceptance',priority:2,title:`${s.value.acceptance_pending} görevde çalışan kabulü bekleniyor`,owner:'İlgili yönetici',next:'Atanmış çalışan görev detayından mevcut sürümü kabul etmeli. Bu durum gecikme veya performans puanı değildir.',href:s.href});
   if(s.id==='task2'&&s.value.review_pending)internal.push({id:'task2:review',priority:2,title:`${s.value.review_pending} TASK2 teslimi inceleme bekliyor`,owner:'İlgili yönetici',next:'Kaynakta teslimi incele. Review durumu yönetici kabulü veya bağımsız denetim kanıtı değildir.',href:s.href});
   const rows=[['owner_missing','sorumlusu belirtilmemiş açık iş','İş yöneticisi','Mevcut iş ekranında tek sorumluyu belirle.'],['owner_unresolved','sorumlu eşlemesi doğrulanamayan açık iş','İş yöneticisi','Aktif kullanıcı ve iş kapsamı eşlemesini kontrol et.'],['past_due','planlanan tarihi geçmiş açık iş','İlgili yönetici','Vardiya, izin, müşteri veya sistem beklemesini incele; kişi performansı sonucu çıkarma.'],['due_invalid','tarih kaydı doğrulanamayan açık iş','İş yöneticisi','Kaynakta geçerli tarihi kontrol et.'],['unknown_status','durumu tanınmayan iş','Teknik sorumlu','Kaynak sözleşmesini doğrula; tamamlandı varsayma.']];
   for(const[key,label,owner,next]of rows)if(s.value[key])internal.push({id:`${s.id}:${key}`,priority:key==='unknown_status'?1:2,title:`${s.name}: ${s.value[key]} ${label}`,owner,next,href:s.href});
  }
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
 'Eski İşler v24 (TASK2 hariç): '+(summary.sources.find(s=>s.id==='work'&&s.status==='verified')?.value.open??'doğrulanamadı')+' açık iş. Kabul, teslim kanıtı ve bağımsız denetim bu kaynaktan doğrulanmıyor.',
 'TASK2 çalışan kabulü: '+(summary.sources.find(s=>s.id==='task2'&&s.status==='verified')?.value.accepted_open??'doğrulanamadı')+' açık iş üstlenildi. Teslim ve yönetici onayı değildir.',
 'Bilinmeyenler: genel Sami kuyruğu, diğer kaynakların görev kabul olayları ve harcanan inceleme süresi henüz ortak kaynağa bağlı değil.',
 'Sonraki iş: kaynak eksiklerini yöneticilerle doğrula; ortak görev kabul ve tamamlanma kanıtını bağla.',
 'Bu dosya okuma anının özetidir; arka plan çalışanı veya dışarı gönderilmiş rapor değildir.'
 ].join('\n\n');}
