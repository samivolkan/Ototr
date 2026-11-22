export const realMetrics=['cost','clicks','impressions','conversions'];
export function summarizeReal(rows){const t=Object.fromEntries(realMetrics.map(k=>[k,rows.reduce((s,r)=>s+r[k],0)]));return {...t,ctr:t.impressions?t.clicks/t.impressions*100:null,cpc:t.clicks?t.cost/t.clicks:null,cpa:t.conversions?t.cost/t.conversions:null};}
export function groupReal(rows,key){const groups=new Map();for(const r of rows){const name=r[key];if(!groups.has(name))groups.set(name,[]);groups.get(name).push(r)}return [...groups].map(([name,items])=>({key:name,name,...summarizeReal(items)}));}
export function validateRealAds(d){
 if(d?.version!==1||d.source!=='Google Ads CSV'||d.currency!=='TRY'||d.timezone!=='Europe/Istanbul'||!Array.isArray(d.accounts)||!d.accounts.length||d.accounts.length>30)throw Error('Geçerli Google Ads yerel veri paketi gerekli.');
 const ids=new Set();const date=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 for(const a of d.accounts){if(!a.id||ids.has(a.id)||typeof a.name!=='string'||!date(a.start)||!date(a.end)||a.start>a.end)throw Error('Hesap kimliği veya rapor dönemi geçersiz.');ids.add(a.id);
 for(const k of ['campaigns','monthly','devices','conversions'])if(!Array.isArray(a[k])||a[k].length>10000)throw Error('Eksik veya fazla rapor satırı.');
 if(a.totals===null){if(a.campaigns.length||a.monthly.length||a.devices.length||a.conversions.length)throw Error('Toplamı olmayan hesap veri satırı içeremez.');continue;}
 const names=new Set(a.campaigns.map(r=>r.name));if(names.size!==a.campaigns.length||[...names].some(n=>typeof n!=='string'||!n))throw Error('Kampanya adları boş veya tekrarlı.');
 for(const list of [a.campaigns,a.monthly,a.devices]){for(const r of list){for(const k of realMetrics)if(!Number.isFinite(r[k])||r[k]<0)throw Error('Metrikler negatif olmayan sayılar olmalı.');if(r.campaign&&!names.has(r.campaign))throw Error('Tanımsız kampanya.');}const t=summarizeReal(list);for(const k of realMetrics)if(!Number.isFinite(a.totals[k])||Math.abs(t[k]-a.totals[k])>0.05)throw Error('Rapor toplamları eşleşmiyor: '+k);}
 for(const [list,key] of [[a.monthly,'month'],[a.devices,'device'],[a.conversions,'action']]){const seen=new Set();for(const r of list){if(!names.has(r.campaign)||typeof r[key]!=='string'||!r[key])throw Error('Eksik rapor boyutu.');const id=JSON.stringify([r.campaign,r[key]]);if(seen.has(id))throw Error('Tekrarlanan rapor satırı.');seen.add(id);if(key==='month'&&(!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month)||r.month<a.start.slice(0,7)||r.month>a.end.slice(0,7)))throw Error('Rapor dönemi dışında ay.');}}
 if(a.conversions.some(r=>!Number.isFinite(r.conversions)||r.conversions<0)||Math.abs(a.conversions.reduce((s,r)=>s+r.conversions,0)-a.totals.conversions)>0.05)throw Error('Dönüşüm işlemleri toplamı eşleşmiyor.');
 }return d;
}
