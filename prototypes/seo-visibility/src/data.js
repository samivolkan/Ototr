export const branches = [
  {id:'brand',name:'Marka sayfaları',city:'ototr.com',note:'Ana sayfa, paketler ve rehber içerikleri'},
  {id:'nilufer',name:'Nilüfer',city:'Bursa',note:'Yerel arama ve şube sayfası'},
  {id:'inegol',name:'İnegöl',city:'Bursa',note:'Yerel arama ve şube sayfası'},
  {id:'gebze',name:'Gebze',city:'Kocaeli',note:'Yerel arama ve şube sayfası'},
];
export const endDate = '2026-11-20';
const dayMs=86400000;
export const dateAt = offset => new Date(Date.parse(endDate+'T12:00:00Z')+offset*dayMs).toISOString().slice(0,10);
export const dateLabel = d => new Date(d+'T12:00:00Z').toLocaleDateString('tr-TR',{day:'numeric',month:'short',timeZone:'UTC'});
export const rangeLabel = days => `${dateLabel(dateAt(1-days))} – ${dateLabel(endDate)} 2026`;
export const nf = (n,d=0) => n==null||!Number.isFinite(Number(n))?'—':Number(n).toLocaleString('tr-TR',{minimumFractionDigits:d,maximumFractionDigits:d});
export const pct = n => n==null||!Number.isFinite(Number(n))?'—':`%${nf(n,1)}`;
export const delta = (value,old) => value==null||old==null||!Number.isFinite(value)||!Number.isFinite(old)||old===0 ? null : (value-old)/old*100;
export const uid = () => typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`demo-${Date.now()}-${Math.random().toString(36).slice(2,11)}`;
export const opportunity = (row,targetCtr) => Math.max(0,Math.round(row.impressions*targetCtr/100-row.clicks));
export const eligibleOpportunity = (row,targetCtr,threshold) => row.impressions>=threshold&&row.ctr<targetCtr&&row.position!=null&&row.position>0&&row.position<=20;
const specs=[
 ['ototr','brand','Marka','/','OTOTR Oto Ekspertiz',35,3.2,.12],
 ['oto ekspertiz fiyatları','brand','Ticari','/paketler','Ekspertiz paketleri ve fiyatları',26,14.4,.025],
 ['ekspertizde nelere bakılır','brand','Bilgi','/blog/ekspertizde-nelere-bakilir','Ekspertizde nelere bakılır?',18,9.6,.033],
 ['ikinci el araç kontrolü','brand','Bilgi','/blog/arac-kontrolu','İkinci el araç kontrol rehberi',12,22.1,.012],
 ['ototr nilüfer','nilufer','Marka','/subeler/nilufer','Nilüfer Oto Ekspertiz',18,3.7,.11],
 ['nilüfer oto ekspertiz','nilufer','Yerel','/subeler/nilufer','Nilüfer Oto Ekspertiz',29,7.1,.028],
 ['bursa ekspertiz fiyatları','nilufer','Ticari','/subeler/nilufer/paketler','Nilüfer ekspertiz paketleri',16,11.8,.032],
 ['küçük sanayi ekspertiz','nilufer','Yerel','/subeler/nilufer','Nilüfer Oto Ekspertiz',14,5.4,.042],
 ['ototr inegöl','inegol','Marka','/subeler/inegol','İnegöl Oto Ekspertiz',21,2.1,.12],
 ['inegöl oto ekspertiz','inegol','Yerel','/subeler/inegol','İnegöl Oto Ekspertiz',38,4.3,.035],
 ['inegöl ekspertiz fiyatları','inegol','Ticari','/subeler/inegol/paketler','İnegöl ekspertiz paketleri',20,8.1,.027],
 ['gebze oto ekspertiz','gebze','Yerel','/subeler/gebze','Gebze Oto Ekspertiz',30,15.1,.023],
 ['ototr gebze','gebze','Marka','/subeler/gebze','Gebze Oto Ekspertiz',16,4.3,.1],
 ['gebze ekspertiz paketleri','gebze','Ticari','/subeler/gebze/paketler','Gebze ekspertiz paketleri',15,12.8,.026],
 ['boya değişen nasıl anlaşılır','brand','Bilgi','/blog/boya-degisen','Boya ve değişen parça rehberi',17,18.5,.017],
 ['oto ekspertiz garanti','brand','Ticari','/garanti','OTOTR ekspertiz güvencesi',10,17.3,.027],
];
// Entirely synthetic daily records. All displayed analytics derive from these records.
export const records=[];
for(let day=-179;day<=0;day++) specs.forEach((s,i)=>['Mobil','Masaüstü'].forEach((device,j)=>{
 const [query,branch,group,page,title,base,position,ctr]=s;
 const wave=1+.22*Math.sin((day+i*3)/8)+.12*Math.cos((day+i)/3);
 const growth=branch==='inegol'?1+(day+179)/240:branch==='nilufer'?1-(day+179)/700:1+(day+179)/850;
 const impressions=Math.max(1,Math.round(base*wave*growth*(j===0?.7:.3)));
 const clickRate=ctr*(1+.25*Math.sin((day+i)/13));
 const clicks=Math.max(0,Math.round(impressions*clickRate));
 const pos=Math.max(1,position+Math.sin((day+i)/11)*1.4+(branch==='inegol'?-day/110:0));
 records.push({date:dateAt(day),query,branch,group,page,title,device,impressions,clicks,position:pos});
}));
export function filteredRecords(days=28,branch='all',device='all',previous=false){
 const start=dateAt(1-(previous?days*2:days)),end=dateAt(previous?-days:0);
 return records.filter(r=>r.date>=start&&r.date<=end&&(branch==='all'||r.branch===branch)&&(device==='all'||r.device===device));
}
export function aggregate(rows){
 const impressions=rows.reduce((a,r)=>a+r.impressions,0),clicks=rows.reduce((a,r)=>a+r.clicks,0);
 return {impressions,clicks,ctr:impressions?clicks/impressions*100:null,position:impressions?rows.reduce((a,r)=>a+r.position*r.impressions,0)/impressions:null};
}
export function groupRows(rows,key){
 const groups=new Map(); rows.forEach(r=>{if(!groups.has(r[key]))groups.set(r[key],[]);groups.get(r[key]).push(r)});
 return [...groups.entries()].map(([name,items])=>{const unique=field=>[...new Set(items.map(r=>r[field]))];const pages=unique('page'),branchIds=unique('branch');const one=field=>unique(field).length===1?items[0][field]:'Karışık';return {...aggregate(items),name,key:name,[key]:name,pages,branchIds,page:pages.length===1?pages[0]:'Birden çok sayfa',branch:branchIds.length===1?branchIds[0]:'mixed',title:one('title'),group:one('group'),device:one('device'),date:one('date')};});
}
export function trendData(days,branch,metric='impressions'){
 const now=filteredRecords(days,branch),before=filteredRecords(days,branch,'all',true);
 const current=new Map(groupRows(now,'date').map(r=>[r.date,r]));const prior=new Map(groupRows(before,'date').map(r=>[r.date,r]));
 return Array.from({length:days},(_,i)=>({date:dateLabel(dateAt(1-days+i)),current:current.get(dateAt(1-days+i))?.[metric]??null,previous:prior.get(dateAt(1-days*2+i))?.[metric]??null}));
}
export function queryRows(days,branch,device='all',key='query'){
 const old=new Map(groupRows(filteredRecords(days,branch,device,true),key).map(r=>[r.name,r]));
 return groupRows(filteredRecords(days,branch,device),key).map(r=>({...r,previous:old.get(r.name)||{impressions:0,clicks:0,ctr:null,position:null}}));
}
export const seedTasks=[
 {id:'t1',title:'Nilüfer organik oturum ölçümünü doğrula',branch:'nilufer',priority:'Yüksek',owner:'Analitik ekibi',due:'2026-11-24',status:'Planlandı',note:'GSC tıklamaları ile GA4 organik girişlerini aynı dönem ve sayfa kapsamında karşılaştır.',source:'measurement'},
 {id:'t2',title:'İnegöl sayfa başlığı için alternatif hazırla',branch:'inegol',priority:'Orta',owner:'İçerik ekibi',due:'2026-11-26',status:'Devam ediyor',note:'Yerel niyeti açıklayan başlık ve açıklama taslağı hazırla. Sonucu aynı uzunlukta iki dönemle izle.',source:'title-inegol'},
 {id:'t3',title:'Gebze kırık iç bağlantısını incele',branch:'gebze',priority:'Yüksek',owner:'Yazılım ekibi',due:'2026-11-23',status:'Planlandı',note:'Örnek taramada paket sayfasında 404 bağlantısı var.',source:'tech-1'},
 {id:'t4',title:'Paketler sayfası açıklamasını gözden geçir',branch:'brand',priority:'Düşük',owner:'İçerik ekibi',due:'2026-11-21',status:'Tamamlandı',note:'Örnek tamamlanmış görev; canlı sayfaya değişiklik yapılmadı.',source:'seed-complete'},
];
export const seedContent=[
 {id:'c1',title:'Nilüfer’de oto ekspertiz: kontrol rehberi',branch:'nilufer',keyword:'nilüfer oto ekspertiz',status:'Fikir',due:'2026-11-25',description:'Araç alımından önce Nilüfer’de ekspertiz sürecini, kontrol noktalarını ve randevu hazırlığını keşfedin.',body:'Amaç: yerel araştırma niyetine cevap vermek.\n\nH2: Ekspertiz öncesi hazırlık\nH2: Hangi kontroller yapılır?\nH2: Randevu ve rapor süreci\n\nŞube iletişim bilgileri yayın öncesinde doğrulanmalıdır.'},
 {id:'c2',title:'Ekspertiz paketleri nasıl karşılaştırılır?',branch:'brand',keyword:'oto ekspertiz fiyatları',status:'Taslak',due:'2026-11-27',description:'Ekspertiz paketi seçerken kapsam, rapor içeriği ve ihtiyaçlarınıza göre dikkat etmeniz gereken noktalar.',body:'Bir paketi yalnız fiyatına göre değerlendirmeyin. Kontrol kapsamını ve raporun açıklamalarını inceleyin.\n\nBu metin örnek taslaktır; hizmet kapsamı editör tarafından doğrulanmalıdır.'},
 {id:'c3',title:'İnegöl araç alım rehberi',branch:'inegol',keyword:'inegöl oto ekspertiz',status:'İncelemede',due:'2026-11-28',description:'İnegöl’de ikinci el araç alırken kontrol listesi ve ekspertiz hazırlığı.',body:'Örnek içerik inceleme süreci. Teknik iddialar ve şube bilgileri kontrol edilmelidir.'},
 {id:'c4',title:'Gebze ekspertiz randevusu öncesi',branch:'gebze',keyword:'gebze oto ekspertiz',status:'Hazır',due:'2026-11-29',description:'Ekspertiz randevusuna gelirken bilmeniz gerekenler ve hazırlık adımları.',body:'Demo olarak hazır kabul edilen taslak. Hazır durumu yayınlandığı anlamına gelmez.'},
];
export const technicalIssues=[
 {id:1,branch:'gebze',type:'Bağlantılar',severity:'Yüksek',title:'Paket sayfasında kırık iç bağlantı',url:'/subeler/gebze/paketler',detail:'Örnek hedef: /paketler/eski-paket → HTTP 404. Geçerli bir paket sayfasına yönlendirilecek bağlantıyı editörle doğrulayın.',impact:'Tarama yolu ve kullanıcı deneyimi'},
 {id:2,branch:'brand',type:'Meta veriler',severity:'Orta',title:'İki rehberde aynı meta açıklaması',url:'/blog/boya-degisen',detail:'Açıklama, her sayfanın kendine özgü içeriğini yansıtmalı. Başlık ve açıklama değişikliği sıralama garantisi değildir.',impact:'Arama sonucu açıklamasının netliği'},
 {id:3,branch:'nilufer',type:'Performans',severity:'Yüksek',title:'Mobil LCP için iyileştirme fırsatı',url:'/subeler/nilufer',detail:'Demo laboratuvar ölçümü: LCP 3,4 sn. İlk görselin boyutunu, yükleme önceliğini ve sunucu yanıtını inceleyin. Gerçek kullanıcı ölçümü bağlı değil.',impact:'Mobil açılış deneyimi'},
 {id:4,branch:'inegol',type:'İndeksleme',severity:'Orta',title:'Canonical hedefini doğrula',url:'/subeler/inegol/paketler',detail:'Örnek taramada canonical başka bir paket URL’sini gösteriyor. İndeks hedefini içerik sahibiyle doğrulayın.',impact:'Tercih edilen URL’nin tutarlılığı'},
 {id:5,branch:'brand',type:'Yapısal veri',severity:'Düşük',title:'Organizasyon bilgilerini kontrol et',url:'/',detail:'Örnek Organization kaydındaki logo ve iletişim URL’lerini doğrulayın. Yapısal veri zengin sonuç garantisi sağlamaz.',impact:'Makine tarafından anlaşılabilir bilgi'},
];
export const branchName=id=>id==='mixed'?'Birden çok birim':branches.find(b=>b.id===id)?.name||'Tüm birimler';
export function csvText(headers,rows){
 const cell=x=>'"'+(typeof x==='number'?String(x):String(x??'').replace(/^[\s\u0000-\u001f]*[=+\-@]/,"'$&")).replaceAll('"','""')+'"';
 return '\uFEFF'+[headers,...rows].map(r=>r.map(cell).join(';')).join('\r\n');
}
export const escapeHtml = x => String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

