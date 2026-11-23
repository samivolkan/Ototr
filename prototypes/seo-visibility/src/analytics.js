import {branches,dateAt,filteredRecords,aggregate,groupRows,branchName} from './data.js';
export const schemas={
 gsc:{name:'Search Console',dims:{query:'Sorgu',page:'Sayfa',device:'Cihaz',branch:'Birim',date:'Gün'},metrics:{impressions:'Gösterim',clicks:'Tıklama',ctr:'CTR (%)',position:'Ort. konum'},defaults:['impressions','clicks','ctr','position'],note:'Organik arama verisi. CTR ve konum ağırlıklı hesaplanır; satır oranları toplanmaz.'},
 ga:{name:'Google Analytics 4',dims:{channel:'Kanal',device:'Cihaz',branch:'Birim',date:'Gün'},metrics:{sessions:'Oturum',engagedSessions:'Etkileşimli oturum',engagementRate:'Etkileşim oranı (%)',convertingSessions:'Anahtar etkinlikli oturum',conversionRate:'Anahtar etkinlik oranı (%)'},defaults:['sessions','engagedSessions','engagementRate','conversionRate'],note:'GA4 demo oturum verisi. Anahtar etkinlikli oturum, onaylı randevu değildir. Kanal kırılımını ayrıca kontrol edin.'},
 gbp:{name:'Google İşletme Profili',dims:{branch:'Şube',date:'Gün'},metrics:{mapsViews:'Harita görüntülenmesi',searchViews:'Arama görüntülenmesi',calls:'Arama düğmesi tıklaması',directions:'Yol tarifi isteği',webClicks:'Web sitesi tıklaması'},defaults:['mapsViews','searchViews','calls','directions','webClicks'],note:'Arama ve harita görüntülenmeleri ayrı metriklerdir. Arama düğmesine tıklama, gerçekleşmiş telefon görüşmesi anlamına gelmez.'}
};
const extra={ga:[],gbp:[]};
for(let d=-179;d<=0;d++) branches.forEach((b,i)=>{
 const wave=1+.23*Math.sin((d+i*4)/9);
 ['Organik arama','Doğrudan','Yönlendirme'].forEach((channel,c)=>['Mobil','Masaüstü'].forEach((device,m)=>{
  const sessions=Math.max(1,Math.round((16+i*5)*wave*[1,.52,.28][c]*(m?.35:.65)));
  const engagedSessions=Math.round(sessions*(.56+i*.035)),convertingSessions=Math.min(engagedSessions,Math.round(sessions*(.06+i*.013)));
  extra.ga.push({date:dateAt(d),branch:b.id,channel,device,sessions,engagedSessions,convertingSessions});
 }));
 if(b.id!=='brand') extra.gbp.push({date:dateAt(d),branch:b.id,mapsViews:Math.round((70+i*20)*wave),searchViews:Math.round((40+i*15)*wave),calls:Math.round((3+i)*wave),directions:Math.round((5+i*2)*wave),webClicks:Math.round((4+i)*wave)});
});
export function sourceRows(source,days,branch,previous=false){if(source==='gsc')return filteredRecords(days,branch,'all',previous);const from=dateAt(1-(previous?days*2:days)),to=dateAt(previous?-days:0);return (extra[source]||[]).filter(r=>r.date>=from&&r.date<=to&&(branch==='all'||branch===r.branch))}
export function summarize(source,rows){if(source==='gsc')return aggregate(rows);const result={};for(const key of Object.keys(schemas[source].metrics))result[key]=rows.reduce((sum,r)=>sum+(r[key]||0),0);if(source==='ga'){result.engagementRate=result.sessions?result.engagedSessions/result.sessions*100:null;result.conversionRate=result.sessions?result.convertingSessions/result.sessions*100:null}return result}
export function reportRows({source,dim,days,branch,brandFilter='all',device='all'}){
 const filter=rs=>rs.filter(r=>(device==='all'||r.device===device)&&(source!=='gsc'||brandFilter==='all'||(brandFilter==='brand'?r.group==='Marka':r.group!=='Marka')));
 const partition=rows=>{const map=new Map();rows.forEach(r=>{const key=r[dim];if(!map.has(key))map.set(key,[]);map.get(key).push(r)});return map};
 const now=filter(sourceRows(source,days,branch)),prior=partition(filter(sourceRows(source,days,branch,true)));
 return [...partition(now)].map(([key,rows])=>({key,name:dim==='branch'?branchName(key):key,...summarize(source,rows),previous:summarize(source,prior.get(dim==='date'?dateAt(Math.round((Date.parse(key+'T12:00:00Z')-Date.parse('2026-11-20T12:00:00Z'))/86400000)-days):key)||[])}));
}
export const isRatio = key=>['ctr','engagementRate','conversionRate'].includes(key);
export function storageState(parsed,base){
 if(!parsed||typeof parsed!=='object')return base;
 const ids=new Set(branches.map(b=>b.id));
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v));
 const text=v=>typeof v==='string';
 const cleanList=(key,valid)=>Array.isArray(parsed[key])?parsed[key].filter(valid).slice(0,500):base[key];
 return {...base,
  tasks:cleanList('tasks',t=>t&&text(t.id)&&text(t.title)&&t.title.trim()&&ids.has(t.branch)&&['Yüksek','Orta','Düşük'].includes(t.priority)&&text(t.owner)&&date(t.due)&&['Planlandı','Devam ediyor','Tamamlandı'].includes(t.status)&&text(t.note)),
  content:cleanList('content',c=>c&&text(c.id)&&text(c.title)&&c.title.trim()&&ids.has(c.branch)&&['Fikir','Taslak','İncelemede','Hazır'].includes(c.status)&&date(c.due)&&text(c.keyword)&&text(c.description)&&text(c.body)),
  checks:Array.isArray(parsed.checks)?[...new Set(parsed.checks.filter(x=>['source','channel'].includes(x)))]:[],
  history:cleanList('history',h=>h&&text(h.id)&&text(h.source)&&text(h.time)&&text(h.status)),
  sources:Object.fromEntries(Object.entries(base.sources).map(([k,v])=>[k,typeof parsed.sources?.[k]==='boolean'?parsed.sources[k]:v])),
  threshold:[50,100,250,500].includes(parsed.threshold)?parsed.threshold:base.threshold,
  reports:cleanList('reports',r=>r&&text(r.id)&&text(r.name)&&schemas[r.source]&&schemas[r.source].dims[r.dim]&&[7,28,90].includes(r.days)&&(r.branch==='all'||ids.has(r.branch))&&Array.isArray(r.metrics)&&r.metrics.length>0&&r.metrics.every(m=>m in schemas[r.source].metrics)&&['all','brand','nonbrand'].includes(r.brandFilter)&&['all','Mobil','Masaüstü'].includes(r.device)&&typeof r.compare==='boolean')
 };
}
