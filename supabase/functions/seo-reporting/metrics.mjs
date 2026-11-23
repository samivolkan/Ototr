export const metrics={CALL_CLICKS:'calls',BUSINESS_DIRECTION_REQUESTS:'directions',WEBSITE_CLICKS:'website'};
export function parseMetrics(body,start,end){
 const days=new Map(),seen=new Set(),pairs=new Set();
 for(const group of body.multiDailyMetricTimeSeries||[])for(const series of group.dailyMetricTimeSeries||[]){
  const field=metrics[series.dailyMetric];if(!field||series.dailySubEntityType)continue;
  for(const x of series.timeSeries?.datedValues||[]){
   const d=x.date||{},name=`${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;
   const date=new Date(name+'T00:00:00Z');
   if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==name||name<start||name>end)throw Error('GBP_INVALID_DATE');
   const value=Number(x.value??0);if(!Number.isSafeInteger(value)||value<0)throw Error('GBP_INVALID_METRIC');
   const pair=name+field;if(pairs.has(pair))throw Error('GBP_DUPLICATE_METRIC');pairs.add(pair);seen.add(field);
   const row=days.get(name)||{name,calls:null,directions:null,website:null};row[field]=value;days.set(name,row);
  }
 }
 if(!days.size)throw Error('GBP_NO_DATA');
 if(seen.size!==3)throw Error('GBP_INCOMPLETE_METRICS');
 const daily=[...days.values()].sort((a,b)=>a.name.localeCompare(b.name));
 if(daily.some(r=>Object.values(metrics).some(k=>r[k]===null)))throw Error('GBP_INCOMPLETE_METRICS');
 const monthly={};for(const r of daily){const name=r.name.slice(0,7);monthly[name]??={name,calls:0,directions:0,website:0};for(const k of Object.values(metrics))monthly[name][k]+=r[k];}
 return {daily,monthly:Object.values(monthly)};
}
export function assess(daily,end){
 const findings=[],window=[];const endMs=Date.parse(end+'T00:00:00Z');
 for(let i=55;i>=0;i--)window.push(new Date(endMs-i*86400000).toISOString().slice(0,10));
 const byDate=new Map(daily.map(r=>[r.name,r]));
 if(window.some(d=>!byDate.has(d)))return [{id:'coverage',priority:'Kontrol',title:'56 günlük kapsam eksik',evidence:'Eksik günler sıfır kabul edilmedi; dönem karşılaştırması üretilmedi.',owner:'Veri sorumlusu'}];
 for(const [key,label] of [['calls','Telefon tıklaması'],['directions','Yol tarifi'],['website','Web sitesi tıklaması']]){
  const previous=window.slice(0,28).reduce((n,d)=>n+byDate.get(d)[key],0),current=window.slice(28).reduce((n,d)=>n+byDate.get(d)[key],0);
  if(previous>=20&&current<=previous*.7)findings.push({id:'drop-'+key,priority:'Yüksek',title:label+' düşüşü',evidence:`Son 28 gün: ${current}; önceki 28 gün: ${previous}. Düşüş en az %30. Nedensellik veya satış kaybı kanıtı değildir.`,owner:'SEO sorumlusu'});
 }
 return findings;
}
