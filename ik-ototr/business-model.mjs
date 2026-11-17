export const UNITS=['Genel Merkez','Nilüfer','Gebze','İnegöl'];
export const ORGANIZATION=[
 ['yk','Yönetim Kurulu','', 'Yönetim Kurulu Başkanı'],['ceo','CEO Ofisi','yk','CEO / Genel Müdür'],
 ['muh','Muhasebe ve Finans','ceo','Yeminli Müşavir'],['bt','Bilgi Teknolojileri','ceo','Bilgi Teknolojileri Sorumlusu'],
 ['huk','Hukuk ve Uyum','ceo','Sorumlu Avukat'],['fyb','Franchise ve Şube Geliştirme','ceo','Franchise ve Şube Geliştirme Sorumlusu'],
 ['pzr','Marka ve Pazarlama','ceo','Marka ve Pazarlama Sorumlusu'],['smd','Sosyal Medya ve İçerik','pzr','Sosyal Medya ve İçerik Sorumlusu'],
 ['saha','Saha Satış','fyb','Saha Satış Sorumlusu'],['ik','İK Operasyon Merkezi','ceo','İK Operasyon Sorumlusu'],
 ['tek','Teknik Kalite ve Akademi','ceo','Teknik Kalite ve Akademi Sorumlusu'],['aka','Akademi','tek','Akademi Sorumlusu'],['sube','Şube Ağı (Franchise)','fyb','Şube Ağı Sorumlusu']
].map(([id,title,parent,position])=>({id,title,parent,position,capacity:1,occupied:1}));
export const COURSES=[
 {id:'motor',title:'Motor ve mekanik',skill:'Motor',lessons:['Motor güvenliği: soğutma ve hareketli parçalara temas öncesi güvenli duruş sağlanır.','Ölçüm: cihazın kalibrasyonu ve prosedür uygunluğu kontrol edilir.','Rapor: bulgu kanıtla ilişkilendirilir; hazırlayan kişi kendi raporunu onaylamaz.'],questions:[['İnceleme öncesi ilk adım?','Güvenli duruş','Motoru zorlamak','Ölçümü atlamak'],['Ölçüm cihazında ne kontrol edilir?','Rengi','Kalibrasyon geçerliliği','Marka etiketi'],['Raporu kim onaylamalı?','Hazırlayan','Müşteri','Farklı yetkili kişi']]},
 {id:'kaporta',title:'Kaporta ve boya',skill:'Kaporta',lessons:['Ölçüm cihazının kalibrasyonunu ve yüzey uygunluğunu kontrol edin.','Tek ölçümle karar vermeyin; bölgeleri karşılaştırıp kanıt kaydedin.','Belirsiz bulguyu kesin hüküm olarak sunmayın; teknik onaya gönderin.'],questions:[['İlk kontrol?','Kalibrasyon','Araç fiyatı','Müzik'],['Bulgu nasıl desteklenir?','Tahminle','Karşılaştırma ve kanıtla','Sadece sözle'],['Belirsiz bulgu?','Silinir','Kesin hasar yazılır','Teknik onaya gönderilir']]},
 {id:'isg',title:'İş sağlığı ve güvenliği',skill:'İSG',lessons:['Çalışma öncesi riskleri belirleyip uygun kişisel koruyucuyu kullanın.','Acil çıkışları açık tutun; tehlikeli ekipmanı kullanımdan ayırın.','Olayı kayıt altına alıp sorumluya bildirin; demo sınavı resmî eğitim belgesi değildir.'],questions:[['İlk adım?','Risk kontrolü','İşe hemen başlamak','Uyarıyı kapatmak'],['Arızalı cihaz?','Kullanılır','Kullanımdan ayrılır','Gizlenir'],['Olay sonrası?','Kayıt silinir','Yalnızca beklenir','Kayıt ve bildirim yapılır']]}
];
export const CHECKLISTS={onboarding:['Özlük evrakı kontrolü','Sözleşme / SGK demo kontrolü','İSG eğitimi','Göreve uygun sertifika','Ekipman teslimi','ERP hesabı hazırlık kontrolü','Deneme süresi değerlendirmesi'],offboarding:['Ayrılış tarihi ve gerekçesi','İhbar / SGK demo kontrolü','Zimmetlerin iadesi','Açık taleplerin mutabakatı','Görev devri','ERP hesabı kapatma kontrolü','İzin / ücret mutabakatı','Çıkış görüşmesi']};
export const LABELS={draft:'Taslak',requested:'Kaynak onayı',source_approved:'Hedef onayı',target_approved:'Merkez onayı',approved:'Onaylandı',rejected:'Reddedildi',completed:'Tamamlandı',enrolled:'Eğitimde',passed:'Başarılı',failed:'Tekrar gerekli',pending:'Bekliyor',submitted:'Teknik onayda',published:'Yayında',revision:'Revizyonda',acknowledged:'Demo alıcı doğruladı',active:'Aktif',archived:'Arşiv'};
export function validDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||'')||new Date(v).toISOString().slice(0,10)!==v)throw Error('Geçerli tarih girin.');return v;}
const text=(v,label)=>{if(!String(v||'').trim())throw Error(label+' zorunludur.');return String(v).trim();};
export function treeValid(nodes){const map=new Map(nodes.map(n=>[n.id,n]));if(map.size!==nodes.length)throw Error('Yinelenen birim.');for(const n of nodes){text(n.title,'Birim adı');text(n.position,'Sorumlu pozisyon');if(!Number.isInteger(n.occupied)||n.occupied<0||!Number.isInteger(n.capacity)||n.capacity<1||n.capacity<n.occupied)throw Error('Kadro dolu sayının altında olamaz.');let p=n.parent;const seen=new Set([n.id]);while(p){if(!map.has(p)||seen.has(p))throw Error('Organizasyon bağlantısı eksik veya döngülü.');seen.add(p);p=map.get(p).parent;}}return true;}
export function eligible(records,employeeId,skill,today){return records.some(r=>r.kind==='enrollment'&&r.employee_id===employeeId&&r.state==='passed'&&r.payload.skill===skill&&r.payload.validUntil>=today);}
export function effectiveAssignments(records,unit,today){return records.filter(r=>r.kind==='assignment'&&r.to_unit===unit&&r.state==='approved'&&r.payload.start<=today&&r.payload.end>=today);}
export function initialRecords(employees,today='2026-11-18'){
 const row=(id,kind,unit,payload,employee_id=null,state='draft')=>({id,kind,unit,employee_id,to_unit:null,payload,state,revision:1,created_by:'demo-seed'});
 const rows=[row('org-main','organization','Genel Merkez',{nodes:structuredClone(ORGANIZATION)},null,'active')];
 for(const [i,unit]of UNITS.entries()){
  const team=employees.filter(e=>e.branch===unit);
  for(const [j,e]of team.entries())rows.push(row(`position-${i}-${j}`,'position',unit,{title:e.title,department:e.department,capacity:j===2?2:1},null,'active'));
  if(!team.length)continue;
  rows.push(row(`academy-${i}`,'enrollment',unit,{course:'motor',skill:'Motor',lessons:[0,1,2],score:100,attempts:1,issued:today,validUntil:'2027-11-18'},team[1]?.id||team[0].id,'passed'));
  rows.push(row(`onboarding-${i}`,'lifecycle',unit,{type:'onboarding',date:today,reason:'Kurgusal işe giriş kontrolü',checks:CHECKLISTS.onboarding.map(()=>false)},team[2]?.id||team[0].id,'draft'));
  rows.push(row(`calibration-${i}`,'calibration',unit,{title:'Demo ölçüm cihazı',skill:'Motor',validUntil:'2027-11-18',reference:'DEMO-KAL-'+i},null,'active'));
 }
 return rows;
}
// Offline synthetic acceptance engine. Hosted actions are independently enforced by SQL RPCs.
export function transition(record,action,input,context){
 const r=structuredClone(record),p=r.payload,c=context;
 const manage=unit=>c.headquarters||c.writeUnits.includes(unit);
 if(!manage(r.unit)&&!(r.kind==='assignment'&&manage(r.to_unit)))throw Error('İşlem yetkisi yok.');
 if(action==='reject'){if(!['requested','source_approved','target_approved','submitted','pending'].includes(r.state))throw Error('İşlem bu durumda reddedilemez.');p.reason=text(input.reason,'Gerekçe');r.state='rejected';}
 else if(r.kind==='organization'&&action==='edit'){if(!c.headquarters)throw Error('Merkez yetkisi gerekir.');treeValid(input.nodes);r.payload={nodes:structuredClone(input.nodes)};}
 else if(r.kind==='position'&&action==='edit'){const occupied=c.employees.filter(e=>e.branch===r.unit&&e.title===input.title&&e.status==='active').length;const capacity=Number(input.capacity);if(!Number.isInteger(capacity)||capacity<occupied||capacity<1)throw Error('Kadro aktif çalışan sayısından az olamaz.');r.payload={title:text(input.title,'Pozisyon'),department:text(input.department,'Departman'),capacity};}
 else if(r.kind==='assignment'){
  if(action==='approve'){
   const stage={requested:['source_approved',r.unit],source_approved:['target_approved',r.to_unit],target_approved:['approved','Genel Merkez']}[r.state];
   if(!stage||!manage(stage[1])||(stage[1]==='Genel Merkez'&&!c.headquarters))throw Error('Bu onay aşaması için yetki yok.');
   if(c.actor===r.created_by&&r.state==='requested'||p.sourceActor===c.actor&&r.state==='source_approved')throw Error('Ayrı onaylayan gerekir.');
   if(r.state==='target_approved'&&!eligible(c.records,r.employee_id,p.skill,p.end))throw Error('Geçerli mesleki sertifika gerekir.');
   if(r.state==='requested')p.sourceActor=c.actor;if(r.state==='source_approved')p.targetActor=c.actor;r.state=stage[0];
  }else if(action==='complete'&&r.state==='approved'&&(c.headquarters||manage(r.unit)))r.state='completed';else throw Error('Geçersiz görevlendirme geçişi.');
 }else if(r.kind==='enrollment'){
  if(r.state==='passed')throw Error('Tamamlanan eğitim değiştirilemez.');
  if(action==='lesson'){const index=Number(input.index);if(![0,1,2].includes(index))throw Error('Ders bulunamadı.');p.lessons=[...new Set([...p.lessons,index])];}
  else if(action==='exam'){if(p.lessons.length!==3)throw Error('Önce tüm dersleri tamamlayın.');if(!Array.isArray(input.answers)||input.answers.length!==3||input.answers.some(n=>![0,1,2].includes(n)))throw Error('Tüm soruları yanıtlayın.');p.score=Math.round(input.answers.reduce((n,a,i)=>n+(a===i?1:0),0)*100/3);p.attempts++;r.state=p.score>=70?'passed':'failed';if(r.state==='passed'){p.issued=c.today;p.validUntil=new Date(Date.parse(c.today)+365*86400000).toISOString().slice(0,10);}}
  else throw Error('Geçersiz eğitim işlemi.');
 }else if(r.kind==='lifecycle'){
  if(r.state==='completed')throw Error('Tamamlanan süreç değiştirilemez.');
  if(action==='check'){const i=Number(input.index);if(!CHECKLISTS[p.type][i])throw Error('Kontrol bulunamadı.');p.checks[i]=!p.checks[i];}
  else if(action==='complete'){if(p.checks.some(x=>!x))throw Error('Tüm kontroller tamamlanmalı.');if(p.date>c.today)throw Error('İşlem tarihi henüz gelmedi.');if(p.type==='offboarding'&&c.assets.some(a=>a.employeeId===r.employee_id&&a.status!=='completed'))throw Error('Aktif zimmetler iade edilmeli.');if(p.type==='offboarding'){if((c.requests||[]).some(q=>q.employeeId===r.employee_id&&q.status==='pending'))throw Error('Bekleyen talepler sonuçlandırılmalı.');if(c.employees.some(e=>e.managerId===r.employee_id&&e.status==='active')||c.hrApprover===r.employee_id)throw Error('Yönetici devri yapılmalı.');if(c.records.some(x=>x.kind==='assignment'&&x.employee_id===r.employee_id&&!['completed','rejected'].includes(x.state)))throw Error('Açık görevlendirme var.');}else if(r.unit!=='Genel Merkez'&&!c.records.some(x=>x.kind==='enrollment'&&x.employee_id===r.employee_id&&x.state==='passed'&&x.payload.validUntil>=c.today))throw Error('Geçerli eğitim sertifikası gerekir.');r.state='completed';}else throw Error('Geçersiz süreç işlemi.');
 }else if(r.kind==='integration'&&action==='dispatch'){if(r.state==='acknowledged')throw Error('Bu olay daha önce işlendi.');if(p.mode!=='synthetic-demo'||!['staffing_plan.created','payroll.inputs.prepared'].includes(p.event))throw Error('Demo sözleşmesi geçersiz.');p.attempts=(p.attempts||0)+1;p.realDelivery=false;p.receipt='DEMO-ACK-'+r.id;r.state='acknowledged';}
 else if(r.kind==='inspection'){
  if(action==='submit'&&['draft','revision'].includes(r.state)&&c.actor===r.created_by){if(!eligible(c.records,r.employee_id,p.skill,c.today)||!c.records.some(x=>x.kind==='calibration'&&x.unit===r.unit&&x.payload.skill===p.skill&&x.payload.validUntil>=c.today))throw Error('Sertifika ve kalibrasyon geçerli olmalı.');r.state='submitted';}
  else if(action==='approve'&&r.state==='submitted'&&c.headquarters&&c.actor!==r.created_by)r.state='published';
  else if(action==='revise'&&r.state==='published'&&c.headquarters){p.reason=text(input.reason,'Revizyon gerekçesi');r.state='revision';}
  else throw Error('Rapor durumu veya dört göz kuralı izin vermiyor.');
 }else throw Error('Bu işlem desteklenmiyor.');
 r.revision++;return r;
}
