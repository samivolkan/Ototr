import {dateAt,branches} from './data.js';
export const campaigns=branches.map((b,i)=>({id:`c${i+1}`,name:i===0?'OTOTR · Marka araması':`${b.name} · Ekspertiz araması`,branch:b.id,dailyBudget:[350,450,400,500][i]}));
export const adsRecords=[];
for(let day=-179;day<=0;day++) campaigns.forEach((c,i)=>['Mobil','Masaüstü'].forEach((device,j)=>{
 const week=1+.22*Math.sin((day+i*3)/5)+.08*Math.cos(day/2);
 const impressions=Math.round((180+i*35)*week*(j?.35:.65));
 const clicks=Math.max(1,Math.round(impressions*(.055+i*.004)));
 const cost=Math.round(clicks*(11+i*2.2)*(1+.16*Math.sin((day+i)/8))*100)/100;
 const conversions=Math.max(0,Math.round(clicks*(.13+i*.025)+(Math.sin(day+i)>0.8?1:0)));
 adsRecords.push({date:dateAt(day),campaign:c.id,name:c.name,branch:c.branch,device,impressions,clicks,cost,conversions,conversionAction:'Randevu formu gönderimi',currency:'TRY'});
}));
export function filterAds({days=28,branch='all',campaign='all',device='all',previous=false}){
 const from=dateAt(1-(previous?days*2:days)),to=dateAt(previous?-days:0);
 return adsRecords.filter(r=>r.date>=from&&r.date<=to&&(branch==='all'||r.branch===branch)&&(campaign==='all'||r.campaign===campaign)&&(device==='all'||r.device===device));
}
export function adsSummary(rows){
 const sum=k=>rows.reduce((s,r)=>s+r[k],0),impressions=sum('impressions'),clicks=sum('clicks'),cost=sum('cost'),conversions=sum('conversions');
 return {impressions,clicks,cost,conversions,ctr:impressions?clicks/impressions*100:null,cpc:clicks?cost/clicks:null,cpa:conversions?cost/conversions:null,conversionRate:clicks?conversions/clicks*100:null};
}
export function adsGrouped(rows,key){const map=new Map();for(const r of rows){if(!map.has(r[key]))map.set(r[key],[]);map.get(r[key]).push(r)}return [...map].map(([value,rs])=>({key:value,name:key==='campaign'?rs[0].name:value,branch:rs[0].branch,...adsSummary(rs)}))}
