import {records,aggregate,queryRows,branches,dateAt,dateLabel,filteredRecords} from './data.js';

export function dailyPerformance(days,branch='all') {
  const all=new Map();
  for(const r of records) if(branch==='all'||r.branch===branch) {
    if(!all.has(r.date))all.set(r.date,[]);
    all.get(r.date).push(r);
  }
  let cumulative=0,previousCumulative=0;
  return Array.from({length:days},(_,i)=>{
    const offset=1-days+i,date=dateAt(offset);
    const now=aggregate(all.get(date)||[]),prior=aggregate(all.get(dateAt(offset-days))||[]);
    const window=Array.from({length:7},(_,j)=>aggregate(all.get(dateAt(offset-j))||[]));
    cumulative+=now.clicks;previousCumulative+=prior.clicks;
    return {date,label:dateLabel(date),...now,previous:prior.clicks,previousImpressions:prior.impressions,cumulative,previousCumulative,average:window.reduce((s,r)=>s+r.clicks,0)/7,averageImpressions:window.reduce((s,r)=>s+r.impressions,0)/7};
  });
}
export function projectedSeries(daily,showProjection=false) {
  const rows=daily.map(r=>({...r,projection:null}));
  if(!showProjection||!rows.length)return rows;
  const last=rows.at(-1);last.projection=last.cumulative;
  for(let i=1;i<=7;i++) rows.push({date:dateAt(i),label:dateLabel(dateAt(i)),cumulative:null,previousCumulative:null,projection:last.cumulative+last.average*i,future:true});
  return rows;
}
export function rankDistribution(days,branch) {
  const bins=[{name:'İlk 3',min:0,max:3,color:'#6254dc'},{name:'4–10',min:3,max:10,color:'#0e9a91'},{name:'11–20',min:10,max:20,color:'#e4aa4b'},{name:'20 üzeri',min:20,max:Infinity,color:'#c2c8d8'}];
  const rows=queryRows(days,branch);
  return bins.map(bin=>({...bin,queries:rows.filter(r=>r.position>bin.min&&r.position<=bin.max).length,impressions:rows.filter(r=>r.position>bin.min&&r.position<=bin.max).reduce((s,r)=>s+r.impressions,0)}));
}
export function branchContribution(days,branch) {
  return branches.filter(b=>branch==='all'||b.id===branch).map(b=>{
    const now=aggregate(filteredRecords(days,b.id)),old=aggregate(filteredRecords(days,b.id,'all',true));
    return {name:b.name,id:b.id,current:now.clicks,previous:old.clicks,change:now.clicks-old.clicks};
  }).sort((a,b)=>b.change-a.change);
}
export function opportunities(days,branch,target=5,minimum=50) {
  return queryRows(days,branch).filter(r=>r.impressions>=minimum).map(r=>({...r,opportunity:r.position<=20?Math.max(0,Math.round(r.impressions*target/100-r.clicks)):0}));
}
export function calendarWeeks(daily) {
  if(!daily.length)return [];
  const offset=(new Date(daily[0].date+'T12:00:00Z').getUTCDay()+6)%7;
  const cells=[...Array(offset).fill(null),...daily];
  while(cells.length%7)cells.push(null);
  return Array.from({length:cells.length/7},(_,i)=>cells.slice(i*7,i*7+7));
}
